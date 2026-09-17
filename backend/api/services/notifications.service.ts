import admin from 'firebase-admin';
import pool from './db';

// ── Firebase Admin init (singleton) ──────────────────────────────────────────

let firebaseInitialized = false;

function initFirebase(): void {
  if (firebaseInitialized || admin.apps.length > 0) {
    firebaseInitialized = true;
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT non défini – notifications push désactivées');
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseInitialized = true;
  } catch (err) {
    console.error('Erreur init Firebase Admin:', err);
  }
}

initFirebase();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationPayload {
  title: string;
  message: string;
  type?: string;
  entity_id?: string;
}

export interface NotificationLogRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ── FCM helpers ───────────────────────────────────────────────────────────────

/** Récupère tous les tokens FCM actifs d'un utilisateur */
async function getTokensForUser(userId: string): Promise<string[]> {
  const { rows } = await pool.query<{ fcm_token: string }>(
    'SELECT fcm_token FROM devices WHERE user_id = $1',
    [userId]
  );
  return rows.map((r) => r.fcm_token);
}

/** Récupère les tokens FCM de tous les membres d'un groupe (sauf optionalExcludeId) */
async function getTokensForGroup(
  groupId: string,
  excludeUserId?: string
): Promise<{ userId: string; token: string }[]> {
  const params: unknown[] = [groupId];
  let exclude = '';
  if (excludeUserId) {
    exclude = 'AND m.user_id <> $2';
    params.push(excludeUserId);
  }
  const { rows } = await pool.query<{ user_id: string; fcm_token: string }>(
    `SELECT m.user_id, d.fcm_token
     FROM members m
     JOIN devices d ON d.user_id = m.user_id
     WHERE m.group_id = $1 ${exclude}`,
    params
  );
  return rows.map((r) => ({ userId: r.user_id, token: r.fcm_token }));
}

/**
 * Envoie une notification push FCM à une liste de tokens.
 * Nettoie automatiquement les tokens invalides.
 */
async function sendPushToTokens(
  tokens: string[],
  payload: NotificationPayload
): Promise<void> {
  if (!firebaseInitialized || tokens.length === 0) return;

  const messages: admin.messaging.Message[] = tokens.map((token) => ({
    token,
    notification: {
      title: payload.title,
      body: payload.message,
    },
    data: {
      type: payload.type ?? '',
      entity_id: payload.entity_id ?? '',
    },
    android: {
      priority: 'high' as const,
      notification: { channelId: 'heleana_default' },
    },
  }));

  try {
    const batchResponse = await admin.messaging().sendEach(messages);

    // Nettoyer les tokens invalides
    const invalidTokens: string[] = [];
    batchResponse.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await pool.query(
        'DELETE FROM devices WHERE fcm_token = ANY($1)',
        [invalidTokens]
      );
    }
  } catch (err) {
    console.error('Erreur envoi FCM:', err);
  }
}

// ── Notification log ──────────────────────────────────────────────────────────

/** Persiste une notification dans notifications_log */
async function saveNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  await pool.query(
    `INSERT INTO notifications_log (user_id, title, message, type, entity_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      payload.title,
      payload.message,
      payload.type ?? null,
      payload.entity_id ?? null,
    ]
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Notifie un seul utilisateur (push + log).
 */
export async function notifyUser(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  await saveNotification(userId, payload);
  const tokens = await getTokensForUser(userId);
  await sendPushToTokens(tokens, payload);
}

/**
 * Notifie tous les membres d'un groupe (push + log), sauf excludeUserId.
 */
export async function notifyGroupMembers(
  groupId: string,
  payload: NotificationPayload,
  excludeUserId?: string
): Promise<void> {
  const entries = await getTokensForGroup(groupId, excludeUserId);

  // Récupérer tous les user_ids des membres (même sans device enregistré) pour le log
  const params: unknown[] = [groupId];
  let excludeSql = '';
  if (excludeUserId) {
    excludeSql = 'AND user_id <> $2';
    params.push(excludeUserId);
  }
  const { rows: memberRows } = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM members WHERE group_id = $1 ${excludeSql}`,
    params
  );

  await Promise.all(
    memberRows.map((m) => saveNotification(m.user_id, payload))
  );

  const tokens = entries.map((e) => e.token);
  await sendPushToTokens(tokens, payload);
}

// ── Helpers métier ────────────────────────────────────────────────────────────

export async function notifyNewContribution(
  groupId: string,
  memberName: string,
  amount: number,
  currency: string,
  contributorId: string
): Promise<void> {
  await notifyGroupMembers(
    groupId,
    {
      title: 'Nouvelle cotisation',
      message: `${memberName} a cotisé ${amount.toLocaleString('fr-FR')} ${currency}`,
      type: 'contribution',
      entity_id: groupId,
    },
    contributorId
  );
}

export async function notifyWithdrawalRequest(
  groupId: string,
  requesterName: string,
  amount: number,
  currency: string,
  withdrawalId: string,
  requesterId: string
): Promise<void> {
  await notifyGroupMembers(
    groupId,
    {
      title: 'Demande de retrait',
      message: `${requesterName} demande un retrait de ${amount.toLocaleString('fr-FR')} ${currency}`,
      type: 'withdrawal_request',
      entity_id: withdrawalId,
    },
    requesterId
  );
}

export async function notifyWithdrawalResolved(
  requesterId: string,
  amount: number,
  currency: string,
  status: 'approved' | 'rejected',
  withdrawalId: string
): Promise<void> {
  const isApproved = status === 'approved';
  await notifyUser(requesterId, {
    title: isApproved ? 'Retrait approuvé ✅' : 'Retrait rejeté ❌',
    message: isApproved
      ? `Votre demande de retrait de ${amount.toLocaleString('fr-FR')} ${currency} a été approuvée`
      : `Votre demande de retrait de ${amount.toLocaleString('fr-FR')} ${currency} a été rejetée`,
    type: isApproved ? 'withdrawal_approved' : 'withdrawal_rejected',
    entity_id: withdrawalId,
  });
}

// ── Lecture du log in-app ─────────────────────────────────────────────────────

export async function getNotificationsForUser(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ notifications: NotificationLogRow[]; unread_count: number }> {
  const [{ rows: notifications }, { rows: countRows }] = await Promise.all([
    pool.query<NotificationLogRow>(
      `SELECT * FROM notifications_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM notifications_log WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    ),
  ]);
  return { notifications, unread_count: parseInt(countRows[0].count, 10) };
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  if (ids && ids.length > 0) {
    await pool.query(
      'UPDATE notifications_log SET is_read = TRUE WHERE user_id = $1 AND id = ANY($2)',
      [userId, ids]
    );
  } else {
    // Tout marquer comme lu
    await pool.query(
      'UPDATE notifications_log SET is_read = TRUE WHERE user_id = $1',
      [userId]
    );
  }
}
