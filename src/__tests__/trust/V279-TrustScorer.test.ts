import { describe, it, expect } from 'vitest';
import {
  createTrustScorerState, setTrustWeights, scoreTrust, getTrustScore,
  getHighTrustDocs, getLowTrustDocs, clearTrustScores, getTrustScorerReport,
} from '../../trust/V279-TrustScorer';

describe('V279 TrustScorer', () => {
  it('should create empty state', () => {
    const s = createTrustScorerState();
    expect(s.scores.size).toBe(0);
  });

  it('should score trust', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 0.9, provenance: 0.8, signatures: 0.95, age: 0.7, size: 0.6 });
    expect(s.scores.size).toBe(1);
  });

  it('should cap score at 1', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 5, provenance: 5, signatures: 5, age: 5, size: 5 });
    expect(getTrustScore(s, 'd1')!.score).toBe(1);
  });

  it('should floor score at 0', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: -1, provenance: -1, signatures: -1, age: -1, size: -1 });
    expect(getTrustScore(s, 'd1')!.score).toBe(0);
  });

  it('should set custom weights', () => {
    let s = createTrustScorerState();
    s = setTrustWeights(s, { authorReputation: 0.5, signatures: 0.5 });
    s = scoreTrust(s, 'd1', { authorReputation: 1, provenance: 0, signatures: 1, age: 0, size: 0 });
    expect(getTrustScore(s, 'd1')!.score).toBe(1);
  });

  it('should get high trust docs', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 0.9, provenance: 0.9, signatures: 0.9, age: 0.9, size: 0.9 });
    s = scoreTrust(s, 'd2', { authorReputation: 0.3, provenance: 0.3, signatures: 0.3, age: 0.3, size: 0.3 });
    expect(getHighTrustDocs(s, 0.8)).toHaveLength(1);
  });

  it('should get low trust docs', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 0.9, provenance: 0.9, signatures: 0.9, age: 0.9, size: 0.9 });
    s = scoreTrust(s, 'd2', { authorReputation: 0.3, provenance: 0.3, signatures: 0.3, age: 0.3, size: 0.3 });
    expect(getLowTrustDocs(s, 0.5)).toHaveLength(1);
  });

  it('should track factors', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 0.9, provenance: 0.8, signatures: 0.95, age: 0.7, size: 0.6 });
    expect(getTrustScore(s, 'd1')!.factors.length).toBe(5);
  });

  it('should clear scores', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 0.9, provenance: 0.8, signatures: 0.95, age: 0.7, size: 0.6 });
    s = clearTrustScores(s);
    expect(s.scores.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createTrustScorerState();
    s = scoreTrust(s, 'd1', { authorReputation: 0.9, provenance: 0.9, signatures: 0.9, age: 0.9, size: 0.9 });
    const r = getTrustScorerReport(s);
    expect(r.avgScore).toBeGreaterThan(0.8);
  });
});
