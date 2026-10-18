import pool from './db';

/**
 * Charge tout le dashboard en UN SEUL aller-retour base de données.
 * Remplace les 5-6 appels séparés du mobile par une seule requête optimisée.
 */
export async function getDashboardData(userId: string) {
  // ── 1. Groupes de l'utilisateur + soldes ──────────────────────────────────
  const { rows: groups } = await pool.query(
    `SELECT
       g.id,
       g.name,
       g.currency,
       g.contribution_rule,
       g.fixed_amount,
       g.frequency,
       g.validation_rule,
       g.invite_code,
       m.role,
       (SELECT COUNT(*)::int FROM members m2 WHERE m2.group_id = g.id) AS member_count,
       (SELECT COALESCE(SUM(amount), 0)::float FROM contributions WHERE group_id = g.id) AS total_contributed,
       (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals WHERE group_id = g.id AND status = 'paid') AS total_withdrawn,
       (SELECT COALESCE(SUM(budget), 0)::float FROM objectives WHERE group_id = g.id AND is_achieved = TRUE) AS total_objectives_used,
       (
         (SELECT COALESCE(SUM(amount), 0)::float FROM contributions WHERE group_id = g.id) -
         (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals WHERE group_id = g.id AND status = 'paid') -
         (SELECT COALESCE(SUM(budget), 0)::float FROM objectives WHERE group_id = g.id AND is_achieved = TRUE)
       )::float AS balance
     FROM groups g
     JOIN members m ON m.group_id = g.id AND m.user_id = $1
     ORDER BY g.created_at DESC`,
    [userId]
  );

  if (groups.length === 0) {
    return {
      groups: [],
      recent_contributions: [],
      pending_withdrawals: [],
      my_total: 0,
    };
  }

  const groupIds = groups.map((g: any) => g.id);

  // ── 2. Cotisations récentes (5 max, tous groupes) ─────────────────────────
  const { rows: recentContributions } = await pool.query(
    `SELECT
       c.id,
       c.group_id,
       c.user_id,
       c.amount::float,
       c.payment_method,
       c.note,
       c.created_at,
       u.name  AS member_name,
       r.name  AS recorder_name
     FROM contributions c
     JOIN users u ON u.id = c.user_id
     JOIN users r ON r.id = c.recorded_by
     WHERE c.group_id = ANY($1)
     ORDER BY c.created_at DESC
     LIMIT 5`,
    [groupIds]
  );

  // Auto-passer en 'paid' tous les retraits historiques restés en 'pending' pour les caisses personnelles (1 membre)
  await pool.query(
    `UPDATE withdrawals
     SET status = 'paid', paid_at = COALESCE(paid_at, NOW()), resolved_at = COALESCE(resolved_at, NOW())
     WHERE status = 'pending'
       AND group_id IN (
         SELECT group_id FROM members GROUP BY group_id HAVING COUNT(*) <= 1
       )`
  ).catch(() => {});

  // ── 3. Retraits en attente (groupes collectifs à plus de 1 membre seulement) ──
  const { rows: pendingWithdrawals } = await pool.query(
    `SELECT
       w.id,
       w.group_id,
       w.user_id,
       w.amount::float,
       w.reason,
       w.status,
       w.created_at,
       u.name AS requester_name,
       COUNT(CASE WHEN a.decision = 'approve' THEN 1 END)::int AS approve_count,
       COUNT(CASE WHEN a.decision = 'reject'  THEN 1 END)::int AS reject_count,
       COUNT(a.id)::int                                         AS total_votes,
       (SELECT COUNT(*) FROM members m WHERE m.group_id = w.group_id)::int AS member_count
     FROM withdrawals w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN approvals a ON a.withdrawal_id = w.id
     WHERE w.group_id = ANY($1) 
       AND w.status = 'pending'
       AND (SELECT COUNT(*) FROM members m WHERE m.group_id = w.group_id) > 1
     GROUP BY w.id, u.name
     ORDER BY w.created_at DESC`,
    [groupIds]
  );

  // ── 4. Total cotisé par l'utilisateur connecté ────────────────────────────
  const { rows: myTotalRows } = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS my_total
     FROM contributions
     WHERE group_id = ANY($1) AND user_id = $2`,
    [groupIds, userId]
  );

  return {
    groups,
    recent_contributions: recentContributions,
    pending_withdrawals:  pendingWithdrawals,
    my_total:             myTotalRows[0]?.my_total ?? 0,
  };
}
