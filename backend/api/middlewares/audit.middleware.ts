import { Request, Response, NextFunction } from 'express';
import pool from '../services/db';

export type AuditAction =
  | 'create_group'
  | 'update_group'
  | 'delete_group'
  | 'join_group'
  | 'add_member'
  | 'remove_member'
  | 'change_member_role'
  | 'record_contribution'
  | 'request_withdrawal'
  | 'approve_withdrawal'
  | 'reject_withdrawal'
  | 'mark_paid'
  | 'register'
  | 'login'
  | 'update_profile';

/**
 * Enregistre une entrée dans audit_log.
 * Non-bloquant : les erreurs sont loguées mais n'interrompent pas la requête.
 */
export async function auditLog(
  userId: string | null,
  action: AuditAction,
  entityType: string | null,
  entityId: string | null,
  details: Record<string, unknown> | null,
  ipAddress?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        ipAddress ?? null,
      ]
    );
  } catch (err) {
    console.error('Erreur audit_log:', err);
  }
}

/**
 * Middleware Express : attache req.auditLog() pour simplifier les appels dans les routes.
 * Usage dans une route :
 *   await req.auditLog('create_group', 'group', group.id, { name: group.name });
 */
declare global {
  namespace Express {
    interface Request {
      auditLog: (
        action: AuditAction,
        entityType: string | null,
        entityId: string | null,
        details?: Record<string, unknown>
      ) => Promise<void>;
    }
  }
}

export function attachAuditLogger(req: Request, _res: Response, next: NextFunction): void {
  req.auditLog = (action, entityType, entityId, details) =>
    auditLog(
      req.user?.userId ?? null,
      action,
      entityType,
      entityId,
      details ?? null,
      req.ip
    );
  next();
}
