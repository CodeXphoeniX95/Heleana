import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { getGroupDetail } from '../services/group_detail.service';

const router = Router();

// ── GET /api/groups/:groupId/detail ──────────────────────────────────────────
/**
 * Charge tout le détail d'un groupe en un seul appel.
 * Retourne : groupe, dashboard, membres, cotisations récentes, retraits.
 */
router.get('/:groupId/detail', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await getGroupDetail(req.params.groupId, req.user!.userId);
    res.json(data);
  } catch (err) {
    const status = (err as Error).message.includes('Accès') ? 403 : 500;
    res.status(status).json({ error: (err as Error).message });
  }
});

export default router;
