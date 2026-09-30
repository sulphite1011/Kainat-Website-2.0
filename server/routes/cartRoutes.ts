import { Router, Request, Response } from 'express';
import { getCarts, saveCarts, getCourses } from '../fileStore.js';
import { requireStudent, getStudentClerkId } from '../auth.js';

export const cartRouter = Router();

// GET /api/cart
// If student is authenticated, returns their server-stored cart.
// If unauthenticated guest, returns empty cart without throwing 401.
cartRouter.get('/', async (req: Request, res: Response) => {
  try {
    const clerkUserId = await getStudentClerkId(req);
    if (!clerkUserId) {
      res.json({
        clerkUserId: '',
        items: [],
        totalAmount: 0,
        totalItems: 0,
      });
      return;
    }

    const carts = await getCarts();
    const userCart = carts[clerkUserId] || { items: [] };

    // Fetch full course details for items in cart
    const courses = await getCourses();
    const cartDetails = userCart.items
      .map((item) => {
        const course = courses.find((c) => c.id === item.courseId);
        if (!course) return null;
        return {
          courseId: course.id,
          title: course.title,
          class: course.class,
          subject: course.subject,
          price: course.price,
          coverImageUrl: course.coverImageUrl,
          addedAt: item.addedAt,
        };
      })
      .filter(Boolean);

    const totalAmount = cartDetails.reduce((sum, item: any) => sum + (item?.price || 0), 0);

    res.json({
      clerkUserId,
      items: cartDetails,
      totalAmount,
      totalItems: cartDetails.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve cart', details: err.message });
  }
});

// POST /api/cart/items
cartRouter.post('/items', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const { courseId } = req.body;
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    const courses = await getCourses();
    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const carts = await getCarts();
    if (!carts[clerkUserId]) {
      carts[clerkUserId] = { items: [] };
    }

    // Check if item already in cart
    const exists = carts[clerkUserId].items.some((i) => i.courseId === courseId);
    if (!exists) {
      carts[clerkUserId].items.push({
        courseId,
        addedAt: new Date().toISOString(),
      });
      await saveCarts(carts);
    }

    res.json({ success: true, message: 'Item added to cart' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add item to cart', details: err.message });
  }
});

// DELETE /api/cart/items/:courseId
cartRouter.delete('/items/:courseId', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const { courseId } = req.params;

    const carts = await getCarts();
    if (carts[clerkUserId]) {
      carts[clerkUserId].items = carts[clerkUserId].items.filter((i) => i.courseId !== courseId);
      await saveCarts(carts);
    }

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to remove item from cart', details: err.message });
  }
});

// POST /api/cart/clear
cartRouter.post('/clear', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const carts = await getCarts();
    if (carts[clerkUserId]) {
      carts[clerkUserId].items = [];
      await saveCarts(carts);
    }

    res.json({ success: true, message: 'Cart cleared' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear cart', details: err.message });
  }
});
