import { Router, Request, Response } from 'express';
import { getSettings, saveSettings } from '../fileStore.js';
import { requireAdmin } from '../auth.js';
import { sseManager } from '../sse.js';

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve website settings', details: err.message });
  }
});

// PUT /api/settings (Admin Only)
settingsRouter.put('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const current = await getSettings();
    const updated = {
      ...current,
      ...req.body,
    };
    await saveSettings(updated);
    sseManager.broadcast('SETTINGS_UPDATED', updated);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update website settings', details: err.message });
  }
});
