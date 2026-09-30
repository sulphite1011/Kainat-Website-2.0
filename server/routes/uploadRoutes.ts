import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { LOGOS_DIR, COURSE_COVERS_DIR, PAYMENT_PROOFS_DIR, getSettings, saveSettings } from '../fileStore.js';
import { requireAdmin, requireStudent } from '../auth.js';
import { sseManager } from '../sse.js';

export const uploadRouter = Router();

// Configure storage engines
const createStorage = (destinationDir: string) => {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
      cb(null, destinationDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      const safeName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, safeName);
    },
  });
};

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Allowed formats: PNG, JPG, JPEG, WEBP, SVG.'));
  }
};

const uploadLogoMiddleware = multer({
  storage: createStorage(LOGOS_DIR),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const uploadCoverMiddleware = multer({
  storage: createStorage(COURSE_COVERS_DIR),
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

const uploadProofMiddleware = multer({
  storage: createStorage(PAYMENT_PROOFS_DIR),
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// POST /api/upload/logo (Admin Only)
uploadRouter.post('/logo', requireAdmin, uploadLogoMiddleware.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No logo file uploaded' });
      return;
    }

    const logoUrl = `/storage/logos/${req.file.filename}`;
    // Automatically update settings with the new logo
    const settings = await getSettings();
    settings.logoUrl = logoUrl;
    await saveSettings(settings);

    sseManager.broadcast('SETTINGS_UPDATED', settings);

    res.json({
      success: true,
      logoUrl,
      filename: req.file.filename,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload logo', details: err.message });
  }
});

// POST /api/upload/course-cover (Admin Only)
uploadRouter.post('/course-cover', requireAdmin, uploadCoverMiddleware.single('cover'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No cover file uploaded' });
      return;
    }

    const coverUrl = `/storage/course-covers/${req.file.filename}`;
    res.json({
      success: true,
      coverUrl,
      filename: req.file.filename,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload course cover', details: err.message });
  }
});

// POST /api/upload/payment-proof (Student Only)
uploadRouter.post('/payment-proof', requireStudent, uploadProofMiddleware.single('proof'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No payment proof file uploaded' });
      return;
    }

    // Notice: payment proofs are not in public static directory, they are fetched via protected endpoint
    const proofUrl = `/api/admin/payment-proofs/${req.file.filename}`;
    res.json({
      success: true,
      proofUrl,
      filename: req.file.filename,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload payment proof', details: err.message });
  }
});

// GET /api/admin/payment-proofs/:filename (Admin Only)
uploadRouter.get('/admin/payment-proofs/:filename', requireAdmin, (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(PAYMENT_PROOFS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Payment proof file not found' });
      return;
    }

    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve payment proof', details: err.message });
  }
});
