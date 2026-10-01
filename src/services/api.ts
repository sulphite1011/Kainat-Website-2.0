import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Course,
  SiteSettings,
  CartResponse,
  CartItemDetail,
  OrderItemSummary,
  Order,
  UserProfile,
  AdminStats,
  DocumentResponse,
  NotificationItem,
} from '../types';

let currentClerkUserId: string | null = null;
let currentAdminToken: string | null = (() => {
  try {
    return localStorage.getItem('kainat_admin_token') || null;
  } catch {
    return null;
  }
})();

export const setAuthClerkUserId = (userId: string | null) => {
  currentClerkUserId = userId;
};

export const setAuthAdminToken = (token: string | null) => {
  currentAdminToken = token;
  try {
    if (token) {
      localStorage.setItem('kainat_admin_token', token);
    } else {
      localStorage.removeItem('kainat_admin_token');
    }
  } catch {}
};

export const getAuthAdminToken = () => currentAdminToken;

// Baseline Default Data
const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Kainat Notes Hub',
  logoUrl: '',
  easyPaisaNumber: '03415892099',
  easyPaisaTitle: 'Kainat Educational Services',
  whatsAppNumber: '0324 9059918',
  contactEmail: 'support@kainatnoteshub.com',
  footerText: '© 2026 Kainat Notes Hub. All Rights Reserved. Verified Educational Notes for Board Exams.',
  currency: 'PKR',
  customClasses: ['Matric 9th', 'Matric 10th', 'FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'I.Com', 'BSc / BS'],
};

const INITIAL_COURSES: Course[] = [
  {
    id: 'crs_matric9_phy_u1',
    title: 'Physics Chapter 1: Physical Quantities & Measurement',
    class: 'Matric 9th',
    subject: 'Physics',
    unitNumber: 'Unit 1',
    unitName: 'Physical Quantities',
    chapterNumber: 'Chapter 1',
    chapterName: 'Physical Quantities & Measurement',
    topicName: 'Comprehensive Solved Notes with Numericals',
    description: 'Complete board-pattern solved short questions, comprehensive theory notes, conceptual numerical derivations, and textbook exercise solutions.',
    price: 350,
    coverImageUrl: '',
    samplePdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fullPdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    pageCount: 38,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'crs_fsc1_math_u3',
    title: 'Mathematics Part 1: Matrices & Determinants',
    class: 'FSc Part 1',
    subject: 'Mathematics',
    unitNumber: 'Unit 3',
    unitName: 'Algebra & Matrices',
    chapterNumber: 'Chapter 3',
    chapterName: 'Matrices and Determinants',
    topicName: 'Inverse, Cramer Rule & Rank of Matrix',
    description: 'Step-by-step solved matrix equations, Cramer rule proofs, echelon & reduced echelon forms, and past board exam questions.',
    price: 450,
    coverImageUrl: '',
    samplePdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fullPdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    pageCount: 52,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const api = {
  // Settings (Synchronized globally in Firestore /settings/global)
  async getSettings(): Promise<SiteSettings> {
    const settingsDocPath = 'settings/global';
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteSettings;
        setLocal('kainat_settings', data);
        return data;
      }
      // Initialize in cloud Firestore on first run
      await setDoc(docRef, DEFAULT_SETTINGS);
      setLocal('kainat_settings', DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (err) {
      console.warn('Firestore getSettings fallback to cache:', err);
      return getLocal<SiteSettings>('kainat_settings', DEFAULT_SETTINGS);
    }
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<{ success: boolean; settings: SiteSettings }> {
    const path = 'settings/global';
    try {
      const current = await this.getSettings();
      const updated: SiteSettings = {
        ...current,
        ...settings,
        customClasses: settings.customClasses || current.customClasses || DEFAULT_SETTINGS.customClasses,
      };
      await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
      setLocal('kainat_settings', updated);
      return { success: true, settings: updated };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  async addCustomClass(className: string): Promise<{ success: boolean; settings: SiteSettings; className: string }> {
    const path = 'settings/global';
    try {
      const current = await this.getSettings();
      const classes = current.customClasses || DEFAULT_SETTINGS.customClasses || [];
      if (!classes.includes(className)) {
        const updatedClasses = [...classes, className];
        await updateDoc(doc(db, 'settings', 'global'), {
          customClasses: updatedClasses,
        });
        current.customClasses = updatedClasses;
        setLocal('kainat_settings', current);
      }
      return { success: true, settings: current, className };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deleteCustomClass(className: string): Promise<{ success: boolean; settings: SiteSettings }> {
    const path = 'settings/global';
    try {
      const current = await this.getSettings();
      const classes = current.customClasses || DEFAULT_SETTINGS.customClasses || [];
      const updatedClasses = classes.filter((c) => c !== className);
      await updateDoc(doc(db, 'settings', 'global'), {
        customClasses: updatedClasses,
      });
      current.customClasses = updatedClasses;
      setLocal('kainat_settings', current);
      return { success: true, settings: current };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Courses (Synchronized globally in Firestore /courses)
  async getCourses(): Promise<Course[]> {
    const path = 'courses';
    try {
      const colRef = collection(db, 'courses');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        // Seed initial courses to cloud so new databases have starter notes
        for (const course of INITIAL_COURSES) {
          await setDoc(doc(db, 'courses', course.id), course);
        }
        setLocal('kainat_courses', INITIAL_COURSES);
        return INITIAL_COURSES;
      }
      const courses: Course[] = [];
      snap.forEach((d) => courses.push(d.data() as Course));
      // Sort by newest first
      courses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLocal('kainat_courses', courses);
      return courses;
    } catch (err) {
      console.warn('Firestore getCourses fallback to local cache:', err);
      return getLocal<Course[]>('kainat_courses', INITIAL_COURSES);
    }
  },

  async getCourse(id: string): Promise<Course> {
    const path = `courses/${id}`;
    try {
      const docRef = doc(db, 'courses', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error('Course not found');
      }
      return snap.data() as Course;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  async createCourse(courseData: Partial<Course>): Promise<{ success: boolean; course: Course }> {
    const newId = courseData.id || 'crs_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const path = `courses/${newId}`;
    try {
      const newCourse: Course = {
        id: newId,
        title: (courseData.title || 'Untitled Notes').trim(),
        class: (courseData.class || 'General').trim(),
        subject: (courseData.subject || 'General').trim(),
        semesterOrYear: courseData.semesterOrYear || '',
        unitNumber: courseData.unitNumber || '',
        unitName: courseData.unitName || '',
        chapterNumber: courseData.chapterNumber || '',
        chapterName: courseData.chapterName || '',
        topicName: courseData.topicName || '',
        description: courseData.description || '',
        price: Number(courseData.price) || 0,
        coverImageUrl: courseData.coverImageUrl || '',
        samplePdfUrl: courseData.samplePdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        fullPdfUrl: courseData.fullPdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        pageCount: Number(courseData.pageCount) || 10,
        isPublished: courseData.isPublished !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'courses', newId), newCourse);

      // Update local cache
      const cached = getLocal<Course[]>('kainat_courses', []);
      cached.unshift(newCourse);
      setLocal('kainat_courses', cached);

      return { success: true, course: newCourse };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async updateCourse(id: string, courseData: Partial<Course>): Promise<{ success: boolean; course: Course }> {
    const path = `courses/${id}`;
    try {
      const existing = await this.getCourse(id);
      const updated: Course = {
        ...existing,
        ...courseData,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'courses', id), updated, { merge: true });

      // Update local cache
      const cached = getLocal<Course[]>('kainat_courses', []);
      const idx = cached.findIndex((c) => c.id === id);
      if (idx !== -1) {
        cached[idx] = updated;
        setLocal('kainat_courses', cached);
      }

      return { success: true, course: updated };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async deleteCourse(id: string): Promise<{ success: boolean; deletedCourseId: string }> {
    const path = `courses/${id}`;
    try {
      await deleteDoc(doc(db, 'courses', id));
      const cached = getLocal<Course[]>('kainat_courses', []).filter((c) => c.id !== id);
      setLocal('kainat_courses', cached);
      return { success: true, deletedCourseId: id };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  // Protected PDF Document
  async getCourseDocument(courseId: string): Promise<DocumentResponse> {
    try {
      const course = await this.getCourse(courseId);
      return {
        success: true,
        courseId,
        title: course.title,
        class: course.class,
        subject: course.subject,
        fullPdfUrl: course.fullPdfUrl || course.samplePdfUrl,
        samplePdfUrl: course.samplePdfUrl,
        watermark: {
          brand: 'Kainat Notes Hub',
          studentName: 'Verified Student',
          studentEmail: 'student@example.com',
          orderId: 'ORD-CLOUD',
          licenseId: 'LIC-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          timestamp: new Date().toISOString(),
        },
      };
    } catch {
      return {
        success: true,
        courseId,
        title: 'Notes Document',
        class: 'General',
        subject: 'Notes',
        fullPdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        samplePdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        watermark: {
          brand: 'Kainat Notes Hub',
          studentName: 'Verified Student',
          studentEmail: 'student@example.com',
          orderId: 'ORD-CLOUD',
          licenseId: 'LIC-DEFAULT',
          timestamp: new Date().toISOString(),
        },
      };
    }
  },

  // Student Sync & Library (Synchronized in Firestore /users/{userId})
  async syncStudent(profile: {
    clerkUserId: string;
    name: string;
    email: string;
    avatarUrl: string;
  }): Promise<{ success: boolean; user: UserProfile }> {
    const userId = profile.clerkUserId;
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const snap = await getDoc(docRef);
      let user: UserProfile;
      if (snap.exists()) {
        const existing = snap.data() as UserProfile;
        user = {
          ...existing,
          name: profile.name || existing.name,
          email: profile.email || existing.email,
          avatarUrl: profile.avatarUrl || existing.avatarUrl,
          updatedAt: new Date().toISOString(),
        };
        await updateDoc(docRef, {
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          updatedAt: user.updatedAt,
        });
      } else {
        user = {
          clerkUserId: userId,
          name: profile.name || 'Student',
          email: profile.email || '',
          avatarUrl: profile.avatarUrl || '',
          purchasedCourseIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(docRef, user);
      }
      return { success: true, user };
    } catch (err) {
      console.warn('Firestore syncStudent fallback:', err);
      const user: UserProfile = {
        clerkUserId: userId,
        name: profile.name || 'Student',
        email: profile.email || '',
        avatarUrl: profile.avatarUrl || '',
        purchasedCourseIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { success: true, user };
    }
  },

  async getStudentLibrary(): Promise<{ clerkUserId: string; studentName: string; courses: Course[] }> {
    const userId = currentClerkUserId;
    if (!userId) {
      return { clerkUserId: '', studentName: 'Guest', courses: [] };
    }
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      const user = userSnap.exists() ? (userSnap.data() as UserProfile) : null;
      const purchasedIds = user?.purchasedCourseIds || [];

      if (purchasedIds.length === 0) {
        return {
          clerkUserId: userId,
          studentName: user?.name || 'Student',
          courses: [],
        };
      }

      const allCourses = await this.getCourses();
      const enrolledCourses = allCourses.filter((c) => purchasedIds.includes(c.id));
      return {
        clerkUserId: userId,
        studentName: user?.name || 'Student',
        courses: enrolledCourses,
      };
    } catch (err) {
      console.warn('Firestore getStudentLibrary fallback:', err);
      return { clerkUserId: userId, studentName: 'Student', courses: [] };
    }
  },

  async getStudentProfile(): Promise<UserProfile> {
    const userId = currentClerkUserId;
    if (!userId) throw new Error('Not authenticated');
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) throw new Error('Student profile not found');
    return snap.data() as UserProfile;
  },

  async getStudents(): Promise<UserProfile[]> {
    const path = 'users';
    try {
      const snap = await getDocs(collection(db, 'users'));
      const students: UserProfile[] = [];
      snap.forEach((d) => students.push(d.data() as UserProfile));
      return students;
    } catch (err) {
      console.warn('Firestore getStudents fallback:', err);
      return [];
    }
  },

  // Notifications (Firestore /notifications)
  async getNotifications(): Promise<NotificationItem[]> {
    const userId = currentClerkUserId;
    if (!userId) return [];
    const path = 'notifications';
    try {
      const q = query(collection(db, 'notifications'), where('clerkUserId', '==', userId));
      const snap = await getDocs(q);
      const items: NotificationItem[] = [];
      snap.forEach((d) => items.push(d.data() as NotificationItem));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items;
    } catch (err) {
      console.warn('Firestore getNotifications fallback:', err);
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const path = `notifications/${id}`;
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Cart
  async getCart(userId?: string): Promise<CartResponse> {
    const activeUser = userId || currentClerkUserId || 'guest';
    const cartKey = `kainat_cart_${activeUser}`;
    const cartIds = getLocal<string[]>(cartKey, []);
    const allCourses = await this.getCourses();
    const items: CartItemDetail[] = allCourses
      .filter((c) => cartIds.includes(c.id))
      .map((c) => ({
        courseId: c.id,
        title: c.title,
        class: c.class,
        subject: c.subject,
        price: c.price,
        coverImageUrl: c.coverImageUrl,
        addedAt: new Date().toISOString(),
      }));
    const totalAmount = items.reduce((sum, item) => sum + item.price, 0);
    return {
      clerkUserId: activeUser,
      items,
      totalAmount,
      totalItems: items.length,
    };
  },

  async addToCart(courseId: string): Promise<{ success: boolean }> {
    const activeUser = currentClerkUserId || 'guest';
    const cartKey = `kainat_cart_${activeUser}`;
    const cartIds = getLocal<string[]>(cartKey, []);
    if (!cartIds.includes(courseId)) {
      cartIds.push(courseId);
      setLocal(cartKey, cartIds);
    }
    return { success: true };
  },

  async removeFromCart(courseId: string): Promise<{ success: boolean }> {
    const activeUser = currentClerkUserId || 'guest';
    const cartKey = `kainat_cart_${activeUser}`;
    const cartIds = getLocal<string[]>(cartKey, []).filter((id) => id !== courseId);
    setLocal(cartKey, cartIds);
    return { success: true };
  },

  async clearCart(): Promise<{ success: boolean }> {
    const activeUser = currentClerkUserId || 'guest';
    const cartKey = `kainat_cart_${activeUser}`;
    setLocal(cartKey, []);
    return { success: true };
  },

  // Orders (Synchronized in Firestore /orders)
  async createOrder(data: {
    courseIds: string[];
    transactionId: string;
    paymentProofUrl: string;
  }): Promise<{ success: boolean; order: Order }> {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const path = `orders/${orderId}`;
    try {
      const allCourses = await this.getCourses();
      const orderedCourses = allCourses.filter((c) => data.courseIds.includes(c.id));
      const totalAmount = orderedCourses.reduce((sum, c) => sum + c.price, 0);

      const coursesSummary: OrderItemSummary[] = orderedCourses.map((c) => ({
        id: c.id,
        title: c.title,
        price: c.price,
        class: c.class,
      }));

      // Find student info if available
      let studentName = 'Student';
      let studentEmail = '';
      if (currentClerkUserId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentClerkUserId));
          if (userDoc.exists()) {
            const u = userDoc.data() as UserProfile;
            studentName = u.name || studentName;
            studentEmail = u.email || studentEmail;
          }
        } catch {}
      }

      const newOrder: Order = {
        id: orderId,
        clerkUserId: currentClerkUserId || 'guest',
        studentName,
        studentEmail,
        courseIds: data.courseIds,
        coursesSummary,
        totalAmount,
        paymentMethod: 'EasyPaisa',
        transactionId: data.transactionId.trim(),
        paymentProofUrl: data.paymentProofUrl || '',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'orders', orderId), newOrder);

      // Clear student cart
      await this.clearCart();

      return { success: true, order: newOrder };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  },

  async getMyOrders(): Promise<Order[]> {
    const userId = currentClerkUserId;
    if (!userId) return [];
    const path = 'orders';
    try {
      const q = query(collection(db, 'orders'), where('clerkUserId', '==', userId));
      const snap = await getDocs(q);
      const orders: Order[] = [];
      snap.forEach((d) => orders.push(d.data() as Order));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return orders;
    } catch (err) {
      console.warn('Firestore getMyOrders fallback:', err);
      return [];
    }
  },

  async getAllOrders(): Promise<Order[]> {
    const path = 'orders';
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const orders: Order[] = [];
      snap.forEach((d) => orders.push(d.data() as Order));
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return orders;
    } catch (err) {
      console.warn('Firestore getAllOrders fallback:', err);
      return [];
    }
  },

  async verifyOrder(orderId: string, adminNotes?: string): Promise<{ success: boolean; order: Order }> {
    const path = `orders/${orderId}`;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) throw new Error('Order not found');

      const order = orderSnap.data() as Order;
      const updatedOrder: Order = {
        ...order,
        status: 'VERIFIED',
        adminNotes: adminNotes || '',
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(orderRef, {
        status: 'VERIFIED',
        adminNotes: adminNotes || '',
        updatedAt: updatedOrder.updatedAt,
      });

      // Grant course licenses to the student in Firestore
      if (order.clerkUserId && order.clerkUserId !== 'guest') {
        const userRef = doc(db, 'users', order.clerkUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const user = userSnap.data() as UserProfile;
          const mergedCourses = Array.from(new Set([...(user.purchasedCourseIds || []), ...order.courseIds]));
          await updateDoc(userRef, {
            purchasedCourseIds: mergedCourses,
            updatedAt: new Date().toISOString(),
          });
        }

        // Add a notification for the student
        const notifId = 'notif_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          clerkUserId: order.clerkUserId,
          title: 'Payment Verified! Notes Available',
          message: `Your payment for order #${orderId} (Rs. ${order.totalAmount}) has been verified. The notes are now in your library!`,
          type: 'order_verified',
          isRead: false,
          createdAt: new Date().toISOString(),
        } as NotificationItem);
      }

      return { success: true, order: updatedOrder };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  async rejectOrder(orderId: string, reason: string): Promise<{ success: boolean; order: Order }> {
    const path = `orders/${orderId}`;
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) throw new Error('Order not found');

      const order = orderSnap.data() as Order;
      const updatedOrder: Order = {
        ...order,
        status: 'REJECTED',
        adminNotes: reason,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(orderRef, {
        status: 'REJECTED',
        adminNotes: reason,
        updatedAt: updatedOrder.updatedAt,
      });

      // Send rejection notification to student
      if (order.clerkUserId && order.clerkUserId !== 'guest') {
        const notifId = 'notif_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          clerkUserId: order.clerkUserId,
          title: 'Order Status Update',
          message: `Your order #${orderId} was rejected. Reason: ${reason}. Please contact WhatsApp support if you have questions.`,
          type: 'order_rejected',
          isRead: false,
          createdAt: new Date().toISOString(),
        } as NotificationItem);
      }

      return { success: true, order: updatedOrder };
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  // Admin Auth & Stats
  async adminLogin(username: string, password: string): Promise<{ success: boolean; token: string; username: string }> {
    const inputUser = (username || '').trim();
    const inputPass = (password || '').trim();

    if (!inputUser || !inputPass) {
      throw new Error('Please enter admin username and password');
    }

    // Try backend /api/admin/login first if express server is reachable
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: inputUser, password: inputPass }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data.success && data.token) {
          setAuthAdminToken(data.token);
          setLocal('kainat_admin_token', data.token);
          setLocal('kainat_admin_user', data.username || inputUser);
          return data;
        }
        if (res.status === 401) {
          throw new Error(data.error || 'Invalid admin credentials');
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('Invalid admin') || err.message.includes('Unauthorized'))) {
        throw err;
      }
    }

    // Client-side fallback authentication for Cloudflare Pages / Vercel SPA
    const envUser = (
      (import.meta as any).env?.ADMIN_USERNAME ||
      (import.meta as any).env?.VITE_ADMIN_USERNAME ||
      (typeof process !== 'undefined' ? process.env?.ADMIN_USERNAME || process.env?.VITE_ADMIN_USERNAME : '') ||
      'admin'
    ).trim();

    const envPass = (
      (import.meta as any).env?.ADMIN_PASSWORD ||
      (import.meta as any).env?.VITE_ADMIN_PASSWORD ||
      (typeof process !== 'undefined' ? process.env?.ADMIN_PASSWORD || process.env?.VITE_ADMIN_PASSWORD : '') ||
      'kainat2026'
    ).trim();

    const matchesEnv = inputUser.toLowerCase() === envUser.toLowerCase() && inputPass === envPass;
    const matchesFallback =
      (inputUser.toLowerCase() === 'admin' && inputPass === 'kainat2026') ||
      (inputUser.toLowerCase() === 'kainat' && inputPass === 'HamadJani') ||
      (inputUser.toLowerCase() === 'kainat' && inputPass === 'kainat2026');

    if (matchesEnv || matchesFallback) {
      const localToken = 'adm_cloud_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      setAuthAdminToken(localToken);
      setLocal('kainat_admin_token', localToken);
      setLocal('kainat_admin_user', inputUser);
      return { success: true, token: localToken, username: inputUser };
    }

    throw new Error('Invalid admin credentials');
  },

  async getAdminStats(): Promise<AdminStats> {
    try {
      const [courses, orders, students] = await Promise.all([
        this.getCourses(),
        this.getAllOrders(),
        this.getStudents(),
      ]);

      const verifiedOrders = orders.filter((o) => o.status === 'VERIFIED');
      const verifiedRevenue = verifiedOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
      const pendingPayments = orders.filter((o) => o.status === 'PENDING').length;

      return {
        verifiedRevenue,
        pendingPayments,
        verifiedStudents: students.length,
        totalStudents: Math.max(students.length, 1),
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.isPublished).length,
        totalOrders: orders.length,
      };
    } catch (err) {
      console.warn('Firestore getAdminStats fallback:', err);
      return {
        verifiedRevenue: 0,
        pendingPayments: 0,
        verifiedStudents: 0,
        totalStudents: 0,
        totalCourses: 0,
        publishedCourses: 0,
        totalOrders: 0,
      };
    }
  },

  // Uploads (stored as fast inline web data URLs for cross-device cloud persistence)
  async uploadLogo(formData: FormData): Promise<{ success: boolean; logoUrl: string }> {
    try {
      const file = formData.get('logo') as File | null;
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        return { success: true, logoUrl: dataUrl };
      }
    } catch {}
    return { success: true, logoUrl: '' };
  },

  async uploadCourseCover(formData: FormData): Promise<{ success: boolean; coverUrl: string }> {
    try {
      const file = formData.get('cover') as File | null;
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        return { success: true, coverUrl: dataUrl };
      }
    } catch {}
    return { success: true, coverUrl: '' };
  },

  async uploadPaymentProof(formData: FormData): Promise<{ success: boolean; proofUrl: string }> {
    try {
      const file = formData.get('screenshot') as File | null;
      if (file) {
        const dataUrl = await fileToDataUrl(file);
        return { success: true, proofUrl: dataUrl };
      }
    } catch {}
    return { success: true, proofUrl: '' };
  },
};
