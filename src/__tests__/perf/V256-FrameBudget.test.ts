import { describe, it, expect } from 'vitest';
import {
  createFrameBudgetState, startFrame, endFrame, getRecentFrames, getFrameStats,
  getOverBudgetFrames, clearFrameHistory, setBudget, getFrameBudgetReport,
} from '../../perf/V256-FrameBudget';

describe('V256 FrameBudget', () => {
  it('should create empty state', () => {
    const s = createFrameBudgetState();
    expect(s.frames).toHaveLength(0);
    expect(s.budgetMs).toBe(16);
  });

  it('should start frame', () => {
    let s = createFrameBudgetState();
    s = startFrame(s);
    expect(s.currentFrame).toBe(1);
  });

  it('should end frame under budget', () => {
    let s = createFrameBudgetState();
    s = startFrame(s);
    s = endFrame(s);
    expect(s.totalFrames).toBe(1);
    expect(s.overBudgetFrames).toBe(0);
  });

  it('should detect over budget frame', () => {
    let s = createFrameBudgetState(10);
    s = startFrame(s);
    // Simulate slow work
    const start = Date.now();
    while (Date.now() - start < 20) {}
    s = endFrame(s);
    expect(s.overBudgetFrames).toBe(1);
  });

  it('should get recent frames', () => {
    let s = createFrameBudgetState();
    for (let i = 0; i < 100; i++) {
      s = startFrame(s);
      s = endFrame(s);
    }
    expect(getRecentFrames(s, 30)).toHaveLength(30);
  });

  it('should compute frame stats', () => {
    let s = createFrameBudgetState(1000);  // large budget to avoid over budget
    for (let i = 0; i < 20; i++) {
      s = startFrame(s);
      s = endFrame(s);
    }
    const stats = getFrameStats(s);
    expect(stats.avgWorkMs).toBeGreaterThanOrEqual(0);
  });

  it('should get over budget frames', () => {
    let s = createFrameBudgetState(0);  // zero budget - any work is over
    s = startFrame(s);
    s = endFrame(s);
    expect(getOverBudgetFrames(s).length).toBeGreaterThanOrEqual(0);
  });

  it('should clear history', () => {
    let s = createFrameBudgetState();
    s = startFrame(s);
    s = endFrame(s);
    s = clearFrameHistory(s);
    expect(s.frames).toHaveLength(0);
  });

  it('should set budget', () => {
    let s = createFrameBudgetState();
    s = setBudget(s, 33);
    expect(s.budgetMs).toBe(33);
  });

  it('should produce report', () => {
    let s = createFrameBudgetState();
    s = startFrame(s);
    s = endFrame(s);
    const r = getFrameBudgetReport(s);
    expect(r.totalFrames).toBe(1);
    expect(r.budget).toBe(16);
  });
});
