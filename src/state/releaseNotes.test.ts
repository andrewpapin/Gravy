import { describe, expect, it } from 'vitest';
import { getLatestReleaseNoteVersion, getUnseenReleaseNotes } from './releaseNotes';
import type { ReleaseNote } from '../data/releaseNotes';

const notes: ReleaseNote[] = [
  { version: 1, note: 'first' },
  { version: 2, note: 'second' },
  { version: 3, note: 'third' },
];

describe('getLatestReleaseNoteVersion', () => {
  it('returns the highest version in the list', () => {
    expect(getLatestReleaseNoteVersion(notes)).toBe(3);
  });

  it('returns 0 for an empty list', () => {
    expect(getLatestReleaseNoteVersion([])).toBe(0);
  });
});

describe('getUnseenReleaseNotes', () => {
  it('returns nothing when lastSeenVersion is null (first load, nothing to announce)', () => {
    expect(getUnseenReleaseNotes(notes, null)).toEqual([]);
  });

  it('returns notes newer than lastSeenVersion, newest first', () => {
    expect(getUnseenReleaseNotes(notes, 1)).toEqual([
      { version: 3, note: 'third' },
      { version: 2, note: 'second' },
    ]);
  });

  it('returns nothing when already caught up to the latest version', () => {
    expect(getUnseenReleaseNotes(notes, 3)).toEqual([]);
  });

  it('returns nothing when lastSeenVersion is ahead of every known note', () => {
    expect(getUnseenReleaseNotes(notes, 99)).toEqual([]);
  });
});
