import pool from './db';
import { assertMember, assertAdmin } from './members.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ObjectiveRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  budget: string | null;
  target_date: string | null;
  is_achieved: boolean;
  achieved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  creator_name?: string;
  // Calculé : progression (cotisé / budget)
  progress_pct?: number;
}

export interface CreateObjectiveInput {
  title: string;
  description?: string;
  budget?: number;
  target_date?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function listObjectives(groupId: string): Promise<ObjectiveRow[]> {
  const { rows } = await pool.query<ObjectiveRow>(
    `SELECT o.*, u.name AS creator_name
     FROM objectives o
     JOIN users u ON u.id = o.created_by
     WHERE o.group_id = $1
     ORDER BY o.is_achieved ASC, o.created_at DESC`,
    [groupId]
  );
  return rows;
}

export async function createObjective(
  groupId: string,
  userId: string,
  input: CreateObjectiveInput
): Promise<ObjectiveRow> {
  const { title, description, budget, target_date } = input;

  if (!title || title.trim().length < 2) {
    throw new Error('Le titre doit contenir au moins 2 caractères');
  }
  if (budget !== undefined && budget <= 0) {
    throw new Error('Le budget doit être supérieur à 0');
  }

  // Tout membre peut créer un objectif
  await assertMember(groupId, userId);

  const { rows } = await pool.query<ObjectiveRow>(
    `INSERT INTO objectives (group_id, title, description, budget, target_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      groupId,
      title.trim(),
      description?.trim() ?? null,
      budget ?? null,
      target_date ?? null,
      userId,
    ]
  );
  return rows[0];
}

export async function toggleObjective(
  objectiveId: string,
  groupId: string,
  userId: string
): Promise<ObjectiveRow> {
  // Récupérer l'objectif
  const { rows: existing } = await pool.query<ObjectiveRow>(
    'SELECT * FROM objectives WHERE id = $1 AND group_id = $2',
    [objectiveId, groupId]
  );
  if (existing.length === 0) throw new Error('Objectif introuvable');

  const obj = existing[0];

  // Tout membre peut marquer accompli, seul admin peut désaccomplir
  if (obj.is_achieved) {
    await assertAdmin(groupId, userId);
  } else {
    await assertMember(groupId, userId);
  }

  const newState = !obj.is_achieved;
  const { rows } = await pool.query<ObjectiveRow>(
    `UPDATE objectives
     SET is_achieved = $1, achieved_at = $2
     WHERE id = $3
     RETURNING *`,
    [newState, newState ? new Date().toISOString() : null, objectiveId]
  );
  return rows[0];
}

export async function updateObjective(
  objectiveId: string,
  groupId: string,
  userId: string,
  input: Partial<CreateObjectiveInput>
): Promise<ObjectiveRow> {
  // Seul le créateur ou un admin peut modifier
  const { rows: existing } = await pool.query<ObjectiveRow>(
    'SELECT * FROM objectives WHERE id = $1 AND group_id = $2',
    [objectiveId, groupId]
  );
  if (existing.length === 0) throw new Error('Objectif introuvable');

  const obj = existing[0];
  const member = await assertMember(groupId, userId);

  if (obj.created_by !== userId && member.role !== 'admin') {
    throw new Error('Accès refusé : vous devez être le créateur ou admin');
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.title !== undefined)       { fields.push(`title = $${idx++}`);       values.push(input.title.trim()); }
  if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description.trim() || null); }
  if (input.budget !== undefined)      { fields.push(`budget = $${idx++}`);      values.push(input.budget || null); }
  if (input.target_date !== undefined) { fields.push(`target_date = $${idx++}`); values.push(input.target_date || null); }

  if (fields.length === 0) throw new Error('Aucun champ à mettre à jour');

  values.push(objectiveId);
  const { rows } = await pool.query<ObjectiveRow>(
    `UPDATE objectives SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

export async function deleteObjective(
  objectiveId: string,
  groupId: string,
  userId: string
): Promise<void> {
  const { rows: existing } = await pool.query<ObjectiveRow>(
    'SELECT * FROM objectives WHERE id = $1 AND group_id = $2',
    [objectiveId, groupId]
  );
  if (existing.length === 0) throw new Error('Objectif introuvable');

  const obj = existing[0];
  const member = await assertMember(groupId, userId);

  if (obj.created_by !== userId && member.role !== 'admin') {
    throw new Error('Accès refusé : vous devez être le créateur ou admin');
  }

  await pool.query('DELETE FROM objectives WHERE id = $1', [objectiveId]);
}
