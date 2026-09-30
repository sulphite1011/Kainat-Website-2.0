import { Router, Request, Response } from 'express';
import { getSettings, saveSettings } from '../fileStore.js';
import { requireAdmin } from '../auth.js';
import { sseManager } from '../sse.js';

export const settingsRouter = Router();

const DEFAULT_CLASSES = [
  'Matric 9th',
  'Matric 10th',
  'FSc Pre-Medical',
  'FSc Pre-Engineering',
  'ICS',
  'I.Com',
  'BSc / BS',
];

// GET /api/settings
settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    if (!settings.customClasses || settings.customClasses.length === 0) {
      settings.customClasses = DEFAULT_CLASSES;
    }
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
    if (!updated.customClasses || updated.customClasses.length === 0) {
      updated.customClasses = current.customClasses || DEFAULT_CLASSES;
    }
    await saveSettings(updated);
    sseManager.broadcast('SETTINGS_UPDATED', updated);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update website settings', details: err.message });
  }
});

// POST /api/settings/classes (Admin Only) - Add a new custom class level
settingsRouter.post('/classes', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { className } = req.body;
    if (!className || typeof className !== 'string' || !className.trim()) {
      res.status(400).json({ error: 'Class name is required' });
      return;
    }

    const trimmed = className.trim();
    const current = await getSettings();
    const list = current.customClasses && current.customClasses.length > 0
      ? [...current.customClasses]
      : [...DEFAULT_CLASSES];

    if (!list.includes(trimmed)) {
      list.push(trimmed);
    }

    const updated = {
      ...current,
      customClasses: list,
    };

    await saveSettings(updated);
    sseManager.broadcast('SETTINGS_UPDATED', updated);
    res.json({ success: true, settings: updated, className: trimmed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add custom class', details: err.message });
  }
});

// DELETE /api/settings/classes/:className (Admin Only) - Delete a custom class level
settingsRouter.delete('/classes/:className', requireAdmin, async (req: Request, res: Response) => {
  try {
    const className = decodeURIComponent(req.params.className);
    const current = await getSettings();
    const list = (current.customClasses || DEFAULT_CLASSES).filter((c) => c !== className);

    const updated = {
      ...current,
      customClasses: list,
    };

    await saveSettings(updated);
    sseManager.broadcast('SETTINGS_UPDATED', updated);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete custom class', details: err.message });
  }
});
