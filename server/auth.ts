import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createClerkClient, verifyToken } from '@clerk/backend';

// Admin session storage (in-memory per server runtime)
const validAdminTokens = new Set<string>();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kainat2026';

// Clerk client (if secret key configured)
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
export const clerkClient = clerkSecretKey && clerkSecretKey !== 'sk_test_placeholder'
  ? createClerkClient({ secretKey: clerkSecretKey })
  : null;

// Generate secure admin token
export function authenticateAdminCredentials(user: string, pass: string): string | null {
  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    const token = 'adm_' + crypto.randomBytes(32).toString('hex');
    validAdminTokens.add(token);
    return token;
  }
  return null;
}

export function revokeAdminToken(token: string): void {
  validAdminTokens.delete(token);
}

// Admin auth middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Admin token required.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!validAdminTokens.has(token)) {
    res.status(401).json({ error: 'Invalid or expired admin session token.' });
    return;
  }
  next();
}

// Student identification helper
export async function getStudentClerkId(req: Request): Promise<string | null> {
  // Check header 'x-clerk-user-id'
  const headerUserId = req.headers['x-clerk-user-id'];
  if (typeof headerUserId === 'string' && headerUserId.trim().length > 0) {
    return headerUserId.trim();
  }

  // Check Bearer token with Clerk if secret key is configured
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && clerkSecretKey && clerkSecretKey !== 'sk_test_placeholder') {
    const token = authHeader.split(' ')[1];
    try {
      const verified = await verifyToken(token, { secretKey: clerkSecretKey });
      if (verified && verified.sub) {
        return verified.sub;
      }
    } catch (err) {
      // Continue to check fallback
    }
  }

  return null;
}

// Require student middleware
export async function requireStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clerkUserId = await getStudentClerkId(req);
  if (!clerkUserId) {
    res.status(401).json({ error: 'Unauthorized. Student authentication required.' });
    return;
  }
  (req as any).clerkUserId = clerkUserId;
  next();
}
