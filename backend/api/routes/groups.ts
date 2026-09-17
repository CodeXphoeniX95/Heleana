import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  createGroup,
  getGroupById,
  getUserGroups,
  updateGroup,
  deleteGroup,
  joinGroup,
  getGroupDashboard,
} from '../services/groups.service';
import { assertMember } from '../services/members.service';

const router = Router();

// ── GET /api/groups ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const groups = await getUserGroups(req.user!.userId);
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /api/groups ──────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const group = await createGroup(req.user!.userId, req.body);
    await req.auditLog('create_group', 'group', group.id, { name: group.name });
    res.status(201).json({ group });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── POST /api/groups/join ─────────────────────────────────────────────────────
router.post('/join', requireAuth, async (req: Request, res: Response) => {
  try {
    const { invite_code } = req.body as { invite_code?: string };
    if (!invite_code) {
      res.status(400).json({ error: 'invite_code est requis' });
      return;
    }
    const group = await joinGroup(invite_code, req.user!.userId);
    await req.auditLog('join_group', 'group', group.id, { invite_code });
    res.json({ group });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── GET /api/groups/:groupId ──────────────────────────────────────────────────
router.get('/:groupId', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const group = await getGroupById(req.params.groupId);
    if (!group) { res.status(404).json({ error: 'Groupe introuvable' }); return; }
    res.json({ group });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── GET /api/groups/:groupId/dashboard ───────────────────────────────────────
router.get('/:groupId/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const dashboard = await getGroupDashboard(req.params.groupId);
    res.json({ dashboard });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/groups/:groupId ────────────────────────────────────────────────
router.patch('/:groupId', requireAuth, async (req: Request, res: Response) => {
  try {
    const group = await updateGroup(req.params.groupId, req.user!.userId, req.body);
    await req.auditLog('update_group', 'group', group.id, req.body as Record<string, unknown>);
    res.json({ group });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── DELETE /api/groups/:groupId ───────────────────────────────────────────────
router.delete('/:groupId', requireAuth, async (req: Request, res: Response) => {
  try {
    await deleteGroup(req.params.groupId, req.user!.userId);
    await req.auditLog('delete_group', 'group', req.params.groupId, {});
    res.json({ message: 'Groupe supprimé' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
