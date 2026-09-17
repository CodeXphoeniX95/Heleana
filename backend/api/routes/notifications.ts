import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  getNotificationsForUser,
  markNotificationsRead,
} from '../services/notifications.service';

const router = Router();

// ── GET /api/notifications — Historique in-app ────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query as { limit?: string; offset?: string };
    const result = await getNotificationsForUser(
      req.user!.userId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/notifications/read — Marquer comme lu ─────────────────────────
/**
 * Corps attendu (optionnel) :
 * { ids: string[] }  → marque seulement ces notifications
 * {}                 → marque TOUT comme lu
 */
router.patch('/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    await markNotificationsRead(req.user!.userId, ids);
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
