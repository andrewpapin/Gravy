import { describe, expect, it } from 'vitest';
import { createDemoRoot } from './demoData';

describe('createDemoRoot', () => {
  it('builds two profiles with distinct identities sharing one catalog', () => {
    const root = createDemoRoot();
    expect(root.profiles).toHaveLength(2);
    const [maya, leo] = root.profiles;
    expect(maya.state.settings.childName).toBe('Maya');
    expect(leo.state.settings.childName).toBe('Leo');
    expect(maya.id).not.toBe(leo.id);
    expect(root.activeProfileId).toBe(maya.id);
    // Shared fields (goals/rewards/auditLog/shared settings) must match exactly across profiles.
    expect(leo.state.goals).toEqual(maya.state.goals);
    expect(leo.state.rewards).toEqual(maya.state.rewards);
    expect(leo.state.auditLog).toEqual(maya.state.auditLog);
    expect(leo.state.settings.foodPtsByItem).toEqual(maya.state.settings.foodPtsByItem);
  });

  it('gives every profile a coherent, non-negative point balance', () => {
    const root = createDemoRoot();
    for (const { state } of root.profiles) {
      expect(state.totalPoints).toBeGreaterThan(0);
      expect(state.points).toBeGreaterThanOrEqual(0);
      expect(state.points).toBeLessThanOrEqual(state.totalPoints);
      expect(state.totalPoints).toBe(
        Object.values(state.dayLogs).reduce((sum, log) => sum + log.points, 0) + state.todayPoints,
      );
    }
  });

  it('derives streaks from the fabricated dayLogs rather than drifting from them', () => {
    const root = createDemoRoot();
    const [maya, leo] = root.profiles;
    // The general activity streak equals the number of fabricated history days.
    expect(maya.state.streak).toBe(12);
    expect(leo.state.streak).toBe(9);
    // food/goal/mega streaks are all non-negative and bounded by the general streak.
    for (const { state } of root.profiles) {
      expect(state.foodStreak).toBeGreaterThanOrEqual(0);
      expect(state.goalStreak).toBeGreaterThanOrEqual(0);
      expect(state.megaStreak).toBeGreaterThanOrEqual(0);
      expect(state.foodStreak).toBeLessThanOrEqual(state.streak);
      expect(state.goalStreak).toBeLessThanOrEqual(state.streak);
      expect(state.megaStreak).toBeLessThanOrEqual(state.streak);
      expect(state.lastActiveDate).not.toBeNull();
    }
  });

  it('leaves one pending reward request per kid, for the Approvals panel', () => {
    const root = createDemoRoot();
    for (const { state } of root.profiles) {
      expect(state.pendingRewards).toHaveLength(1);
      const reward = state.rewards.find((r) => r.id === state.pendingRewards[0].rewardId);
      expect(reward).toBeDefined();
    }
  });
});
