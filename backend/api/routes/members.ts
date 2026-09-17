import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  listMembers,
  addMember,
  removeMember,
  changeMemberRole,
  assertAdmin,
} from '../services/members.service';

const router = Router({ mergeParams: true });

// ── GET /api/groups/:groupId/members ─────────────────────────────────────────
router.get('/:groupId/members', requireAuth, async (req: Request, res: Response) => {
  try {
    // Tout membre peut voir la liste
    const members = await listMembers(req.params.groupId);
    res.json({ members });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── POST /api/groups/:groupId/members — Ajouter un membre (admin) ────────────
router.post('/:groupId/members', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertAdmin(req.params.groupId, req.user!.userId);
    const { user_id, role } = req.body as { user_id?: string; role?: 'admin' | 'member' };
    if (!user_id) { res.status(400).json({ error: 'user_id est requis' }); return; }
    const member = await addMember(req.params.groupId, user_id, role);
    res.status(201).json({ member });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── DELETE /api/groups/:groupId/members/:userId ───────────────────────────────
router.delete('/:groupId/members/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    // Seul un admin peut retirer un autre membre
    // Un membre peut quitter lui-même le groupe (userId == req.user.userId)
    const { groupId, userId } = req.params;
    if (userId !== req.user!.userId) {
      await assertAdmin(groupId, req.user!.userId);
    }
    await removeMember(groupId, userId, req.user!.userId);
    res.json({ message: 'Membre retiré du groupe' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/groups/:groupId/members/:userId/role ───────────────────────────
router.patch('/:groupId/members/:userId/role', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertAdmin(req.params.groupId, req.user!.userId);
    const { role } = req.body as { role?: 'admin' | 'member' };
    if (!role || !['admin', 'member'].includes(role)) {
      res.status(400).json({ error: 'role doit être "admin" ou "member"' });
      return;
    }
    const member = await changeMemberRole(req.params.groupId, req.params.userId, role);
    res.json({ member });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
