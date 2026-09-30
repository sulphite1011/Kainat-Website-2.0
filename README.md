# Kainat Notes Hub 🎓

**ONE website, ONE server-side source of truth, NO browser-specific application data.**

Kainat Notes Hub is a full-stack educational marketplace engineered for selling and distributing curriculum notes, chapter summaries, and solved past papers for **Matric 9th**, **Matric 10th**, **FSc Part 1**, **FSc Part 2**, and **BSc / BS** students.

---

## ⚠️ Important Filesystem Persistence Requirement

> **"This no-database version requires a persistent Node.js server/filesystem. Static hosting and serverless environments with ephemeral filesystems (such as pure Vercel serverless or Cloudflare Pages static) cannot permanently save runtime admin changes."**

This application deliberately does **NOT** use MongoDB, Firebase, Supabase, localStorage, sessionStorage, IndexedDB, or browser cache as application data storage.

All application data (courses, settings, students, carts, orders, notifications) is authoritatively stored on the server's filesystem in JSON format under `/data/` and `/storage/`.

To ensure permanent runtime persistence across restarts, host this application on a containerized or VM host with a persistent writable volume (e.g. Google Cloud Run with Cloud Storage volume / Persistent Disk, Railway, Render, Fly.io, or VPS).

---

## 1. Core Architecture

* **Frontend**: React 19, TypeScript, React Router 7, Plain CSS design system (zero Tailwind CSS v4, zero external UI bloat).
* **Backend**: Node.js, Express, Multer (safe file uploads), Server-Sent Events (SSE).
* **Authentication**: Clerk (Student Google OAuth sign-in only) + Server-side HMAC token for Admin console.
* **Storage Layer**:
  * Safe atomic file persistence with temporary-file swap (`.tmp` write followed by atomic `rename`).
  * Server-authoritative access control: protected PDFs are never exposed to unpaid clients.

```
/data/
  settings.json       # Branding, EasyPaisa, WhatsApp, contact
  courses.json        # Curated catalog of courses & syllabus notes
  users.json          # Verified Clerk student profiles & purchased access
  carts.json          # Server-persisted student carts (keyed by clerkUserId)
  orders.json         # Pending, verified, and rejected orders with transaction IDs
  notifications.json  # In-app student status alerts

/storage/
  /logos/             # Circular cropped brand logos
  /course-covers/     # High-resolution course covers
  /payment-proofs/    # Private payment receipts (authenticated admin access only)
```

---

## 2. Environment Variables & Setup

Copy `.env.example` to `.env`:

```bash
# Clerk Authentication (Student Google sign-in)
# Obtain from your Clerk dashboard: https://dashboard.clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Admin Portal Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=kainat2026

# Server Port
PORT=3000
```

### Installation & Run

```bash
# Install dependencies
npm install

# Start development full-stack server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 3. Student Authentication (Clerk Google OAuth Only)

Students do **NOT** enter passwords or manual usernames. The only login option is **Continue with Google** via Clerk.

* The system uses the **Clerk User ID (`clerkUserId`)** as the permanent primary identity key across all databases, orders, and library licenses.
* When a student signs in from another browser or device with the same Google account, the server returns their existing cart, library, and order records.
* Navbar displays Google avatar, full name, and authenticated status.

---

## 4. Admin Management Console

Access the Admin Portal at `/admin` (or `/admin/login`).

* **Dashboard**: Live server-side counters for Verified Revenue, Pending Payments, Verified Students, Total Students, and Total Courses. Never uses fake seeded figures.
* **Order Verification**: Inspect transaction ID and uploaded EasyPaisa receipts. Clicking **Verify** unlocks notes immediately.
* **Course Creation**:
  * Title, Class level, Subject, Unit, Chapter, Topic.
  * Price (PKR).
  * Cover image upload (saved to `/storage/course-covers/`).
  * **Two-PDF System**: Public Sample PDF (free demo) and Protected Full PDF (unlocked upon payment).
* **Logo Editor & Cropper**:
  * Upload PNG, JPG, JPEG, WEBP, or SVG.
  * Drag / pan with mouse or finger.
  * Pinch-to-zoom and mouse wheel zoom.
  * Live circular preview.
  * Exported circular crop matches the preview circle pixel-for-pixel with zero shift.
* **Website Settings**: EasyPaisa number (`03415892099`), WhatsApp (`0324 9059918`), contact email, footer text.

---

## 5. Protected PDF Delivery & Anti-Piracy Watermarking

1. Public course catalog previews **only** the sample PDF. The full PDF URL is never sent over the wire to unpaid users.
2. When a paid student opens their notes in **My Library**, the frontend requests `GET /api/courses/:id/document`.
3. The Express server verifies that the requesting `clerkUserId` owns a `VERIFIED` order for that specific course before granting access.
4. The reading canvas overlays a subtle, repeating diagonal watermark:
   ```
   KAINAT NOTES HUB
   Licensed to: [Student Name]
   [Student Gmail]
   Order: [Order ID]
   ```
5. Additional best-effort deterrents include disabling print stylesheets (`@media print { body { display: none } }`), context menu blocking, and background blur when switching tabs.

---

## 6. Backup Instructions for `/data` and `/storage`

Because all website data resides in `/data/` and `/storage/`, backups are clean and straightforward:

```bash
# Create timestamped tarball backup
tar -czvf kainat_backup_$(date +%Y%m%d_%H%M%S).tar.gz data storage

# To restore:
tar -xzvf kainat_backup_YYYYMMDD_HHMMSS.tar.gz
```
