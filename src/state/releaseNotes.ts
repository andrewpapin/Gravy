import type { ReleaseNote } from '../data/releaseNotes';

export function getLatestReleaseNoteVersion(notes: ReleaseNote[]): number {
  return notes.reduce((max, n) => Math.max(max, n.version), 0);
}

// `null` means "never recorded a seen version" (brand-new install, or an existing install from
// before this feature shipped) — treated as nothing-to-announce so we don't dump the whole
// history on someone's first load. Otherwise, anything newer than what they've seen is unseen.
export function getUnseenReleaseNotes(notes: ReleaseNote[], lastSeenVersion: number | null): ReleaseNote[] {
  if (lastSeenVersion === null) return [];
  return notes.filter((n) => n.version > lastSeenVersion).sort((a, b) => b.version - a.version);
}
