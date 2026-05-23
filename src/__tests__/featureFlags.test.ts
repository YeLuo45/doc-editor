import { describe, it, expect } from 'vitest';
import { loadFeatureFlags, saveFeatureFlags, ALL_FLAGS, FLAG_DESCRIPTIONS } from '../utils/featureFlags';

describe('FeatureFlags', () => {
  it('should load default flags', () => {
    const flags = loadFeatureFlags();
    expect(flags.DREAM_MEMORY).toBe(true);
    expect(flags.AUTO_COMPACT).toBe(true);
    expect(flags.LAYERED_MEMORY).toBe(true);
    expect(flags.SESSION_ARCHIVE).toBe(true);
  });

  it('should have all flags defined', () => {
    expect(ALL_FLAGS).toContain('DREAM_MEMORY');
    expect(ALL_FLAGS).toContain('AUTO_COMPACT');
    expect(ALL_FLAGS).toContain('LAYERED_MEMORY');
    expect(ALL_FLAGS).toContain('SESSION_ARCHIVE');
    expect(ALL_FLAGS.length).toBe(4);
  });

  it('should have descriptions for all flags', () => {
    ALL_FLAGS.forEach(flag => {
      expect(FLAG_DESCRIPTIONS[flag]).toBeDefined();
      expect(FLAG_DESCRIPTIONS[flag].length).toBeGreaterThan(0);
    });
  });

  it('should save and load flags', () => {
    const custom = { DREAM_MEMORY: false, AUTO_COMPACT: true, LAYERED_MEMORY: false, SESSION_ARCHIVE: true };
    saveFeatureFlags(custom);
    const loaded = loadFeatureFlags();
    expect(loaded.DREAM_MEMORY).toBe(false);
    expect(loaded.LAYERED_MEMORY).toBe(false);
  });
});
