import pool from './db';
import { assertMember } from './members.service';

export interface ContributionRow {
  id: string;
  group_id: string;
  user_id: string;
  amount: string;
  payment_method: string;
  recorded_by: string;
  note: string | null;
  created_at: string;
  // Joined
  member_name?: string;
  recorder_name?: string;
}

export interface RecordContributionInput {
  user_id: string;          // Membre qui cotise
  amount: number;
  payment_method?: string;  // 'cash' | 'tmoney' | 'flooz' | 'bank'
  note?: string;
}

const ALLOWED_METHODS = ['cash', 'tmoney', 'flooz', 'bank'];

export async function recordContribution(
  groupId: string,
  recorderId: string,
  input: RecordContributionInput
): Promise<ContributionRow> {
  const { user_id, amount, payment_method = 'cash', note } = input;

  if (!amount || amount <= 0) throw new Error('Le montant doit être supérieur à 0');
  if (!ALLOWED_METHODS.includes(payment_method)) {
    throw new Error(`Moyen de paiement invalide. Valeurs acceptées : ${ALLOWED_METHODS.join(', ')}`);
  }

  // Le membre ciblé doit appartenir au groupe
  await assertMember(groupId, user_id);

  const { rows } = await pool.query<ContributionRow>(
    `INSERT INTO contributions (group_id, user_id, amount, payment_method, recorded_by, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [groupId, user_id, amount, payment_method, recorderId, note ?? null]
  );
  return rows[0];
}

export async function listContributions(
  groupId: string,
  filters: { userId?: string; limit?: number; offset?: number } = {}
): Promise<ContributionRow[]> {
  const { userId, limit = 50, offset = 0 } = filters;
  const params: unknown[] = [groupId, limit, offset];
  let whereClause = '';

  if (userId) {
    whereClause = 'AND c.user_id = $4';
    params.push(userId);
  }

  const { rows } = await pool.query<ContributionRow>(
    `SELECT c.*,
            u.name  AS member_name,
            r.name  AS recorder_name
     FROM contributions c
     JOIN users u ON u.id = c.user_id
     JOIN users r ON r.id = c.recorded_by
     WHERE c.group_id = $1 ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $2 OFFSET $3`,
    params
  );
  return rows;
}

export async function getContributionSummary(
  groupId: string
): Promise<{ user_id: string; name: string; total: string; count: number }[]> {
  const { rows } = await pool.query(
    `SELECT c.user_id, u.name,
            SUM(c.amount)::text AS total,
            COUNT(*)::int       AS count
     FROM contributions c
     JOIN users u ON u.id = c.user_id
     WHERE c.group_id = $1
     GROUP BY c.user_id, u.name
     ORDER BY SUM(c.amount) DESC`,
    [groupId]
  );
  return rows;
}

export async function updateContribution(
  contributionId: string,
  groupId: string,
  requesterId: string,
  data: { amount?: number; payment_method?: string; note?: string }
): Promise<ContributionRow> {
  // Seul admin peut modifier
  const { rows: adminRows } = await pool.query(
    `SELECT role FROM members WHERE group_id = $1 AND user_id = $2`,
    [groupId, requesterId]
  );
  if (adminRows.length === 0 || adminRows[0].role !== 'admin') {
    throw new Error('Accès refusé : rôle admin requis');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.amount !== undefined) {
    if (data.amount <= 0) throw new Error('Le montant doit être > 0');
    fields.push(`amount = $${idx++}`);
    values.push(data.amount);
  }
  if (data.payment_method !== undefined) {
    if (!ALLOWED_METHODS.includes(data.payment_method)) {
      throw new Error(`Moyen de paiement invalide`);
    }
    fields.push(`payment_method = $${idx++}`);
    values.push(data.payment_method);
  }
  if (data.note !== undefined) {
    fields.push(`note = $${idx++}`);
    values.push(data.note || null);
  }

  if (fields.length === 0) throw new Error('Aucun champ à modifier');

  values.push(contributionId, groupId);
  const { rows } = await pool.query<ContributionRow>(
    `UPDATE contributions SET ${fields.join(', ')}
     WHERE id = $${idx} AND group_id = $${idx + 1}
     RETURNING *`,
    values
  );
  if (rows.length === 0) throw new Error('Cotisation introuvable');
  return rows[0];
}

export async function deleteContribution(
  contributionId: string,
  groupId: string,
  requesterId: string
): Promise<void> {
  // Seul admin peut supprimer
  const { rows: adminRows } = await pool.query(
    `SELECT role FROM members WHERE group_id = $1 AND user_id = $2`,
    [groupId, requesterId]
  );
  if (adminRows.length === 0 || adminRows[0].role !== 'admin') {
    throw new Error('Accès refusé : rôle admin requis');
  }

  const { rowCount } = await pool.query(
    'DELETE FROM contributions WHERE id = $1 AND group_id = $2',
    [contributionId, groupId]
  );
  if (!rowCount || rowCount === 0) throw new Error('Cotisation introuvable');
}

export async function getGroupStats(groupId: string) {
  // Stats par mois (12 derniers mois)
  const { rows: monthly } = await pool.query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
       SUM(amount)::float                                   AS total,
       COUNT(*)::int                                        AS count
     FROM contributions
     WHERE group_id = $1
       AND created_at >= NOW() - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY DATE_TRUNC('month', created_at) ASC`,
    [groupId]
  );

  // Top membres
  const { rows: topMembers } = await pool.query(
    `SELECT
       u.id,
       u.name,
       SUM(c.amount)::float  AS total,
       COUNT(c.id)::int      AS count,
       AVG(c.amount)::float  AS average
     FROM contributions c
     JOIN users u ON u.id = c.user_id
     WHERE c.group_id = $1
     GROUP BY u.id, u.name
     ORDER BY SUM(c.amount) DESC
     LIMIT 5`,
    [groupId]
  );

  // Moyenne mensuelle globale
  const { rows: avgRows } = await pool.query(
    `SELECT
       AVG(monthly_total)::float AS monthly_average
     FROM (
       SELECT SUM(amount) AS monthly_total
       FROM contributions
       WHERE group_id = $1
       GROUP BY DATE_TRUNC('month', created_at)
     ) t`,
    [groupId]
  );

  // Total général
  const { rows: totalRows } = await pool.query(
    `SELECT
       COUNT(*)::int        AS contribution_count,
       SUM(amount)::float   AS total_contributed,
       AVG(amount)::float   AS average_per_contribution
     FROM contributions
     WHERE group_id = $1`,
    [groupId]
  );

  return {
    monthly,
    top_members: topMembers,
    monthly_average: avgRows[0]?.monthly_average ?? 0,
    ...totalRows[0],
  };
}
