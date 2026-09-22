import pool from './db';

/**
 * Charge tout le détail d'un groupe en UN SEUL aller-retour DB.
 * Remplace : get(group) + dashboard + members + contributions(5) + withdrawals
 */
export async function getGroupDetail(groupId: string, userId: string) {
  // Vérifier membership
  const { rows: memberCheck } = await pool.query(
    `SELECT role FROM members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  if (memberCheck.length === 0) throw new Error('Accès refusé');

  // Tout en parallèle — une seule connexion, requêtes indépendantes
  const [groupRes, dashRes, membersRes, contribsRes, withdrawalsRes] = await Promise.all([
    // Groupe
    pool.query(
      `SELECT * FROM groups WHERE id = $1`,
      [groupId]
    ),
    // Dashboard (soldes)
    pool.query(
      `SELECT
         (SELECT COALESCE(SUM(amount), 0)::float FROM contributions WHERE group_id = $1) AS total_contributed,
         (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals WHERE group_id = $1 AND status = 'paid') AS total_withdrawn,
         (SELECT COALESCE(SUM(budget), 0)::float FROM objectives WHERE group_id = $1 AND is_achieved = TRUE) AS total_objectives_used,
         (
           (SELECT COALESCE(SUM(amount), 0)::float FROM contributions WHERE group_id = $1) -
           (SELECT COALESCE(SUM(amount), 0)::float FROM withdrawals WHERE group_id = $1 AND status = 'paid') -
           (SELECT COALESCE(SUM(budget), 0)::float FROM objectives WHERE group_id = $1 AND is_achieved = TRUE)
         )::float AS balance`,
      [groupId]
    ),
    // Membres
    pool.query(
      `SELECT m.*, u.name, u.email, u.phone, u.avatar_url
       FROM members m JOIN users u ON u.id = m.user_id
       WHERE m.group_id = $1
       ORDER BY m.role DESC, m.joined_at ASC`,
      [groupId]
    ),
    // 10 dernières cotisations
    pool.query(
      `SELECT c.*, u.name AS member_name, r.name AS recorder_name
       FROM contributions c
       JOIN users u ON u.id = c.user_id
       JOIN users r ON r.id = c.recorded_by
       WHERE c.group_id = $1
       ORDER BY c.created_at DESC LIMIT 10`,
      [groupId]
    ),
    // Tous les retraits
    pool.query(
      `SELECT w.*, u.name AS requester_name, u.phone AS requester_phone,
         COUNT(CASE WHEN a.decision = 'approve' THEN 1 END)::int AS approve_count,
         COUNT(CASE WHEN a.decision = 'reject'  THEN 1 END)::int AS reject_count,
         COUNT(a.id)::int AS total_votes,
         (SELECT COUNT(*) FROM members m WHERE m.group_id = w.group_id)::int AS member_count
       FROM withdrawals w
       JOIN users u ON u.id = w.user_id
       LEFT JOIN approvals a ON a.withdrawal_id = w.id
       WHERE w.group_id = $1
       GROUP BY w.id, u.name, u.phone
       ORDER BY w.created_at DESC`,
      [groupId]
    ),
  ]);

  return {
    group:        groupRes.rows[0]   ?? null,
    dashboard:    dashRes.rows[0]    ?? { total_contributed: 0, total_withdrawn: 0, balance: 0 },
    members:      membersRes.rows,
    contributions:contribsRes.rows,
    withdrawals:  withdrawalsRes.rows,
    my_role:      memberCheck[0].role,
  };
}
