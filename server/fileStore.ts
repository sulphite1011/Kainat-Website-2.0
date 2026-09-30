import fs from 'fs';
import path from 'path';
import { Course, UserProfile, CartStore, Order, NotificationItem, SiteSettings } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORAGE_DIR = path.resolve(process.cwd(), 'storage');

export const LOGOS_DIR = path.join(STORAGE_DIR, 'logos');
export const COURSE_COVERS_DIR = path.join(STORAGE_DIR, 'course-covers');
export const PAYMENT_PROOFS_DIR = path.join(STORAGE_DIR, 'payment-proofs');

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const COURSES_FILE = path.join(DATA_DIR, 'courses.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CARTS_FILE = path.join(DATA_DIR, 'carts.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

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

// Safe atomic write helper: write to temp file then rename
async function safeAtomicWrite(filePath: string, data: any): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const content = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(tempPath, content, 'utf-8');
  await fs.promises.rename(tempPath, filePath);
}

// Safe read helper with default fallback
async function safeRead<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    if (!fs.existsSync(filePath)) {
      await safeAtomicWrite(filePath, defaultValue);
      return defaultValue;
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}, restoring default:`, err);
    return defaultValue;
  }
}

// Initialize all required folders and default JSON files
export async function initStorage(): Promise<void> {
  const dirs = [
    DATA_DIR,
    STORAGE_DIR,
    LOGOS_DIR,
    COURSE_COVERS_DIR,
    PAYMENT_PROOFS_DIR,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  // Ensure JSON files exist
  if (!fs.existsSync(SETTINGS_FILE)) {
    await safeAtomicWrite(SETTINGS_FILE, DEFAULT_SETTINGS);
  }
  if (!fs.existsSync(COURSES_FILE)) {
    // Provide clean initial starter course clearly marked so catalog is immediately previewable
    const initialCourses: Course[] = [
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
    await safeAtomicWrite(COURSES_FILE, initialCourses);
  }
  if (!fs.existsSync(USERS_FILE)) {
    await safeAtomicWrite(USERS_FILE, []);
  }
  if (!fs.existsSync(CARTS_FILE)) {
    await safeAtomicWrite(CARTS_FILE, {});
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    await safeAtomicWrite(ORDERS_FILE, []);
  }
  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    await safeAtomicWrite(NOTIFICATIONS_FILE, []);
  }
}

// Settings
export async function getSettings(): Promise<SiteSettings> {
  return safeRead<SiteSettings>(SETTINGS_FILE, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: SiteSettings): Promise<SiteSettings> {
  await safeAtomicWrite(SETTINGS_FILE, settings);
  return settings;
}

// Courses
export async function getCourses(): Promise<Course[]> {
  return safeRead<Course[]>(COURSES_FILE, []);
}

export async function saveCourses(courses: Course[]): Promise<Course[]> {
  await safeAtomicWrite(COURSES_FILE, courses);
  return courses;
}

// Users
export async function getUsers(): Promise<UserProfile[]> {
  return safeRead<UserProfile[]>(USERS_FILE, []);
}

export async function saveUsers(users: UserProfile[]): Promise<UserProfile[]> {
  await safeAtomicWrite(USERS_FILE, users);
  return users;
}

// Carts
export async function getCarts(): Promise<CartStore> {
  return safeRead<CartStore>(CARTS_FILE, {});
}

export async function saveCarts(carts: CartStore): Promise<CartStore> {
  await safeAtomicWrite(CARTS_FILE, carts);
  return carts;
}

// Orders
export async function getOrders(): Promise<Order[]> {
  return safeRead<Order[]>(ORDERS_FILE, []);
}

export async function saveOrders(orders: Order[]): Promise<Order[]> {
  await safeAtomicWrite(ORDERS_FILE, orders);
  return orders;
}

// Notifications
export async function getNotifications(): Promise<NotificationItem[]> {
  return safeRead<NotificationItem[]>(NOTIFICATIONS_FILE, []);
}

export async function saveNotifications(notifications: NotificationItem[]): Promise<NotificationItem[]> {
  await safeAtomicWrite(NOTIFICATIONS_FILE, notifications);
  return notifications;
}
