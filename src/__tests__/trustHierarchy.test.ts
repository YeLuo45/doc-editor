/**
 * TrustHierarchy Tests
 * Testing trust level validation and permission control
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrustHierarchy } from '../hooks/TrustHierarchy';
import { TrustLevel, TrustPermissions } from '../hooks/types';

describe('TrustHierarchy', () => {
  let hierarchy: TrustHierarchy;

  beforeEach(() => {
    hierarchy = new TrustHierarchy();
  });

  describe('Level Ordering', () => {
    it('should have correct level order (system < developer < user < guest)', () => {
      expect(hierarchy.getLevelOrder(TrustLevel.SYSTEM)).toBe(0);
      expect(hierarchy.getLevelOrder(TrustLevel.DEVELOPER)).toBe(1);
      expect(hierarchy.getLevelOrder(TrustLevel.USER)).toBe(2);
      expect(hierarchy.getLevelOrder(TrustLevel.GUEST)).toBe(3);
    });

    it('should compare levels correctly', () => {
      expect(hierarchy.compare(TrustLevel.SYSTEM, TrustLevel.DEVELOPER)).toBeLessThan(0);
      expect(hierarchy.compare(TrustLevel.USER, TrustLevel.GUEST)).toBeLessThan(0);
      expect(hierarchy.compare(TrustLevel.DEVELOPER, TrustLevel.USER)).toBeLessThan(0);
    });

    it('should identify more trusted relationships', () => {
      expect(hierarchy.isMoreTrusted(TrustLevel.SYSTEM, TrustLevel.DEVELOPER)).toBe(true);
      expect(hierarchy.isMoreTrusted(TrustLevel.DEVELOPER, TrustLevel.USER)).toBe(true);
      expect(hierarchy.isMoreTrusted(TrustLevel.USER, TrustLevel.GUEST)).toBe(true);
    });

    it('should identify less trusted relationships', () => {
      expect(hierarchy.isLessTrusted(TrustLevel.GUEST, TrustLevel.USER)).toBe(true);
      expect(hierarchy.isLessTrusted(TrustLevel.USER, TrustLevel.DEVELOPER)).toBe(true);
      expect(hierarchy.isLessTrusted(TrustLevel.DEVELOPER, TrustLevel.SYSTEM)).toBe(true);
    });
  });

  describe('Permissions', () => {
    it('should have correct permissions for system level', () => {
      const perms = hierarchy.getPermissions(TrustLevel.SYSTEM);
      expect(perms.canModify).toBe(true);
      expect(perms.canDelete).toBe(true);
      expect(perms.canPause).toBe(true);
      expect(perms.maxPriority).toBe(1000);
    });

    it('should have correct permissions for developer level', () => {
      const perms = hierarchy.getPermissions(TrustLevel.DEVELOPER);
      expect(perms.canModify).toBe(true);
      expect(perms.canDelete).toBe(true);
      expect(perms.canPause).toBe(true);
      expect(perms.maxPriority).toBe(500);
    });

    it('should have correct permissions for user level', () => {
      const perms = hierarchy.getPermissions(TrustLevel.USER);
      expect(perms.canModify).toBe(true);
      expect(perms.canDelete).toBe(false);
      expect(perms.canPause).toBe(true);
      expect(perms.maxPriority).toBe(100);
    });

    it('should have correct permissions for guest level', () => {
      const perms = hierarchy.getPermissions(TrustLevel.GUEST);
      expect(perms.canModify).toBe(false);
      expect(perms.canDelete).toBe(false);
      expect(perms.canPause).toBe(false);
      expect(perms.maxPriority).toBe(10);
    });
  });

  describe('Permission Checks', () => {
    it('should check canModify correctly', () => {
      expect(hierarchy.canModify(TrustLevel.SYSTEM)).toBe(true);
      expect(hierarchy.canModify(TrustLevel.GUEST)).toBe(false);
    });

    it('should check canDelete correctly', () => {
      expect(hierarchy.canDelete(TrustLevel.DEVELOPER)).toBe(true);
      expect(hierarchy.canDelete(TrustLevel.GUEST)).toBe(false);
    });

    it('should check canPause correctly', () => {
      expect(hierarchy.canPause(TrustLevel.USER)).toBe(true);
      expect(hierarchy.canPause(TrustLevel.GUEST)).toBe(false);
    });
  });

  describe('Priority Management', () => {
    it('should return correct max priority for each level', () => {
      expect(hierarchy.getMaxPriority(TrustLevel.SYSTEM)).toBe(1000);
      expect(hierarchy.getMaxPriority(TrustLevel.DEVELOPER)).toBe(500);
      expect(hierarchy.getMaxPriority(TrustLevel.USER)).toBe(100);
      expect(hierarchy.getMaxPriority(TrustLevel.GUEST)).toBe(10);
    });

    it('should check if priority is allowed', () => {
      expect(hierarchy.isPriorityAllowed(TrustLevel.USER, 50)).toBe(true);
      expect(hierarchy.isPriorityAllowed(TrustLevel.USER, 200)).toBe(false);
    });

    it('should clamp priority to allowed range', () => {
      expect(hierarchy.clampPriority(TrustLevel.USER, 50)).toBe(50);
      expect(hierarchy.clampPriority(TrustLevel.USER, 200)).toBe(100);
      expect(hierarchy.clampPriority(TrustLevel.GUEST, 100)).toBe(10);
    });
  });

  describe('Filtering', () => {
    it('should get highest trust level item', () => {
      const items = [
        { trustLevel: TrustLevel.USER },
        { trustLevel: TrustLevel.SYSTEM },
        { trustLevel: TrustLevel.DEVELOPER },
      ];
      const highest = hierarchy.getHighest(items);
      expect((highest as { trustLevel: TrustLevel }).trustLevel).toBe(TrustLevel.SYSTEM);
    });

    it('should filter by minimum trust level', () => {
      const items = [
        { trustLevel: TrustLevel.SYSTEM, name: 'system' },
        { trustLevel: TrustLevel.USER, name: 'user' },
        { trustLevel: TrustLevel.GUEST, name: 'guest' },
      ];
      const filtered = hierarchy.filterByMinimumTrust(items, TrustLevel.USER);
      expect(filtered.length).toBe(2);
      expect(filtered.some(i => i.name === 'system')).toBe(true);
      expect(filtered.some(i => i.name === 'user')).toBe(true);
      expect(filtered.some(i => i.name === 'guest')).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should get all levels sorted from highest to lowest', () => {
      const levels = hierarchy.getLevelsSorted();
      expect(levels[0]).toBe(TrustLevel.SYSTEM);
      expect(levels[levels.length - 1]).toBe(TrustLevel.GUEST);
    });

    it('should get trust level by name', () => {
      expect(TrustHierarchy.fromName('system')).toBe(TrustLevel.SYSTEM);
      expect(TrustHierarchy.fromName('developer')).toBe(TrustLevel.DEVELOPER);
      expect(TrustHierarchy.fromName('user')).toBe(TrustLevel.USER);
      expect(TrustHierarchy.fromName('guest')).toBe(TrustLevel.GUEST);
      expect(TrustHierarchy.fromName('invalid')).toBeUndefined();
    });

    it('should get display names', () => {
      expect(hierarchy.getDisplayName(TrustLevel.SYSTEM)).toBe('System');
      expect(hierarchy.getDisplayName(TrustLevel.DEVELOPER)).toBe('Developer');
      expect(hierarchy.getDisplayName(TrustLevel.USER)).toBe('User');
      expect(hierarchy.getDisplayName(TrustLevel.GUEST)).toBe('Guest');
    });
  });

  describe('Configuration Management', () => {
    it('should update permissions for a level', () => {
      hierarchy.updatePermissions(TrustLevel.GUEST, { canModify: true, maxPriority: 20 });
      const perms = hierarchy.getPermissions(TrustLevel.GUEST);
      expect(perms.canModify).toBe(true);
      expect(perms.maxPriority).toBe(20);
    });

    it('should reset permissions to defaults', () => {
      hierarchy.updatePermissions(TrustLevel.GUEST, { canModify: true });
      hierarchy.reset();
      const perms = hierarchy.getPermissions(TrustLevel.GUEST);
      expect(perms.canModify).toBe(false);
    });
  });
});