import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import {
  requestWithdrawal,
  listWithdrawals,
  getWithdrawalById,
  markAsPaid,
} from '../services/withdrawals.service';
import { assertMember } from '../services/members.service';
import { getGroupById } from '../services/groups.service';
import {
  notifyWithdrawalRequest,
} from '../services/notifications.service';

const router = Router({ mergeParams: true });

// ── GET /api/groups/:groupId/withdrawals ──────────────────────────────────────
router.get('/:groupId/withdrawals', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const { status } = req.query as { status?: string };
    const withdrawals = await listWithdrawals(req.params.groupId, status);
    res.json({ withdrawals });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── POST /api/groups/:groupId/withdrawals ─────────────────────────────────────
router.post('/:groupId/withdrawals', requireAuth, async (req: Request, res: Response) => {
  try {
    const { amount, reason, desired_date } = req.body as {
      amount?: number;
      reason?: string;
      desired_date?: string;
    };

    if (!amount || !reason) {
      res.status(400).json({ error: 'amount et reason sont requis' });
      return;
    }

    const withdrawal = await requestWithdrawal(
      req.params.groupId,
      req.user!.userId,
      { amount, reason, desired_date }
    );

    // Audit
    await req.auditLog('request_withdrawal', 'withdrawal', withdrawal.id, {
      group_id: req.params.groupId,
      amount,
      reason,
    });

    // Notification asynchrone
    getGroupById(req.params.groupId)
      .then((group) => {
        if (!group) return;
        return notifyWithdrawalRequest(
          req.params.groupId,
          req.user!.name,
          amount,
          group.currency,
          withdrawal.id,
          req.user!.userId
        );
      })
      .catch((err) => console.error('Erreur notification retrait:', err));

    res.status(201).json({ withdrawal });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// ── GET /api/groups/:groupId/withdrawals/:withdrawalId ───────────────────────
router.get('/:groupId/withdrawals/:withdrawalId', requireAuth, async (req: Request, res: Response) => {
  try {
    await assertMember(req.params.groupId, req.user!.userId);
    const withdrawal = await getWithdrawalById(req.params.withdrawalId);
    if (!withdrawal) { res.status(404).json({ error: 'Retrait introuvable' }); return; }
    res.json({ withdrawal });
  } catch (err) {
    res.status(403).json({ error: (err as Error).message });
  }
});

// ── PATCH /api/groups/:groupId/withdrawals/:withdrawalId/pay ─────────────────
router.patch('/:groupId/withdrawals/:withdrawalId/pay', requireAuth, async (req: Request, res: Response) => {
  try {
    const withdrawal = await markAsPaid(
      req.params.withdrawalId,
      req.params.groupId,
      req.user!.userId
    );

    await req.auditLog('mark_paid', 'withdrawal', withdrawal.id, {
      group_id: req.params.groupId,
    });

    res.json({ withdrawal });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
