import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import pool from '../services/db';

const router = Router();

// ── POST /api/devices — Enregistrer / mettre à jour un token FCM ──────────────
/**
 * Corps attendu :
 * { fcm_token: string, platform?: 'android' | 'ios' }
 *
 * Utilise un UPSERT sur fcm_token pour éviter les doublons.
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fcm_token, platform = 'android' } = req.body as {
      fcm_token?: string;
      platform?: string;
    };

    if (!fcm_token) {
      res.status(400).json({ error: 'fcm_token est requis' });
      return;
    }

    if (!['android', 'ios'].includes(platform)) {
      res.status(400).json({ error: 'platform doit être "android" ou "ios"' });
      return;
    }

    // Upsert : si le token existe déjà, on met à jour user_id + platform
    const { rows } = await pool.query(
      `INSERT INTO devices (user_id, fcm_token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (fcm_token)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     platform = EXCLUDED.platform,
                     updated_at = NOW()
       RETURNING id, user_id, fcm_token, platform, created_at`,
      [req.user!.userId, fcm_token, platform]
    );

    res.status(201).json({ device: rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── DELETE /api/devices/:fcm_token — Supprimer un token FCM ──────────────────
router.delete('/:fcm_token', requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query(
      'DELETE FROM devices WHERE fcm_token = $1 AND user_id = $2',
      [req.params.fcm_token, req.user!.userId]
    );
    res.json({ message: 'Token FCM supprimé' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── GET /api/devices — Lister les appareils de l'utilisateur ─────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, fcm_token, platform, created_at FROM devices WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user!.userId]
    );
    res.json({ devices: rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
