import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  listObjectives,
  createObjective,
  toggleObjective,
  updateObjective,
  deleteObjective,
} from '../services/objectives.service';
import { assertMember } from '../services/members.service';

const router = Router();

// ── GET /api/groups/:groupId/objectives ───────────────────────────────────────
router.get('/:groupId/objectives', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const objectives = await listObjectives(req.params.groupId);
    res.json({ objectives });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── POST /api/groups/:groupId/objectives ──────────────────────────────────────
router.post('/:groupId/objectives', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, budget, target_date } = req.body as {
      title?: string;
      description?: string;
      budget?: number;
      target_date?: string;
    };

    if (!title) {
      res.status(400).json({ error: 'Le titre est requis' });
      return;
    }

    const objective = await createObjective(
      req.params.groupId,
      req.user!.userId,
      { title, description, budget, target_date }
    );

    await req.auditLog('create_group', 'objective', objective.id, { title });
    res.status(201).json({ objective });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/groups/:groupId/objectives/:objectiveId ────────────────────────
router.patch('/:groupId/objectives/:objectiveId', requireAuth, async (req: Request, res: Response) => {
  try {
    const objective = await updateObjective(
      req.params.objectiveId,
      req.params.groupId,
      req.user!.userId,
      req.body
    );
    res.json({ objective });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/groups/:groupId/objectives/:objectiveId/toggle ─────────────────
router.patch('/:groupId/objectives/:objectiveId/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const objective = await toggleObjective(
      req.params.objectiveId,
      req.params.groupId,
      req.user!.userId
    );
    res.json({ objective });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── DELETE /api/groups/:groupId/objectives/:objectiveId ───────────────────────
router.delete('/:groupId/objectives/:objectiveId', requireAuth, async (req: Request, res: Response) => {
  try {
    await deleteObjective(
      req.params.objectiveId,
      req.params.groupId,
      req.user!.userId
    );
    res.json({ message: 'Objectif supprimé' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
