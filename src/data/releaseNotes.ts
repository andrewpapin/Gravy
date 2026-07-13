export interface ReleaseNote {
  /** Hand-bumped, unrelated to the build's `__APP_VERSION__` — see docs/systems.md. */
  version: number;
  /** One short bullet. This is a "what's new" ticker, not a full changelog. */
  note: string;
  /** The GitHub PR number that shipped this change, e.g. 42 → github.com/andrewpapin/gravy/pull/42. */
  prNumber: number;
  /** ISO 8601 timestamp of the merge, e.g. from `git log -1 --format=%cI <merge-commit>`. */
  at: string;
}

// Append a new entry (bump `version` by one more than the current last entry, set `prNumber` to
// the PR's number — GitHub assigns it as soon as the PR is opened — and `at` to the merge time)
// whenever a PR ships a change worth telling users about. Keep it to a single plain-language bullet.
export const RELEASE_NOTES: ReleaseNote[] = [
  { version: 1, note: 'Food Tray tiles now show how many points each food is worth.', prNumber: 156, at: '2026-07-03T12:41:44-04:00' },
  { version: 2, note: 'You can now browse the full release notes history from the Grown-Up Menu.', prNumber: 209, at: '2026-07-13T09:35:23-04:00' },
  { version: 3, note: 'The Arcade is now just one game — tap Daily to play, see today\'s stats, and check your game history.', prNumber: 211, at: '2026-07-13T15:00:00-04:00' },
];
