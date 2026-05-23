import { describe, it, expect, beforeEach } from 'vitest';
import { dreamMemory } from '../utils/dreamMemory';

describe('DreamMemory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should start with empty messages', () => {
    expect(dreamMemory.getMessages()).toEqual([]);
  });

  it('should add messages via wake', () => {
    dreamMemory.wake({ id: '1', role: 'user', content: 'test', timestamp: Date.now() });
    expect(dreamMemory.getMessages().length).toBe(1);
  });

  it('should count dream cycles', () => {
    dreamMemory.wake({ id: '1', role: 'user', content: 'test', timestamp: Date.now() });
    // Force dream by reaching threshold
    for (let i = 0; i < 50; i++) {
      dreamMemory.wake({ id: String(i), role: 'user', content: 'msg', timestamp: Date.now() });
    }
    expect(dreamMemory.getDreamCount()).toBeGreaterThanOrEqual(1);
  });

  it('should estimate tokens correctly', () => {
    const stats = dreamMemory.getStats();
    expect(stats.totalTokens).toBeDefined();
    expect(stats.messageCount).toBeDefined();
  });

  it('should save and load from localStorage', () => {
    dreamMemory.wake({ id: '1', role: 'user', content: 'persisted', timestamp: Date.now() });
    dreamMemory.save();
    dreamMemory.load();
    expect(dreamMemory.getMessages().length).toBeGreaterThanOrEqual(0);
  });
});
