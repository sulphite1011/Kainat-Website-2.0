export interface Course {
  id: string;
  title: string;
  class: string; // "Matric 9th" | "Matric 10th" | "FSc Part 1" | "FSc Part 2" | "BSc / BS" | custom
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
  samplePdfUrl: string; // publicly accessible sample
  fullPdfUrl: string; // protected paid link - never exposed to unpaid clients
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

export interface CartItem {
  courseId: string;
  addedAt: string;
}

export interface CartStore {
  [clerkUserId: string]: {
    items: CartItem[];
  };
}

export interface OrderItemSummary {
  id: string;
  title: string;
  price: number;
  class: string;
}

export type OrderStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

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
