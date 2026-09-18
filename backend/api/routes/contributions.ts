import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  recordContribution,
  listContributions,
  getContributionSummary,
  updateContribution,
  deleteContribution,
  getGroupStats,
} from '../services/contributions.service';
import { assertMember } from '../services/members.service';
import { getGroupById } from '../services/groups.service';
import { notifyNewContribution } from '../services/notifications.service';

const router = Router({ mergeParams: true });

// ── GET /api/groups/:groupId/contributions ────────────────────────────────────
router.get('/:groupId/contributions', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const { user_id, limit, offset } = req.query as {
      user_id?: string;
      limit?: string;
      offset?: string;
    };
    const contributions = await listContributions(req.params.groupId, {
      userId: user_id,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json({ contributions });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── GET /api/groups/:groupId/contributions/summary ───────────────────────────
router.get('/:groupId/contributions/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const summary = await getContributionSummary(req.params.groupId);
    res.json({ summary });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── POST /api/groups/:groupId/contributions ───────────────────────────────────
router.post('/:groupId/contributions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user_id, amount, payment_method, note } = req.body as {
      user_id?: string;
      amount?: number;
      payment_method?: string;
      note?: string;
    };

    if (!user_id || !amount) {
      res.status(400).json({ error: 'user_id et amount sont requis' });
      return;
    }

    const requesterMember = await assertMember(req.params.groupId, req.user!.userId);
    if (requesterMember.role !== 'admin' && user_id !== req.user!.userId) {
      res.status(403).json({ error: 'Seul un admin peut enregistrer une cotisation pour un autre membre' });
      return;
    }

    const contribution = await recordContribution(
      req.params.groupId,
      req.user!.userId,
      { user_id, amount, payment_method, note }
    );

    // Audit
    await req.auditLog('record_contribution', 'contribution', contribution.id, {
      group_id: req.params.groupId,
      user_id,
      amount,
    });

    // Notification asynchrone (non bloquante)
    getGroupById(req.params.groupId)
      .then((group) => {
        if (!group) return;
        const memberName = requesterMember.role === 'admin' && user_id !== req.user!.userId
          ? (requesterMember.name ?? req.user!.name)  // enregistré par admin pour un autre
          : req.user!.name;
        return notifyNewContribution(
          req.params.groupId,
          memberName,
          amount,
          group.currency,
          req.user!.userId
        );
      })
      .catch((err) => console.error('Erreur notification contribution:', err));

    res.status(201).json({ contribution });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;

// ── GET /api/groups/:groupId/stats ────────────────────────────────────────────
router.get('/:groupId/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const stats = await getGroupStats(req.params.groupId);
    res.json({ stats });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/groups/:groupId/contributions/:contributionId ──────────────────
router.patch('/:groupId/contributions/:contributionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { amount, payment_method, note } = req.body as {
      amount?: number;
      payment_method?: string;
      note?: string;
    };
    const contribution = await updateContribution(
      req.params.contributionId,
      req.params.groupId,
      req.user!.userId,
      { amount, payment_method, note }
    );
    await req.auditLog('record_contribution', 'contribution', contribution.id, {
      action: 'update', group_id: req.params.groupId,
    });
    res.json({ contribution });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── DELETE /api/groups/:groupId/contributions/:contributionId ─────────────────
router.delete('/:groupId/contributions/:contributionId', requireAuth, async (req: Request, res: Response) => {
  try {
    await deleteContribution(
      req.params.contributionId,
      req.params.groupId,
      req.user!.userId
    );
    await req.auditLog('record_contribution', 'contribution', req.params.contributionId, {
      action: 'delete', group_id: req.params.groupId,
    });
    res.json({ message: 'Cotisation supprimée' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
