import { Router, Request, Response } from 'express';
import { getUsers, saveUsers, getCourses, getOrders, getNotifications, saveNotifications } from '../fileStore.js';
import { requireStudent, requireAdmin, getStudentClerkId } from '../auth.js';
import { UserProfile, AdminStats } from '../types.js';

export const studentRouter = Router();

// POST /api/auth/sync
// Synchronizes Clerk user profile with server-side users.json
studentRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const { clerkUserId, name, email, avatarUrl } = req.body;

    if (!clerkUserId || typeof clerkUserId !== 'string') {
      res.status(400).json({ error: 'Valid clerkUserId is required' });
      return;
    }

    const users = await getUsers();
    let user = users.find((u) => u.clerkUserId === clerkUserId);

    if (user) {
      // Update existing record
      user.name = name || user.name;
      user.email = email || user.email;
      user.avatarUrl = avatarUrl || user.avatarUrl;
      user.updatedAt = new Date().toISOString();
    } else {
      // Register new user record
      user = {
        clerkUserId,
        name: name || 'Student',
        email: email || '',
        avatarUrl: avatarUrl || '',
        purchasedCourseIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      users.push(user);
    }

    await saveUsers(users);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to synchronize user', details: err.message });
  }
});

// GET /api/library
// Retrieves purchased courses for authenticated student
studentRouter.get('/library', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const users = await getUsers();
    const user = users.find((u) => u.clerkUserId === clerkUserId);

    if (!user || user.purchasedCourseIds.length === 0) {
      res.json({
        clerkUserId,
        studentName: user?.name || 'Student',
        courses: [],
      });
      return;
    }

    const allCourses = await getCourses();
    const purchasedCourses = user.purchasedCourseIds
      .map((id) => allCourses.find((c) => c.id === id))
      .filter(Boolean)
      .map((c: any) => {
        // We do not leak full raw PDF URL here, reader endpoint will supply it securely
        const { fullPdfUrl, ...safeCourse } = c;
        return {
          ...safeCourse,
          hasPurchased: true,
        };
      });

    res.json({
      clerkUserId,
      studentName: user.name,
      courses: purchasedCourses,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch library', details: err.message });
  }
});

// GET /api/notifications
studentRouter.get('/notifications', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const notifications = await getNotifications();
    const userNotifications = notifications.filter((n) => n.clerkUserId === clerkUserId);
    res.json(userNotifications);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// POST /api/notifications/:id/read
studentRouter.post('/notifications/:id/read', requireStudent, async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).clerkUserId;
    const notifications = await getNotifications();
    const notif = notifications.find((n) => n.id === req.params.id && n.clerkUserId === clerkUserId);
    if (notif) {
      notif.isRead = true;
      await saveNotifications(notifications);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark notification as read', details: err.message });
  }
});

// GET /api/students (Admin Only)
studentRouter.get('/students', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await getUsers();
    const orders = await getOrders();

    const studentList = users.map((u) => {
      const studentOrders = orders.filter((o) => o.clerkUserId === u.clerkUserId);
      const verifiedCount = studentOrders.filter((o) => o.status === 'VERIFIED').length;
      const pendingCount = studentOrders.filter((o) => o.status === 'PENDING').length;
      return {
        ...u,
        totalOrders: studentOrders.length,
        verifiedOrders: verifiedCount,
        pendingOrders: pendingCount,
        purchasedCoursesCount: u.purchasedCourseIds.length,
      };
    });

    res.json(studentList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve students', details: err.message });
  }
});

// GET /api/admin/stats (Admin Only)
studentRouter.get('/admin/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await getUsers();
    const courses = await getCourses();
    const orders = await getOrders();

    const verifiedOrders = orders.filter((o) => o.status === 'VERIFIED');
    const pendingOrders = orders.filter((o) => o.status === 'PENDING');

    const verifiedRevenue = verifiedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingPayments = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const verifiedStudents = users.filter((u) => u.purchasedCourseIds && u.purchasedCourseIds.length > 0).length;

    const stats: AdminStats = {
      verifiedRevenue,
      pendingPayments,
      verifiedStudents,
      totalStudents: users.length,
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.isPublished).length,
      totalOrders: orders.length,
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute admin statistics', details: err.message });
  }
});
