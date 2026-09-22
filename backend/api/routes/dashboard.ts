import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { getDashboardData } from '../services/dashboard.service';

const router = Router();

// ── GET /api/dashboard ────────────────────────────────────────────────────────
/**
 * Charge toutes les données du dashboard en une seule requête.
 * Retourne : groupes + soldes, cotisations récentes, retraits en attente, total perso.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await getDashboardData(req.user!.userId);
    res.json(data);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
