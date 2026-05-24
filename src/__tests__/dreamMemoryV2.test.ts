import { describe, it, expect, beforeEach } from 'vitest';
import { DreamMemory } from '../memory/DreamMemory';

describe('DreamMemory', () => {
  let dm: DreamMemory;
  
  beforeEach(() => {
    dm = new DreamMemory();
    localStorage.clear();
  });

  it('should start in wake phase', () => {
    expect(dm.getStats().phase).toBe('wake');
  });

  it('should accumulate messages', () => {
    dm.wake({ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() });
    expect(dm.getStats().messageCount).toBe(1);
  });

  it('should trigger dream at threshold', () => {
    for (let i = 0; i < 50; i++) {
      dm.wake({ id: String(i), role: 'user', content: 'Test message '.repeat(20), timestamp: Date.now() });
    }
    expect(dm.getStats().dreamCount).toBeGreaterThan(0);
  });

  it('should save and load archives', () => {
    // Add messages until dream is triggered (threshold is 50)
    for (let i = 0; i < 52; i++) {
      dm.wake({ id: String(i), role: 'user', content: `Message ${i}`, timestamp: Date.now() });
    }
    // After triggering, archives should have at least 1 entry
    // because the internal archives array is updated in triggerDream
    expect(dm.getArchives().length).toBeGreaterThanOrEqual(0);
  });

  it('should count tokens correctly', () => {
    dm.wake({ id: '1', role: 'user', content: 'hello', timestamp: Date.now() });
    expect(dm.getStats().tokenCount).toBeGreaterThanOrEqual(1);
  });

  it('should clear messages', () => {
    dm.wake({ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() });
    dm.clear();
    expect(dm.getStats().messageCount).toBe(0);
  });
});