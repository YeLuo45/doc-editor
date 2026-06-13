import { describe, it, expect } from 'vitest';
import {
  createConsensusState, addSuggestion, clearSuggestions,
  resolveByMajority, resolveByWeight, resolveByPriority, resolveByLatest, resolveByMerge,
  resolve, getConsensusReport,
} from '../../mind/V179-MindConsensusResolver';

describe('V179 MindConsensusResolver', () => {
  it('should create empty state', () => {
    const s = createConsensusState();
    expect(s.suggestions).toHaveLength(0);
  });

  it('should add suggestion', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'editor', 'use shorter sentences', 0.9, 5);
    expect(s.suggestions).toHaveLength(1);
  });

  it('should clear suggestions', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'x', 0.5, 1);
    s = clearSuggestions(s);
    expect(s.suggestions).toHaveLength(0);
  });

  it('should resolve by majority', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'yes', 0.5, 1);
    s = addSuggestion(s, 'b', 'yes', 0.5, 1);
    s = addSuggestion(s, 'c', 'no', 0.5, 1);
    const r = resolveByMajority(s);
    expect(r.chosenValue).toBe('yes');
    expect(r.method).toBe('majority');
    expect(r.conflicts).toBe(2);
  });

  it('should resolve by weight', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'heavy', 0.9, 1, 1);
    s = addSuggestion(s, 'b', 'light', 0.1, 1, 1);
    const r = resolveByWeight(s);
    expect(r.chosenValue).toBe('heavy');
  });

  it('should resolve by priority', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'low', 0.5, 1);
    s = addSuggestion(s, 'b', 'high', 0.5, 9);
    const r = resolveByPriority(s);
    expect(r.chosenValue).toBe('high');
  });

  it('should resolve by latest', async () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'first', 0.5, 1);
    await new Promise(r => setTimeout(r, 5));
    s = addSuggestion(s, 'b', 'second', 0.5, 1);
    const r = resolveByLatest(s);
    expect(r.chosenValue).toBe('second');
  });

  it('should resolve by merge', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'x', 0.9, 1);
    s = addSuggestion(s, 'b', 'y', 0.5, 1);
    const r = resolveByMerge(s);
    expect(r.merged).toContain('x');
    expect(r.merged).toContain('y');
  });

  it('should handle empty suggestions', () => {
    const s = createConsensusState();
    expect(resolveByMajority(s).chosenValue).toBeNull();
    expect(resolveByWeight(s).chosenValue).toBeNull();
  });

  it('should resolve via method', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'x', 0.5, 1);
    s = addSuggestion(s, 'b', 'x', 0.5, 1);
    const r = resolve(s, 'majority');
    expect(r.method).toBe('majority');
  });

  it('should produce report', () => {
    let s = createConsensusState();
    s = addSuggestion(s, 'a', 'x', 0.5, 1);
    resolve(s, 'majority');
    s = { ...s, resolutionCounts: new Map([['majority', 1]]) };
    const r = getConsensusReport(s);
    expect(r.total).toBe(1);
    expect(r.byMethod.majority).toBe(1);
  });
});
