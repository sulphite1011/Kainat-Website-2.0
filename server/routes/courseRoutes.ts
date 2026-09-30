import { Router, Request, Response } from 'express';
import { getCourses, saveCourses, getUsers, getOrders } from '../fileStore.js';
import { requireAdmin, getStudentClerkId } from '../auth.js';
import { Course } from '../types.js';
import { sseManager } from '../sse.js';

export const courseRouter = Router();

// GET /api/courses
// Returns published courses for regular students/guests; or all courses if admin token is present
courseRouter.get('/', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader?.startsWith('Bearer adm_');
    const courses = await getCourses();

    // Check if requester has purchased any courses
    const clerkUserId = await getStudentClerkId(req);
    let purchasedCourseIds = new Set<string>();
    if (clerkUserId) {
      const users = await getUsers();
      const user = users.find((u) => u.clerkUserId === clerkUserId);
      if (user && Array.isArray(user.purchasedCourseIds)) {
        purchasedCourseIds = new Set(user.purchasedCourseIds);
      }
    }

    // Mask the fullPdfUrl from the catalog list so it is never leaked
    const sanitized = courses
      .filter((c) => (isAdmin ? true : c.isPublished))
      .map((c) => {
        // Omit fullPdfUrl from public catalog listings
        const { fullPdfUrl, ...safeCourse } = c;
        return {
          ...safeCourse,
          hasFullPdf: Boolean(fullPdfUrl && fullPdfUrl.trim().length > 0),
          hasPurchased: purchasedCourseIds.has(c.id),
        };
      });

    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve courses', details: err.message });
  }
});

// GET /api/courses/:id
courseRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const courses = await getCourses();
    const course = courses.find((c) => c.id === req.params.id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const authHeader = req.headers.authorization;
    const isAdmin = authHeader?.startsWith('Bearer adm_');

    if (!isAdmin && !course.isPublished) {
      res.status(404).json({ error: 'Course not available' });
      return;
    }

    // Check if requester has purchased access
    const clerkUserId = await getStudentClerkId(req);
    let hasAccess = Boolean(isAdmin);

    if (clerkUserId) {
      const users = await getUsers();
      const user = users.find((u) => u.clerkUserId === clerkUserId);
      if (user && user.purchasedCourseIds.includes(course.id)) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      // Unpaid or guest: omit fullPdfUrl
      const { fullPdfUrl, ...safeCourse } = course;
      res.json({
        ...safeCourse,
        hasPurchased: false,
        hasFullPdf: Boolean(fullPdfUrl && fullPdfUrl.trim().length > 0),
      });
      return;
    }

    res.json({
      ...course,
      hasPurchased: true,
      hasFullPdf: Boolean(course.fullPdfUrl && course.fullPdfUrl.trim().length > 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve course details', details: err.message });
  }
});

// GET /api/courses/:id/document
// Protected paid document reader endpoint
courseRouter.get('/:id/document', async (req: Request, res: Response) => {
  try {
    const clerkUserId = await getStudentClerkId(req);
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader?.startsWith('Bearer adm_');

    if (!clerkUserId && !isAdmin) {
      res.status(401).json({ error: 'Authentication required to access course notes.' });
      return;
    }

    const courses = await getCourses();
    const course = courses.find((c) => c.id === req.params.id);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    // Check access
    let isAuthorized = Boolean(isAdmin);
    let studentName = 'Admin';
    let studentEmail = 'admin@kainatnoteshub.com';
    let licenseId = 'ADM-FULL-ACCESS';
    let orderId = 'ADMIN-PREVIEW';

    if (clerkUserId) {
      const users = await getUsers();
      const user = users.find((u) => u.clerkUserId === clerkUserId);
      if (user && user.purchasedCourseIds.includes(course.id)) {
        isAuthorized = true;
        studentName = user.name;
        studentEmail = user.email;
        licenseId = `LIC-${user.clerkUserId.slice(-8).toUpperCase()}`;

        // Find corresponding verified order
        const orders = await getOrders();
        const verifiedOrder = orders.find(
          (o) => o.clerkUserId === clerkUserId && o.status === 'VERIFIED' && o.courseIds.includes(course.id)
        );
        if (verifiedOrder) {
          orderId = verifiedOrder.id;
        }
      }
    }

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Access Denied. You have not purchased this course yet, or your payment is pending verification.',
      });
      return;
    }

    // Return the authorized document info with watermarking metadata
    res.json({
      success: true,
      courseId: course.id,
      title: course.title,
      class: course.class,
      subject: course.subject,
      fullPdfUrl: course.fullPdfUrl,
      samplePdfUrl: course.samplePdfUrl,
      watermark: {
        brand: 'KAINAT NOTES HUB',
        studentName,
        studentEmail,
        orderId,
        licenseId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to deliver protected document', details: err.message });
  }
});

// POST /api/courses (Admin Only)
courseRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title,
      class: courseClass,
      subject,
      semesterOrYear,
      unitNumber,
      unitName,
      chapterNumber,
      chapterName,
      topicName,
      description,
      price,
      coverImageUrl,
      samplePdfUrl,
      fullPdfUrl,
      pageCount,
      isPublished,
    } = req.body;

    if (!title || !courseClass || !subject || price === undefined) {
      res.status(400).json({ error: 'Title, Class, Subject, and Price are required fields.' });
      return;
    }

    const courses = await getCourses();
    const newCourse: Course = {
      id: `crs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: String(title).trim(),
      class: String(courseClass).trim(),
      subject: String(subject).trim(),
      semesterOrYear: semesterOrYear ? String(semesterOrYear).trim() : undefined,
      unitNumber: unitNumber ? String(unitNumber).trim() : undefined,
      unitName: unitName ? String(unitName).trim() : undefined,
      chapterNumber: chapterNumber ? String(chapterNumber).trim() : undefined,
      chapterName: chapterName ? String(chapterName).trim() : undefined,
      topicName: topicName ? String(topicName).trim() : undefined,
      description: description ? String(description).trim() : '',
      price: Math.max(0, Number(price) || 0),
      coverImageUrl: coverImageUrl ? String(coverImageUrl).trim() : '',
      samplePdfUrl: samplePdfUrl ? String(samplePdfUrl).trim() : '',
      fullPdfUrl: fullPdfUrl ? String(fullPdfUrl).trim() : '',
      pageCount: pageCount ? Number(pageCount) : undefined,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    courses.unshift(newCourse);
    await saveCourses(courses);

    sseManager.broadcast('COURSE_CREATED', newCourse);
    res.status(201).json({ success: true, course: newCourse });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create course', details: err.message });
  }
});

// PUT /api/courses/:id (Admin Only)
courseRouter.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const courses = await getCourses();
    const index = courses.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    const existing = courses[index];
    const updated: Course = {
      ...existing,
      ...req.body,
      id: existing.id, // prevent changing id
      price: req.body.price !== undefined ? Math.max(0, Number(req.body.price)) : existing.price,
      updatedAt: new Date().toISOString(),
    };

    courses[index] = updated;
    await saveCourses(courses);

    sseManager.broadcast('COURSE_UPDATED', updated);
    res.json({ success: true, course: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update course', details: err.message });
  }
});

// DELETE /api/courses/:id (Admin Only)
courseRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const courses = await getCourses();
    const filtered = courses.filter((c) => c.id !== req.params.id);
    if (filtered.length === courses.length) {
      res.status(404).json({ error: 'Course not found to delete' });
      return;
    }

    await saveCourses(filtered);
    sseManager.broadcast('COURSE_DELETED', { courseId: req.params.id });
    res.json({ success: true, deletedCourseId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete course', details: err.message });
  }
});
