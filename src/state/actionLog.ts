import type { ActionLogEntry, ActionLogType, GravyState } from './types';

// Bounds actionLog's size since it's synced as part of the whole-household JSON payload on
// every change — oldest entries are evicted first (FIFO), never gating the underlying
// (already-correct) point-reversal arithmetic, which is unaffected by what's evicted.
export const ACTION_LOG_MAX_ENTRIES = 500;

export function appendActionLog(next: GravyState, entry: Omit<ActionLogEntry, 'id' | 'at'>): void {
  next.actionLog.push({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: Date.now() });
  if (next.actionLog.length > ACTION_LOG_MAX_ENTRIES) {
    next.actionLog.splice(0, next.actionLog.length - ACTION_LOG_MAX_ENTRIES);
  }
}

// Flips `undone` on the latest non-undone entry matching type/itemId/dateStr — called by the
// reverse actions (removeFood, decrementGoal, undoBonusItem, ...) so the Log reflects taps
// already undone via the live stepper/toggle UI, not just via the Log's own Undo button.
export function markMostRecentUndone(
  log: ActionLogEntry[],
  type: ActionLogType,
  itemId: number | string | undefined,
  dateStr: string,
): void {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.type === type && e.itemId === itemId && e.dateStr === dateStr && !e.undone) {
      e.undone = true;
      return;
    }
  }
}

// True only for the latest non-undone entry sharing an entry's (type, itemId, dateStr) — the
// Log shows an Undo button on an entry only when this is true (most-recent-only undo).
export function isMostRecentNonUndone(log: ActionLogEntry[], entry: ActionLogEntry): boolean {
  if (entry.undone) return false;
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    if (e.type === entry.type && e.itemId === entry.itemId && e.dateStr === entry.dateStr && !e.undone) {
      return e.id === entry.id;
    }
  }
  return false;
}
