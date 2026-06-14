import { describe, it, expect } from 'vitest';
import {
  createSyncLearnerState, recordSyncOutcome, getSyncSuccessRate, getSyncAvgLatency,
  getBestSyncParameters, getSyncOutcomeDistribution, clearSyncLearning, getSyncLearnerReport,
} from '../../federation/V239-SyncLearner';

describe('V239 SyncLearner', () => {
  it('should create empty state', () => {
    const s = createSyncLearnerState();
    expect(s.events).toHaveLength(0);
  });

  it('should record outcome', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, { batch: 10 });
    expect(s.events).toHaveLength(1);
  });

  it('should get success rate', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, {});
    s = recordSyncOutcome(s, 'd1', 'dev1', 'failure', 200, 1, 0, {});
    expect(getSyncSuccessRate(s, 'd1')).toBe(0.5);
  });

  it('should get avg latency', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, {});
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 200, 0, 1024, {});
    expect(getSyncAvgLatency(s, 'd1')).toBe(150);
  });

  it('should get best parameters (highest bytes synced)', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, { batch: 'small' });
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 4096, { batch: 'large' });
    const best = getBestSyncParameters(s, 'd1');
    expect(best!.batch).toBe('large');
  });

  it('should get outcome distribution', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, {});
    s = recordSyncOutcome(s, 'd1', 'dev1', 'partial', 100, 1, 512, {});
    s = recordSyncOutcome(s, 'd1', 'dev1', 'failure', 100, 2, 0, {});
    const dist = getSyncOutcomeDistribution(s, 'd1');
    expect(dist.success).toBe(1);
    expect(dist.partial).toBe(1);
    expect(dist.failure).toBe(1);
  });

  it('should clear learning', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, {});
    s = clearSyncLearning(s);
    expect(s.events).toHaveLength(0);
  });

  it('should return 0 for unknown doc', () => {
    const s = createSyncLearnerState();
    expect(getSyncSuccessRate(s, 'unknown')).toBe(0);
  });

  it('should produce report', () => {
    let s = createSyncLearnerState();
    s = recordSyncOutcome(s, 'd1', 'dev1', 'success', 100, 0, 1024, {});
    s = recordSyncOutcome(s, 'd2', 'dev1', 'failure', 100, 1, 0, {});
    const r = getSyncLearnerReport(s);
    expect(r.docs).toBe(2);
    expect(r.overallSuccessRate).toBe(0.5);
  });

  it('should return empty distribution for unknown doc', () => {
    const s = createSyncLearnerState();
    expect(getSyncOutcomeDistribution(s, 'unknown')).toEqual({ success: 0, partial: 0, failure: 0 });
  });
});
