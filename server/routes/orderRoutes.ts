import { Router, Request, Response } from 'express';
import { getOrders, saveOrders, getUsers, saveUsers, getCourses, getCarts, saveCarts, getNotifications, saveNotifications } from '../fileStore.js';
import { requireStudent, requireAdmin } from '../auth.js';
import { Order, OrderItemSummary, NotificationItem } from '../types.js';
import { sseManager } from '../sse.js';

export const orderRouter = Router();

// Helper to generate unique order ID: KH-YYYYMMDD-XXXXX
function generateOrderId(): string {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `KH-${dateStr}-${rand}`;
}

// POST /api/orders
// Create order from checkout
orderRouter.post('/', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const { courseIds, transactionId, paymentProofUrl } = req.body;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      res.status(400).json({ error: 'At least one course is required to place an order.' });
      return;
    }

    if (!transactionId || String(transactionId).trim().length === 0) {
      res.status(400).json({ error: 'EasyPaisa transaction / reference ID is required.' });
      return;
    }

    // Get user details from users.json
    const users = await getUsers();
    const user = users.find((u) => u.clerkUserId === clerkUserId);
    const studentName = user?.name || 'Student';
    const studentEmail = user?.email || 'student@example.com';

    // Calculate total and summaries from server-side courses.json
    const allCourses = await getCourses();
    const coursesSummary: OrderItemSummary[] = [];
    let totalAmount = 0;

    for (const cId of courseIds) {
      const c = allCourses.find((course) => course.id === cId);
      if (c) {
        coursesSummary.push({
          id: c.id,
          title: c.title,
          price: c.price,
          class: c.class,
        });
        totalAmount += c.price;
      }
    }

    if (coursesSummary.length === 0) {
      res.status(400).json({ error: 'Selected courses were not found in catalog.' });
      return;
    }

    const newOrder: Order = {
      id: generateOrderId(),
      clerkUserId,
      studentName,
      studentEmail,
      courseIds: coursesSummary.map((c) => c.id),
      coursesSummary,
      totalAmount,
      paymentMethod: 'EasyPaisa',
      transactionId: String(transactionId).trim(),
      paymentProofUrl: paymentProofUrl ? String(paymentProofUrl).trim() : '',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orders = await getOrders();
    orders.unshift(newOrder);
    await saveOrders(orders);

    // Clear user's cart on order submission
    const carts = await getCarts();
    if (carts[clerkUserId]) {
      carts[clerkUserId].items = [];
      await saveCarts(carts);
    }

    // Create student confirmation notification
    const notifications = await getNotifications();
    notifications.unshift({
      id: `notif_${Date.now()}`,
      clerkUserId,
      title: 'Order Placed (Verification Pending)',
      message: `Your order ${newOrder.id} of Rs. ${totalAmount} is under admin review. You will receive immediate access once verified.`,
      type: 'general',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    await saveNotifications(notifications);

    sseManager.broadcast('NEW_ORDER', newOrder);
    res.status(201).json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
});

// GET /api/orders/my (Student view)
orderRouter.get('/my', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const orders = await getOrders();
    const myOrders = orders.filter((o) => o.clerkUserId === clerkUserId);
    res.json(myOrders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch student orders', details: err.message });
  }
});

// GET /api/orders (Admin view)
orderRouter.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// POST /api/orders/:id/verify (Admin Only)
orderRouter.post('/:id/verify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const orders = await getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orders[orderIndex];
    order.status = 'VERIFIED';
    order.updatedAt = new Date().toISOString();
    order.adminNotes = req.body.adminNotes || 'Payment verified by administrator.';
    orders[orderIndex] = order;
    await saveOrders(orders);

    // Attach purchased course IDs to the student's profile in users.json
    const users = await getUsers();
    let user = users.find((u) => u.clerkUserId === order.clerkUserId);
    if (!user) {
      user = {
        clerkUserId: order.clerkUserId,
        name: order.studentName,
        email: order.studentEmail,
        avatarUrl: '',
        purchasedCourseIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    }

    // Add unique courses
    for (const cId of order.courseIds) {
      if (!user.purchasedCourseIds.includes(cId)) {
        user.purchasedCourseIds.push(cId);
      }
    }
    user.updatedAt = new Date().toISOString();
    await saveUsers(users);

    // Create notification for student
    const notifications = await getNotifications();
    notifications.unshift({
      id: `notif_${Date.now()}`,
      clerkUserId: order.clerkUserId,
      title: 'Order Verified! Notes Unlocked',
      message: `Your payment for order ${order.id} has been verified. You can now access your notes in "My Library".`,
      type: 'order_verified',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    await saveNotifications(notifications);

    // Broadcast SSE to all clients
    sseManager.broadcast('ORDER_VERIFIED', {
      orderId: order.id,
      clerkUserId: order.clerkUserId,
      courseIds: order.courseIds,
    });

    res.json({ success: true, message: 'Order verified and notes unlocked successfully', order });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify order', details: err.message });
  }
});

// POST /api/orders/:id/reject (Admin Only)
orderRouter.post('/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const orders = await getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);

    if (orderIndex === -1) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = orders[orderIndex];
    order.status = 'REJECTED';
    order.updatedAt = new Date().toISOString();
    order.adminNotes = req.body.reason || 'Transaction could not be verified.';
    orders[orderIndex] = order;
    await saveOrders(orders);

    // Create notification for student
    const notifications = await getNotifications();
    notifications.unshift({
      id: `notif_${Date.now()}`,
      clerkUserId: order.clerkUserId,
      title: 'Order Verification Issue',
      message: `Order ${order.id} could not be verified. Reason: ${order.adminNotes}. Please contact WhatsApp support.`,
      type: 'order_rejected',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    await saveNotifications(notifications);

    sseManager.broadcast('ORDER_REJECTED', {
      orderId: order.id,
      clerkUserId: order.clerkUserId,
    });

    res.json({ success: true, message: 'Order marked as rejected', order });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reject order', details: err.message });
  }
});
