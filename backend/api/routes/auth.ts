import { Router, Request, Response } from 'express';
import { register, login, getUserById, updateProfile } from '../services/auth.service';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Corps attendu :
 * { name, email?, phone?, password }
 * email OU phone obligatoire
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!name || !password) {
      res.status(400).json({ error: 'name et password sont requis' });
      return;
    }

    const result = await register({ name, email, phone, password });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
    res.status(400).json({ error: message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Corps attendu :
 * { email?, phone?, password }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body as {
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!password) {
      res.status(400).json({ error: 'password est requis' });
      return;
    }

    const result = await login({ email, phone, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la connexion';
    res.status(401).json({ error: message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
/**
 * Retourne le profil de l'utilisateur connecté.
 * Header : Authorization: Bearer <token>
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }
    res.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
/**
 * Met à jour le profil de l'utilisateur connecté.
 * Corps attendu : { name?, phone?, avatar_url? }
 */
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, phone, avatar_url } = req.body as {
      name?: string;
      phone?: string;
      avatar_url?: string;
    };

    const user = await updateProfile(req.user!.userId, { name, phone, avatar_url });
    res.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
    res.status(400).json({ error: message });
  }
});

export default router;
