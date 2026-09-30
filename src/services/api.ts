import {
  Course,
  SiteSettings,
  CartResponse,
  Order,
  UserProfile,
  AdminStats,
  DocumentResponse,
  NotificationItem,
} from '../types';

let currentClerkUserId: string | null = null;
let currentAdminToken: string | null = null;

export const setAuthClerkUserId = (userId: string | null) => {
  currentClerkUserId = userId;
};

export const setAuthAdminToken = (token: string | null) => {
  currentAdminToken = token;
};

export const getAuthAdminToken = () => currentAdminToken;

const getHeaders = (isJson = true, overrideUserId?: string): HeadersInit => {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const userId = overrideUserId || currentClerkUserId;
  if (userId) {
    headers['x-clerk-user-id'] = userId;
  }
  if (currentAdminToken) {
    headers['Authorization'] = `Bearer ${currentAdminToken}`;
  }
  return headers;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {
      // not JSON
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Settings
  async getSettings(): Promise<SiteSettings> {
    const res = await fetch('/api/settings');
    return handleResponse<SiteSettings>(res);
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<{ success: boolean; settings: SiteSettings }> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  // Courses
  async getCourses(): Promise<Course[]> {
    const res = await fetch('/api/courses', {
      headers: getHeaders(false),
    });
    return handleResponse<Course[]>(res);
  },

  async getCourse(id: string): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`, {
      headers: getHeaders(false),
    });
    return handleResponse<Course>(res);
  },

  async createCourse(courseData: Partial<Course>): Promise<{ success: boolean; course: Course }> {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(courseData),
    });
    return handleResponse(res);
  },

  async updateCourse(id: string, courseData: Partial<Course>): Promise<{ success: boolean; course: Course }> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(courseData),
    });
    return handleResponse(res);
  },

  async deleteCourse(id: string): Promise<{ success: boolean; deletedCourseId: string }> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Protected PDF Document
  async getCourseDocument(courseId: string): Promise<DocumentResponse> {
    const res = await fetch(`/api/courses/${courseId}/document`, {
      headers: getHeaders(false),
    });
    return handleResponse<DocumentResponse>(res);
  },

  // Student Sync & Library
  async syncStudent(profile: { clerkUserId: string; name: string; email: string; avatarUrl: string }): Promise<{ success: boolean; user: UserProfile }> {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(profile),
    });
    return handleResponse(res);
  },

  async getStudentLibrary(): Promise<{ clerkUserId: string; studentName: string; courses: Course[] }> {
    const res = await fetch('/api/library', {
      headers: getHeaders(false),
    });
    return handleResponse(res);
  },

  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch('/api/notifications', {
      headers: getHeaders(false),
    });
    return handleResponse<NotificationItem[]>(res);
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(false),
    });
    return handleResponse(res);
  },

  // Cart
  async getCart(userId?: string): Promise<CartResponse> {
    const res = await fetch('/api/cart', {
      headers: getHeaders(false, userId),
    });
    return handleResponse<CartResponse>(res);
  },

  async addToCart(courseId: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/cart/items', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ courseId }),
    });
    return handleResponse(res);
  },

  async removeFromCart(courseId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/cart/items/${courseId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  async clearCart(): Promise<{ success: boolean }> {
    const res = await fetch('/api/cart/clear', {
      method: 'POST',
      headers: getHeaders(true),
    });
    return handleResponse(res);
  },

  // Orders
  async createOrder(data: { courseIds: string[]; transactionId: string; paymentProofUrl: string }): Promise<{ success: boolean; order: Order }> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await fetch('/api/orders/my', {
      headers: getHeaders(false),
    });
    return handleResponse<Order[]>(res);
  },

  async getAllOrders(): Promise<Order[]> {
    const res = await fetch('/api/orders', {
      headers: getHeaders(false),
    });
    return handleResponse<Order[]>(res);
  },

  async verifyOrder(orderId: string, adminNotes?: string): Promise<{ success: boolean; order: Order }> {
    const res = await fetch(`/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ adminNotes }),
    });
    return handleResponse(res);
  },

  async rejectOrder(orderId: string, reason?: string): Promise<{ success: boolean; order: Order }> {
    const res = await fetch(`/api/orders/${orderId}/reject`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  // Admin Auth & Stats
  async adminLogin(username: string, password: string): Promise<{ success: boolean; token: string; username: string }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  async getAdminStats(): Promise<AdminStats> {
    const res = await fetch('/api/admin/stats', {
      headers: getHeaders(false),
    });
    return handleResponse<AdminStats>(res);
  },

  async getStudents(): Promise<UserProfile[]> {
    const res = await fetch('/api/students', {
      headers: getHeaders(false),
    });
    return handleResponse<UserProfile[]>(res);
  },

  // Uploads
  async uploadLogo(formData: FormData): Promise<{ success: boolean; logoUrl: string }> {
    const res = await fetch('/api/upload/logo', {
      method: 'POST',
      headers: getHeaders(false),
      body: formData,
    });
    return handleResponse(res);
  },

  async uploadCourseCover(formData: FormData): Promise<{ success: boolean; coverUrl: string }> {
    const res = await fetch('/api/upload/course-cover', {
      method: 'POST',
      headers: getHeaders(false),
      body: formData,
    });
    return handleResponse(res);
  },

  async uploadPaymentProof(formData: FormData): Promise<{ success: boolean; proofUrl: string }> {
    const res = await fetch('/api/upload/payment-proof', {
      method: 'POST',
      headers: getHeaders(false),
      body: formData,
    });
    return handleResponse(res);
  },
};
