import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  iat?: number;
  exp?: number;
}

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant dans les variables d\'environnement');
  return secret;
}

function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Inscription d'un nouvel utilisateur.
 * Renvoie le token JWT et les informations publiques de l'utilisateur.
 */
export async function register(input: RegisterInput): Promise<{ token: string; user: UserRow }> {
  const { name, email, phone, password } = input;

  // Validation minimale
  if (!email && !phone) {
    throw new Error('Un email ou un numéro de téléphone est requis');
  }
  if (!name || name.trim().length < 2) {
    throw new Error('Le nom doit contenir au moins 2 caractères');
  }
  if (!password || password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères');
  }

  // Vérifier unicité email/téléphone
  if (email) {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (rows.length > 0) throw new Error('Cet email est déjà utilisé');
  }
  if (phone) {
    const { rows } = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (rows.length > 0) throw new Error('Ce numéro de téléphone est déjà utilisé');
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, phone, name, avatar_url, created_at`,
    [name.trim(), email ? email.toLowerCase() : null, phone ?? null, password_hash]
  );

  const user = rows[0];
  const token = signToken({ userId: user.id, name: user.name, email: user.email, phone: user.phone });
  return { token, user };
}

/**
 * Connexion d'un utilisateur existant.
 */
export async function login(input: LoginInput): Promise<{ token: string; user: UserRow }> {
  const { email, phone, password } = input;

  if (!email && !phone) {
    throw new Error('Un email ou un numéro de téléphone est requis');
  }

  const whereClause = email ? 'email = $1' : 'phone = $1';
  const identifier = email ? email.toLowerCase() : phone;

  const { rows } = await pool.query<UserRow & { password_hash: string }>(
    `SELECT id, email, phone, name, avatar_url, created_at, password_hash
     FROM users WHERE ${whereClause}`,
    [identifier]
  );

  if (rows.length === 0) {
    throw new Error('Identifiants incorrects');
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Identifiants incorrects');

  // Retirer le hash avant de renvoyer
  const { password_hash: _h, ...safeUser } = user;

  const token = signToken({
    userId: safeUser.id,
    name: safeUser.name,
    email: safeUser.email,
    phone: safeUser.phone,
  });

  return { token, user: safeUser };
}

/**
 * Récupère le profil complet d'un utilisateur par son ID.
 */
export async function getUserById(userId: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT id, email, phone, name, avatar_url, created_at FROM users WHERE id = $1',
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Met à jour le profil d'un utilisateur.
 */
export async function updateProfile(
  userId: string,
  data: { name?: string; phone?: string; avatar_url?: string }
): Promise<UserRow> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name.trim());
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(data.phone);
  }
  if (data.avatar_url !== undefined) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(data.avatar_url);
  }

  if (fields.length === 0) throw new Error('Aucun champ à mettre à jour');

  values.push(userId);
  const { rows } = await pool.query<UserRow>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, email, phone, name, avatar_url, created_at`,
    values
  );

  if (rows.length === 0) throw new Error('Utilisateur introuvable');
  return rows[0];
}
