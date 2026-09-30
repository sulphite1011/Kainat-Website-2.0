import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initStorage, LOGOS_DIR, COURSE_COVERS_DIR } from './server/fileStore.js';
import { authenticateAdminCredentials } from './server/auth.js';
import { sseManager } from './server/sse.js';
import { settingsRouter } from './server/routes/settingsRoutes.js';
import { courseRouter } from './server/routes/courseRoutes.js';
import { cartRouter } from './server/routes/cartRoutes.js';
import { orderRouter } from './server/routes/orderRoutes.js';
import { studentRouter } from './server/routes/studentRoutes.js';
import { uploadRouter } from './server/routes/uploadRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data and storage directories exist
await initStorage();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Publicly serve logos and course covers from persistent storage folder
app.use('/storage/logos', express.static(LOGOS_DIR));
app.use('/storage/course-covers', express.static(COURSE_COVERS_DIR));

// Admin authentication endpoint
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  const token = authenticateAdminCredentials(username, password);
  if (!token) {
    res.status(401).json({ error: 'Invalid admin username or password' });
    return;
  }
  res.json({ success: true, token, username });
});

// SSE endpoint for real-time live events across all browsers
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  sseManager.addClient(clientId, res);

  // Send initial handshake ping
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ connected: true, clientId })}\n\n`);

  req.on('close', () => {
    sseManager.removeClient(clientId);
  });
});

// Mount modular API routers
app.use('/api/settings', settingsRouter);
app.use('/api/courses', courseRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api', studentRouter);
app.use('/api/upload', uploadRouter);

// Frontend integration: Vite middleware in dev or static dist in production
if (!isProduction) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Kainat Notes Hub] Server running at http://0.0.0.0:${PORT}`);
});
