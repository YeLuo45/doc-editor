import { describe, it, expect } from 'vitest';
import {
  createTrustAggregatorState, recordSignal, recomputeDoc, getTrustAggregation,
  getAllAggregations, getSignalsForDoc, clearTrustAggregation, getTrustAggregatorReport,
} from '../../trust/V284-TrustAggregator';

describe('V284 TrustAggregator', () => {
  it('should create empty state', () => {
    const s = createTrustAggregatorState();
    expect(s.signals.size).toBe(0);
  });

  it('should record signal', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'signature_valid', 1);
    expect(s.signals.size).toBe(1);
  });

  it('should recompute doc aggregation', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'signature_valid', 1);
    s = recordSignal(s, 'd1', 'pii_found', -1);
    s = recomputeDoc(s, 'd1');
    expect(getTrustAggregation(s, 'd1')!.score).toBe(0.5);
  });

  it('should handle no negative signals', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 1);
    s = recordSignal(s, 'd1', 'b', 1);
    s = recomputeDoc(s, 'd1');
    expect(getTrustAggregation(s, 'd1')!.score).toBe(1);
  });

  it('should handle no positive signals', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', -1);
    s = recordSignal(s, 'd1', 'b', -1);
    s = recomputeDoc(s, 'd1');
    expect(getTrustAggregation(s, 'd1')!.score).toBe(0);
  });

  it('should default to 0.5 when no positive/negative', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 0);
    s = recomputeDoc(s, 'd1');
    expect(getTrustAggregation(s, 'd1')!.score).toBe(0.5);
  });

  it('should track positive/negative counts', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 1);
    s = recordSignal(s, 'd1', 'b', -1);
    s = recordSignal(s, 'd1', 'c', 1);
    s = recomputeDoc(s, 'd1');
    const agg = getTrustAggregation(s, 'd1')!;
    expect(agg.positiveCount).toBe(2);
    expect(agg.negativeCount).toBe(1);
  });

  it('should get all aggregations', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 1);
    s = recomputeDoc(s, 'd1');
    s = recordSignal(s, 'd2', 'a', -1);
    s = recomputeDoc(s, 'd2');
    expect(getAllAggregations(s)).toHaveLength(2);
  });

  it('should get signals for doc', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 1);
    s = recordSignal(s, 'd1', 'b', 1);
    expect(getSignalsForDoc(s, 'd1')).toHaveLength(2);
  });

  it('should clear aggregation', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 1);
    s = clearTrustAggregation(s);
    expect(s.signals.size).toBe(0);
  });

  it('should cap signals per doc at 100', () => {
    let s = createTrustAggregatorState();
    for (let i = 0; i < 150; i++) s = recordSignal(s, 'd1', 'a', 1);
    expect(s.signals.get('d1')!.length).toBe(100);
  });

  it('should produce report', () => {
    let s = createTrustAggregatorState();
    s = recordSignal(s, 'd1', 'a', 1);
    s = recomputeDoc(s, 'd1');
    const r = getTrustAggregatorReport(s);
    expect(r.avgScore).toBe(1);
  });
});
