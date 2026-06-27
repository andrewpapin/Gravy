import type { AuditLogEntry, GravyState } from './types';
import type { LogActor } from './actionLog';

// Bounds the audit log's size — it rides the same whole-household JSON sync payload as actionLog,
// so oldest entries are evicted first (FIFO). Smaller cap than actionLog since admin actions are
// far rarer than kid taps.
export const AUDIT_LOG_MAX_ENTRIES = 300;

// Appends a household-level admin/destructive-action entry (Epic 8 item 6), stamped with the
// signed-in parent account when there is one. Pure + exported for unit testing.
export function appendAuditLog(
  next: GravyState,
  actor: LogActor | undefined,
  entry: Omit<AuditLogEntry, 'id' | 'at' | 'actorUserId' | 'actorLabel'>,
): void {
  next.auditLog.push({
    ...entry,
    ...(actor?.userId ? { actorUserId: actor.userId } : {}),
    ...(actor?.label ? { actorLabel: actor.label } : {}),
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    at: Date.now(),
  });
  if (next.auditLog.length > AUDIT_LOG_MAX_ENTRIES) {
    next.auditLog.splice(0, next.auditLog.length - AUDIT_LOG_MAX_ENTRIES);
  }
}
