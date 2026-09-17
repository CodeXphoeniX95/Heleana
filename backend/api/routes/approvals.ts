import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { submitApproval, listApprovals } from '../services/withdrawals.service';
import { getGroupById } from '../services/groups.service';
import { notifyWithdrawalResolved } from '../services/notifications.service';
import pool from '../services/db';

const router = Router();

// ── GET /api/withdrawals/:withdrawalId/approvals ──────────────────────────────
router.get('/:withdrawalId/approvals', requireAuth, async (req: Request, res: Response) => {
  try {
    const approvals = await listApprovals(req.params.withdrawalId);
    res.json({ approvals });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── POST /api/withdrawals/:withdrawalId/approvals — Voter ─────────────────────
router.post('/:withdrawalId/approvals', requireAuth, async (req: Request, res: Response) => {
  try {
    const { decision, comment } = req.body as {
      decision?: string;
      comment?: string;
    };

    if (!decision || !['approve', 'reject'].includes(decision)) {
      res.status(400).json({ error: 'decision doit être "approve" ou "reject"' });
      return;
    }

    const result = await submitApproval(
      req.params.withdrawalId,
      req.user!.userId,
      decision as 'approve' | 'reject',
      comment
    );

    // Audit
    const auditAction = decision === 'approve' ? 'approve_withdrawal' : 'reject_withdrawal';
    await req.auditLog(auditAction as any, 'withdrawal', req.params.withdrawalId, { decision });

    // Si le statut vient de changer (approved ou rejected), notifier le demandeur
    const { withdrawal } = result;
    if (withdrawal.status === 'approved' || withdrawal.status === 'rejected') {
      const { rows: groupRows } = await pool.query(
        'SELECT currency FROM groups WHERE id = $1',
        [withdrawal.group_id]
      );
      const currency = groupRows[0]?.currency ?? 'FCFA';

      notifyWithdrawalResolved(
        withdrawal.user_id,
        parseFloat(withdrawal.amount),
        currency,
        withdrawal.status as 'approved' | 'rejected',
        withdrawal.id
      ).catch((err) => console.error('Erreur notification résolution retrait:', err));
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
