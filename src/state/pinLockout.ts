// Throttles PIN-pad guessing. Deliberately stored outside GravyState/localStorage's synced
// `gravy_v1` blob — this is a per-device guess counter, not app data, so it must never sync
// across devices or get wiped by "Reset Everything".
const LOCKOUT_KEY = 'gravy_pin_lockout';
const MAX_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;

interface LockoutState {
  failCount: number;
  lockedUntil: number; // epoch ms; 0 means not locked
  level: number; // escalation level — each consecutive lockout doubles the previous duration
}

function readState(): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      failCount: typeof parsed?.failCount === 'number' ? parsed.failCount : 0,
      lockedUntil: typeof parsed?.lockedUntil === 'number' ? parsed.lockedUntil : 0,
      level: typeof parsed?.level === 'number' ? parsed.level : 0,
    };
  } catch {
    return { failCount: 0, lockedUntil: 0, level: 0 };
  }
}

function writeState(state: LockoutState) {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
}

// Returns the epoch-ms timestamp the current lockout ends at, or 0 if not locked out.
export function getLockedUntil(): number {
  const { lockedUntil } = readState();
  return lockedUntil > Date.now() ? lockedUntil : 0;
}

// Call after a wrong PIN. Returns the new lockedUntil (0 if the attempt limit hasn't been hit yet).
export function recordFailedAttempt(): number {
  const state = readState();
  state.failCount += 1;
  if (state.failCount >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + BASE_LOCKOUT_MS * 2 ** state.level;
    state.level += 1;
    state.failCount = 0;
  }
  writeState(state);
  return state.lockedUntil > Date.now() ? state.lockedUntil : 0;
}

// Call after a correct PIN. Clears the attempt count and escalation level.
export function recordSuccess(): void {
  writeState({ failCount: 0, lockedUntil: 0, level: 0 });
}
