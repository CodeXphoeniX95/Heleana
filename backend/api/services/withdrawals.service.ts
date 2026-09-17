import pool from './db';
import { assertMember } from './members.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WithdrawalRow {
  id: string;
  group_id: string;
  user_id: string;
  amount: string;
  reason: string;
  desired_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  resolved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  requester_name?: string;
  requester_phone?: string | null;
  approve_count?: number;
  reject_count?: number;
  total_votes?: number;
  member_count?: number;
}

export interface ApprovalRow {
  id: string;
  withdrawal_id: string;
  user_id: string;
  decision: 'approve' | 'reject';
  comment: string | null;
  created_at: string;
  voter_name?: string;
}

// ── Withdrawals ───────────────────────────────────────────────────────────────

export async function requestWithdrawal(
  groupId: string,
  userId: string,
  input: { amount: number; reason: string; desired_date?: string }
): Promise<WithdrawalRow> {
  const { amount, reason, desired_date } = input;

  if (!amount || amount <= 0) throw new Error('Le montant doit être supérieur à 0');
  if (!reason || reason.trim().length < 3) throw new Error('Le motif est requis');

  await assertMember(groupId, userId);

  const { rows } = await pool.query<WithdrawalRow>(
    `INSERT INTO withdrawals (group_id, user_id, amount, reason, desired_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [groupId, userId, amount, reason.trim(), desired_date ?? null]
  );
  return rows[0];
}

export async function listWithdrawals(
  groupId: string,
  status?: string
): Promise<WithdrawalRow[]> {
  const params: unknown[] = [groupId];
  let statusFilter = '';
  if (status) {
    statusFilter = 'AND w.status = $2';
    params.push(status);
  }

  const { rows } = await pool.query<WithdrawalRow>(
    `SELECT w.*,
            u.name  AS requester_name,
            u.phone AS requester_phone,
            COUNT(CASE WHEN a.decision = 'approve' THEN 1 END)::int AS approve_count,
            COUNT(CASE WHEN a.decision = 'reject'  THEN 1 END)::int AS reject_count,
            COUNT(a.id)::int                                         AS total_votes,
            (SELECT COUNT(*) FROM members m WHERE m.group_id = w.group_id)::int AS member_count
     FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN approvals a ON a.withdrawal_id = w.id
     WHERE w.group_id = $1 ${statusFilter}
     GROUP BY w.id, u.name, u.phone
     ORDER BY w.created_at DESC`,
    params
  );
  return rows;
}

export async function getWithdrawalById(withdrawalId: string): Promise<WithdrawalRow | null> {
  const { rows } = await pool.query<WithdrawalRow>(
    `SELECT w.*,
            u.name AS requester_name,
            COUNT(CASE WHEN a.decision = 'approve' THEN 1 END)::int AS approve_count,
            COUNT(CASE WHEN a.decision = 'reject'  THEN 1 END)::int AS reject_count,
            COUNT(a.id)::int AS total_votes,
            (SELECT COUNT(*) FROM members m WHERE m.group_id = w.group_id)::int AS member_count
     FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN approvals a ON a.withdrawal_id = w.id
     WHERE w.id = $1
     GROUP BY w.id, u.name`,
    [withdrawalId]
  );
  return rows[0] ?? null;
}

/** Marquer un retrait approuvé comme payé (admin seulement) */
export async function markAsPaid(
  withdrawalId: string,
  groupId: string,
  userId: string
): Promise<WithdrawalRow> {
  const { rows: adminRows } = await pool.query(
    `SELECT role FROM members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  if (adminRows.length === 0 || adminRows[0].role !== 'admin') {
    throw new Error('Accès refusé : rôle admin requis');
  }

  const { rows } = await pool.query<WithdrawalRow>(
    `UPDATE withdrawals
     SET status = 'paid', paid_at = NOW()
     WHERE id = $1 AND group_id = $2 AND status = 'approved'
     RETURNING *`,
    [withdrawalId, groupId]
  );
  if (rows.length === 0) throw new Error('Retrait introuvable ou non approuvé');
  return rows[0];
}

// ── Approvals ─────────────────────────────────────────────────────────────────

/**
 * Soumettre un vote sur un retrait.
 * Après chaque vote, réévalue le statut selon la règle du groupe.
 */
export async function submitApproval(
  withdrawalId: string,
  voterId: string,
  decision: 'approve' | 'reject',
  comment?: string
): Promise<{ approval: ApprovalRow; withdrawal: WithdrawalRow }> {
  // Récupérer le retrait + infos du groupe
  const { rows: wRows } = await pool.query(
    `SELECT w.*, g.validation_rule, g.validation_pct
     FROM withdrawals w
     JOIN groups g ON g.id = w.group_id
     WHERE w.id = $1`,
    [withdrawalId]
  );
  if (wRows.length === 0) throw new Error('Demande de retrait introuvable');
  const withdrawal = wRows[0];

  if (withdrawal.status !== 'pending') {
    throw new Error('Cette demande a déjà été traitée');
  }

  // L'auteur de la demande ne peut pas voter sur sa propre demande
  if (withdrawal.user_id === voterId) {
    throw new Error('Vous ne pouvez pas voter sur votre propre demande');
  }

  // Vérifier que le votant est membre du groupe
  await assertMember(withdrawal.group_id, voterId);

  // Vérifier qu'il n'a pas déjà voté
  const { rows: existingVote } = await pool.query(
    'SELECT id FROM approvals WHERE withdrawal_id = $1 AND user_id = $2',
    [withdrawalId, voterId]
  );
  if (existingVote.length > 0) throw new Error('Vous avez déjà voté sur cette demande');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enregistrer le vote
    const { rows: approvalRows } = await client.query<ApprovalRow>(
      `INSERT INTO approvals (withdrawal_id, user_id, decision, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [withdrawalId, voterId, decision, comment ?? null]
    );
    const approval = approvalRows[0];

    // Récupérer les comptages de votes (hors auteur)
    const { rows: voteRows } = await client.query(
      `SELECT
         COUNT(*)::int                                          AS total_eligible,
         COUNT(CASE WHEN a.decision = 'approve' THEN 1 END)::int AS approve_count,
         COUNT(CASE WHEN a.decision = 'reject'  THEN 1 END)::int AS reject_count
       FROM members m
       LEFT JOIN approvals a ON a.withdrawal_id = $1 AND a.user_id = m.user_id
       WHERE m.group_id = $2 AND m.user_id <> $3`,
      [withdrawalId, withdrawal.group_id, withdrawal.user_id]
    );
    const { total_eligible, approve_count, reject_count } = voteRows[0];
    const { validation_rule, validation_pct } = withdrawal;

    let newStatus: string | null = null;

    if (validation_rule === 'unanimity') {
      if (approve_count === total_eligible) newStatus = 'approved';
      else if (reject_count > 0) newStatus = 'rejected';
    } else if (validation_rule === 'majority') {
      const majority = Math.floor(total_eligible / 2) + 1;
      if (approve_count >= majority) newStatus = 'approved';
      else if (reject_count >= majority) newStatus = 'rejected';
    } else if (validation_rule === 'percentage') {
      const threshold = Math.ceil((total_eligible * validation_pct) / 100);
      if (approve_count >= threshold) newStatus = 'approved';
      else if (reject_count > total_eligible - threshold) newStatus = 'rejected';
    }

    let updatedWithdrawal: WithdrawalRow;
    if (newStatus) {
      const { rows: updatedRows } = await client.query<WithdrawalRow>(
        `UPDATE withdrawals
         SET status = $1, resolved_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [newStatus, withdrawalId]
      );
      updatedWithdrawal = updatedRows[0];
    } else {
      const { rows: wCurrent } = await client.query<WithdrawalRow>(
        'SELECT * FROM withdrawals WHERE id = $1',
        [withdrawalId]
      );
      updatedWithdrawal = wCurrent[0];
    }

    await client.query('COMMIT');
    return { approval, withdrawal: updatedWithdrawal };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listApprovals(withdrawalId: string): Promise<ApprovalRow[]> {
  const { rows } = await pool.query<ApprovalRow>(
    `SELECT a.*, u.name AS voter_name
     FROM approvals a
     JOIN users u ON u.id = a.user_id
     WHERE a.withdrawal_id = $1
     ORDER BY a.created_at ASC`,
    [withdrawalId]
  );
  return rows;
}
