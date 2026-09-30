export interface Course {
  id: string;
  title: string;
  class: string;
  subject: string;
  semesterOrYear?: string;
  unitNumber?: string;
  unitName?: string;
  chapterNumber?: string;
  chapterName?: string;
  topicName?: string;
  description: string;
  price: number;
  coverImageUrl: string;
  samplePdfUrl: string;
  fullPdfUrl?: string;
  hasFullPdf?: boolean;
  hasPurchased?: boolean;
  pageCount?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  clerkUserId: string;
  name: string;
  email: string;
  avatarUrl: string;
  purchasedCourseIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItemDetail {
  courseId: string;
  title: string;
  class: string;
  subject: string;
  price: number;
  coverImageUrl: string;
  addedAt: string;
}

export interface CartResponse {
  clerkUserId: string;
  items: CartItemDetail[];
  totalAmount: number;
  totalItems: number;
}

export type OrderStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface OrderItemSummary {
  id: string;
  title: string;
  price: number;
  class: string;
}

export interface Order {
  id: string;
  clerkUserId: string;
  studentName: string;
  studentEmail: string;
  courseIds: string[];
  coursesSummary: OrderItemSummary[];
  totalAmount: number;
  paymentMethod: 'EasyPaisa';
  transactionId: string;
  paymentProofUrl: string;
  status: OrderStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  clerkUserId: string;
  title: string;
  message: string;
  type: 'order_verified' | 'order_rejected' | 'general';
  isRead: boolean;
  createdAt: string;
}

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  easyPaisaNumber: string;
  easyPaisaTitle: string;
  whatsAppNumber: string;
  contactEmail: string;
  footerText: string;
  currency: string;
}

export interface AdminStats {
  verifiedRevenue: number;
  pendingPayments: number;
  verifiedStudents: number;
  totalStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalOrders: number;
}

export interface DocumentResponse {
  success: boolean;
  courseId: string;
  title: string;
  class: string;
  subject: string;
  fullPdfUrl: string;
  samplePdfUrl: string;
  watermark: {
    brand: string;
    studentName: string;
    studentEmail: string;
    orderId: string;
    licenseId: string;
    timestamp: string;
  };
}
