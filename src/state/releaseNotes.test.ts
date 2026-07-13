import { describe, expect, it } from 'vitest';
import { getAllReleaseNotesSorted, getLatestReleaseNoteVersion, getUnseenReleaseNotes } from './releaseNotes';
import type { ReleaseNote } from '../data/releaseNotes';

const notes: ReleaseNote[] = [
  { version: 1, note: 'first', prNumber: 101 },
  { version: 2, note: 'second', prNumber: 102 },
  { version: 3, note: 'third', prNumber: 103 },
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
      { version: 3, note: 'third', prNumber: 103 },
      { version: 2, note: 'second', prNumber: 102 },
    ]);
  });

  it('returns nothing when already caught up to the latest version', () => {
    expect(getUnseenReleaseNotes(notes, 3)).toEqual([]);
  });

  it('returns nothing when lastSeenVersion is ahead of every known note', () => {
    expect(getUnseenReleaseNotes(notes, 99)).toEqual([]);
  });
});

describe('getAllReleaseNotesSorted', () => {
  it('returns all notes sorted newest first', () => {
    expect(getAllReleaseNotesSorted(notes)).toEqual([
      { version: 3, note: 'third', prNumber: 103 },
      { version: 2, note: 'second', prNumber: 102 },
      { version: 1, note: 'first', prNumber: 101 },
    ]);
  });

  it('returns an empty array unchanged', () => {
    expect(getAllReleaseNotesSorted([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const original = [...notes];
    getAllReleaseNotesSorted(notes);
    expect(notes).toEqual(original);
  });
});
