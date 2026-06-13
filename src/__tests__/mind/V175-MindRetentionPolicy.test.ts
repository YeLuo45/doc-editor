import { describe, it, expect } from 'vitest';
import {
  createRetentionState, addMemory, accessMemory, removeMemory,
  setStrategy, setMaxItems, pruneExpired, getMemory, getMemoriesByImportance, getRetentionReport,
  type MemoryItem,
} from '../../mind/V175-MindRetentionPolicy';

describe('V175 MindRetentionPolicy', () => {
  it('should create empty state', () => {
    const s = createRetentionState();
    expect(s.items.size).toBe(0);
    expect(s.strategy).toBe('hybrid');
  });

  it('should add memory', () => {
    let s = createRetentionState();
    const item: MemoryItem = { id: '1', content: 'note', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.5, accessCount: 0 };
    s = addMemory(s, item);
    expect(s.items.size).toBe(1);
  });

  it('should access memory', () => {
    let s = createRetentionState();
    s = addMemory(s, { id: '1', content: 'a', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.5, accessCount: 0 });
    s = accessMemory(s, '1');
    expect(s.items.get('1')!.accessCount).toBe(1);
  });

  it('should remove memory', () => {
    let s = createRetentionState();
    s = addMemory(s, { id: '1', content: 'a', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.5, accessCount: 0 });
    s = removeMemory(s, '1');
    expect(s.items.size).toBe(0);
  });

  it('should set strategy', () => {
    let s = createRetentionState();
    s = setStrategy(s, 'lru');
    expect(s.strategy).toBe('lru');
  });

  it('should set max items', () => {
    let s = createRetentionState();
    s = setMaxItems(s, 5);
    expect(s.maxItems).toBe(5);
  });

  it('should prune expired', () => {
    let s = createRetentionState();
    s = { ...s, defaultTtl: 10 };
    s = addMemory(s, { id: '1', content: 'a', createdAt: Date.now() - 100, lastAccess: Date.now(), importance: 0.5, accessCount: 0 });
    s = pruneExpired(s, Date.now());
    expect(s.items.size).toBe(0);
  });

  it('should get memory by id', () => {
    let s = createRetentionState();
    s = addMemory(s, { id: '1', content: 'a', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.5, accessCount: 0 });
    const m = getMemory(s, '1');
    expect(m).toBeDefined();
    expect(m!.content).toBe('a');
  });

  it('should get memories by importance', () => {
    let s = createRetentionState();
    s = addMemory(s, { id: '1', content: 'high', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.9, accessCount: 0 });
    s = addMemory(s, { id: '2', content: 'low', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.1, accessCount: 0 });
    s = addMemory(s, { id: '3', content: 'mid', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.5, accessCount: 0 });
    expect(getMemoriesByImportance(s, 0.5)).toHaveLength(2);
  });

  it('should produce report', () => {
    let s = createRetentionState();
    s = addMemory(s, { id: '1', content: 'a', createdAt: Date.now(), lastAccess: Date.now(), importance: 0.9, accessCount: 0 });
    const r = getRetentionReport(s);
    expect(r.total).toBe(1);
    expect(r.byImportance.high).toBe(1);
  });

  it('should apply retention when over max', () => {
    let s = createRetentionState();
    s = setMaxItems(s, 2);
    s = addMemory(s, { id: '1', content: 'a', createdAt: 1, lastAccess: 1, importance: 0.9, accessCount: 5 });
    s = addMemory(s, { id: '2', content: 'b', createdAt: 2, lastAccess: 2, importance: 0.5, accessCount: 3 });
    s = addMemory(s, { id: '3', content: 'c', createdAt: 3, lastAccess: 3, importance: 0.1, accessCount: 0 });
    // low importance items get evicted when over max
    expect(s.items.size).toBeLessThanOrEqual(2);
  });
});
