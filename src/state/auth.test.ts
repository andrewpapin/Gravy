import { describe, it, expect } from 'vitest';
import { normalizeHouseholdStatus } from './auth';

describe('normalizeHouseholdStatus', () => {
  it('reads a single-row array (PostgREST table-function shape)', () => {
    expect(normalizeHouseholdStatus([{ claimed: true, is_member: true, is_owner: false }])).toEqual({
      claimed: true,
      isMember: true,
      isOwner: false,
    });
  });

  it('reads a bare object', () => {
    expect(normalizeHouseholdStatus({ claimed: true, is_member: false, is_owner: true })).toEqual({
      claimed: true,
      isMember: false,
      isOwner: true,
    });
  });

  it('defaults everything to false for a null/empty/missing row', () => {
    const allFalse = { claimed: false, isMember: false, isOwner: false };
    expect(normalizeHouseholdStatus(null)).toEqual(allFalse);
    expect(normalizeHouseholdStatus([])).toEqual(allFalse);
    expect(normalizeHouseholdStatus(undefined)).toEqual(allFalse);
    expect(normalizeHouseholdStatus({})).toEqual(allFalse);
  });

  it('coerces non-boolean truthy/falsy values to booleans', () => {
    expect(normalizeHouseholdStatus([{ claimed: 1, is_member: 0, is_owner: null }])).toEqual({
      claimed: true,
      isMember: false,
      isOwner: false,
    });
  });
});
