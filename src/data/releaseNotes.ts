export interface ReleaseNote {
  /** Hand-bumped, unrelated to the build's `__APP_VERSION__` — see docs/systems.md. */
  version: number;
  /** One short bullet. This is a "what's new" ticker, not a full changelog. */
  note: string;
}

// Append a new entry (bump `version` by one more than the current last entry) whenever a PR
// ships a change worth telling users about. Keep it to a single plain-language bullet.
export const RELEASE_NOTES: ReleaseNote[] = [
  { version: 1, note: 'Food Tray tiles now show how many points each food is worth.' },
];
