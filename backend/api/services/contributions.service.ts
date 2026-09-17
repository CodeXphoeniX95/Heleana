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
