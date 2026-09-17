import pool from './db';
import { randomBytes } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  contribution_rule: 'fixed' | 'free';
  fixed_amount: string | null;
  frequency: string;
  validation_rule: string;
  validation_pct: number;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  currency?: string;
  contribution_rule?: 'fixed' | 'free';
  fixed_amount?: number;
  frequency?: string;
  validation_rule?: string;
  validation_pct?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  return randomBytes(5).toString('hex').toUpperCase(); // ex: "A3F7B2C9D1"
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function createGroup(
  userId: string,
  input: CreateGroupInput
): Promise<GroupRow> {
  const {
    name,
    description,
    currency = 'FCFA',
    contribution_rule = 'fixed',
    fixed_amount,
    frequency = 'monthly',
    validation_rule = 'majority',
    validation_pct = 51,
  } = input;

  if (!name || name.trim().length < 2) throw new Error('Le nom du groupe doit contenir au moins 2 caractères');
  if (contribution_rule === 'fixed' && (!fixed_amount || fixed_amount <= 0)) {
    throw new Error('Un montant fixe valide est requis pour la règle "fixed"');
  }

  let invite_code = generateInviteCode();
  // Garantir l'unicité du code d'invitation
  let attempt = 0;
  while (attempt < 5) {
    const { rows } = await pool.query('SELECT id FROM groups WHERE invite_code = $1', [invite_code]);
    if (rows.length === 0) break;
    invite_code = generateInviteCode();
    attempt++;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query<GroupRow>(
      `INSERT INTO groups
         (name, description, currency, contribution_rule, fixed_amount, frequency,
          validation_rule, validation_pct, invite_code, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name.trim(),
        description ?? null,
        currency,
        contribution_rule,
        contribution_rule === 'fixed' ? fixed_amount : null,
        frequency,
        validation_rule,
        validation_pct,
        invite_code,
        userId,
      ]
    );

    const group = rows[0];

    // Ajouter le créateur comme admin
    await client.query(
      `INSERT INTO members (group_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [group.id, userId]
    );

    await client.query('COMMIT');
    return group;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getGroupById(groupId: string): Promise<GroupRow | null> {
  const { rows } = await pool.query<GroupRow>(
    'SELECT * FROM groups WHERE id = $1',
    [groupId]
  );
  return rows[0] ?? null;
}

export async function getUserGroups(userId: string): Promise<(GroupRow & { role: string; member_count: number; total_contributed: string })[]> {
  const { rows } = await pool.query(
    `SELECT g.*,
            m.role,
            COUNT(DISTINCT m2.id)::int        AS member_count,
            COALESCE(SUM(c.amount), 0)::text  AS total_contributed
     FROM groups g
     JOIN members m  ON m.group_id = g.id AND m.user_id = $1
     JOIN members m2 ON m2.group_id = g.id
     LEFT JOIN contributions c ON c.group_id = g.id
     GROUP BY g.id, m.role
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateGroup(
  groupId: string,
  userId: string,
  input: Partial<CreateGroupInput>
): Promise<GroupRow> {
  // Vérifier que l'utilisateur est admin du groupe
  const { rows: memberRows } = await pool.query(
    `SELECT role FROM members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  if (memberRows.length === 0 || memberRows[0].role !== 'admin') {
    throw new Error('Accès refusé : vous devez être admin du groupe');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed: (keyof CreateGroupInput)[] = [
    'name', 'description', 'currency', 'contribution_rule',
    'fixed_amount', 'frequency', 'validation_rule', 'validation_pct',
  ];

  for (const key of allowed) {
    if (input[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(input[key]);
    }
  }

  if (fields.length === 0) throw new Error('Aucun champ à mettre à jour');

  values.push(groupId);
  const { rows } = await pool.query<GroupRow>(
    `UPDATE groups SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

export async function deleteGroup(groupId: string, userId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT role FROM members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  if (rows.length === 0 || rows[0].role !== 'admin') {
    throw new Error('Accès refusé : vous devez être admin du groupe');
  }
  await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
}

/** Rejoindre un groupe via code d'invitation */
export async function joinGroup(
  inviteCode: string,
  userId: string
): Promise<GroupRow> {
  const { rows: groupRows } = await pool.query<GroupRow>(
    'SELECT * FROM groups WHERE invite_code = $1',
    [inviteCode.toUpperCase()]
  );
  if (groupRows.length === 0) throw new Error('Code d\'invitation invalide');

  const group = groupRows[0];

  const { rows: existing } = await pool.query(
    'SELECT id FROM members WHERE group_id = $1 AND user_id = $2',
    [group.id, userId]
  );
  if (existing.length > 0) throw new Error('Vous êtes déjà membre de ce groupe');

  await pool.query(
    `INSERT INTO members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
    [group.id, userId]
  );

  return group;
}

/** Dashboard d'un groupe : solde, total cotisé, total retiré */
export async function getGroupDashboard(groupId: string) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(c.amount), 0)                              AS total_contributed,
       COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.amount ELSE 0 END), 0) AS total_withdrawn,
       COALESCE(SUM(c.amount), 0)
         - COALESCE(SUM(CASE WHEN w.status = 'paid' THEN w.amount ELSE 0 END), 0) AS balance
     FROM groups g
     LEFT JOIN contributions c ON c.group_id = g.id
     LEFT JOIN withdrawals   w ON w.group_id = g.id
     WHERE g.id = $1`,
    [groupId]
  );
  return rows[0];
}
