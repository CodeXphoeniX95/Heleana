import pool from './db';

export interface MemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  // Joined from users
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

/** Vérifie qu'un utilisateur est membre d'un groupe (n'importe quel rôle) */
export async function assertMember(groupId: string, userId: string): Promise<MemberRow> {
  const { rows } = await pool.query<MemberRow>(
    `SELECT m.*, u.name, u.email, u.phone, u.avatar_url
     FROM members m JOIN users u ON u.id = m.user_id
     WHERE m.group_id = $1 AND m.user_id = $2`,
    [groupId, userId]
  );
  if (rows.length === 0) throw new Error('Accès refusé : vous n\'êtes pas membre de ce groupe');
  return rows[0];
}

/** Vérifie que l'utilisateur est admin du groupe */
export async function assertAdmin(groupId: string, userId: string): Promise<void> {
  const member = await assertMember(groupId, userId);
  if (member.role !== 'admin') throw new Error('Accès refusé : rôle admin requis');
}

/** Liste tous les membres d'un groupe */
export async function listMembers(groupId: string): Promise<MemberRow[]> {
  const { rows } = await pool.query<MemberRow>(
    `SELECT m.*, u.name, u.email, u.phone, u.avatar_url
     FROM members m JOIN users u ON u.id = m.user_id
     WHERE m.group_id = $1
     ORDER BY m.role DESC, m.joined_at ASC`,
    [groupId]
  );
  return rows;
}

/** Ajouter un membre directement par userId (admin seulement) */
export async function addMember(
  groupId: string,
  targetUserId: string,
  role: 'admin' | 'member' = 'member'
): Promise<MemberRow> {
  // Vérifier que l'utilisateur cible existe
  const { rows: userRows } = await pool.query(
    'SELECT id FROM users WHERE id = $1',
    [targetUserId]
  );
  if (userRows.length === 0) throw new Error('Utilisateur introuvable');

  // Vérifier qu'il n'est pas déjà membre
  const { rows: existingRows } = await pool.query(
    'SELECT id FROM members WHERE group_id = $1 AND user_id = $2',
    [groupId, targetUserId]
  );
  if (existingRows.length > 0) throw new Error('Cet utilisateur est déjà membre du groupe');

  await pool.query(
    `INSERT INTO members (group_id, user_id, role) VALUES ($1, $2, $3)`,
    [groupId, targetUserId, role]
  );

  const { rows } = await pool.query<MemberRow>(
    `SELECT m.*, u.name, u.email, u.phone, u.avatar_url
     FROM members m JOIN users u ON u.id = m.user_id
     WHERE m.group_id = $1 AND m.user_id = $2`,
    [groupId, targetUserId]
  );
  return rows[0];
}

/** Retirer un membre du groupe (admin seulement, ne peut pas se retirer lui-même si seul admin) */
export async function removeMember(
  groupId: string,
  targetUserId: string,
  requesterId: string
): Promise<void> {
  // Empêcher de supprimer le seul admin
  const { rows: admins } = await pool.query(
    `SELECT user_id FROM members WHERE group_id = $1 AND role = 'admin'`,
    [groupId]
  );
  if (admins.length === 1 && admins[0].user_id === targetUserId) {
    throw new Error('Impossible de retirer le seul admin du groupe');
  }

  const { rowCount } = await pool.query(
    'DELETE FROM members WHERE group_id = $1 AND user_id = $2',
    [groupId, targetUserId]
  );
  if (!rowCount || rowCount === 0) throw new Error('Membre introuvable dans ce groupe');
}

/** Changer le rôle d'un membre */
export async function changeMemberRole(
  groupId: string,
  targetUserId: string,
  newRole: 'admin' | 'member'
): Promise<MemberRow> {
  const { rows } = await pool.query<MemberRow>(
    `UPDATE members SET role = $1
     WHERE group_id = $2 AND user_id = $3
     RETURNING *`,
    [newRole, groupId, targetUserId]
  );
  if (rows.length === 0) throw new Error('Membre introuvable dans ce groupe');
  return rows[0];
}
