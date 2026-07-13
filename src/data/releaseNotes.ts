export interface ReleaseNote {
  /** Hand-bumped, unrelated to the build's `__APP_VERSION__` — see docs/systems.md. */
  version: number;
  /** One short bullet. This is a "what's new" ticker, not a full changelog. */
  note: string;
  /** The GitHub PR number that shipped this change, e.g. 42 → github.com/andrewpapin/gravy/pull/42. */
  prNumber: number;
}

// Append a new entry (bump `version` by one more than the current last entry, and set `prNumber`
// to the PR's number — GitHub assigns it as soon as the PR is opened) whenever a PR ships a change
// worth telling users about. Keep it to a single plain-language bullet.
export const RELEASE_NOTES: ReleaseNote[] = [
  { version: 1, note: 'Food Tray tiles now show how many points each food is worth.', prNumber: 156 },
  { version: 2, note: 'You can now browse the full release notes history from the Grown-Up Menu.', prNumber: 209 },
];
