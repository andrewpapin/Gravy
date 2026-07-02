import type { GravyState, PendingPointsKind, PendingPointsAward } from './types';

// Records a point-earning action as pending rather than crediting it to the live balance —
// used on devices with no signed-in account (see GravyContext's `requiresApproval`), so a parent
// can approve/decline it later from the Approvals screen. `itemId` identifies the goal/food/
// bonus/game that earned it; kind+itemId is how the exact-inverse actions (decrementGoal,
// removeFood, undoBonusItem, declineGameWin) find and cancel a still-pending award instead of
// touching the balance.
export function queuePendingPoints(
  next: GravyState,
  kind: PendingPointsKind,
  itemId: number | string,
  pts: number,
  label: string,
): void {
  next.pendingPointsAwards.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    itemId,
    pts,
    label,
    at: Date.now(),
  });
}

// Removes and returns the most recently queued pending award matching kind+itemId (LIFO — a
// Bonus Points item can be tapped repeatably, queuing several awards for the same itemId), or
// null if none is pending. Used by the exact-inverse actions to cancel a still-pending award
// instead of subtracting from the live balance.
export function takeMostRecentPending(
  next: GravyState,
  kind: PendingPointsKind,
  itemId: number | string,
): PendingPointsAward | null {
  for (let i = next.pendingPointsAwards.length - 1; i >= 0; i--) {
    const entry = next.pendingPointsAwards[i];
    if (entry.kind === kind && entry.itemId === itemId) {
      next.pendingPointsAwards.splice(i, 1);
      return entry;
    }
  }
  return null;
}
