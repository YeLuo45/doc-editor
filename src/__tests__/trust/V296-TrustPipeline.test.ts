import { describe, it, expect } from 'vitest';
import {
  createTrustPipelineState, runPipelineStage, runFullTrustPipeline,
  getHistoryForDoc, getFailures, getStageStats, clearPipelineHistory, getTrustPipelineReport,
} from '../../trust/V296-TrustPipeline';

describe('V296 TrustPipeline', () => {
  it('should create empty state', () => {
    const s = createTrustPipelineState();
    expect(s.history).toHaveLength(0);
  });

  it('should run stage', () => {
    let s = createTrustPipelineState();
    s = runPipelineStage(s, 'hash', 'd1', true, { hash: 'abc' });
    expect(s.history).toHaveLength(1);
  });

  it('should run full pipeline', () => {
    let s = createTrustPipelineState();
    s = runFullTrustPipeline(s, 'd1', 'hash1', 'sig1', true, 'logged');
    expect(s.history).toHaveLength(4);
  });

  it('should detect pipeline failure', () => {
    let s = createTrustPipelineState();
    s = runFullTrustPipeline(s, 'd1', 'hash1', 'sig1', false, 'failed');
    expect(s.totalFailure).toBe(1);
  });

  it('should get history for doc', () => {
    let s = createTrustPipelineState();
    s = runFullTrustPipeline(s, 'd1', 'h', 's', true, 'l');
    s = runFullTrustPipeline(s, 'd2', 'h', 's', true, 'l');
    expect(getHistoryForDoc(s, 'd1')).toHaveLength(4);
  });

  it('should get failures', () => {
    let s = createTrustPipelineState();
    s = runPipelineStage(s, 'hash', 'd1', false, {});
    s = runPipelineStage(s, 'hash', 'd1', true, {});
    expect(getFailures(s)).toHaveLength(1);
  });

  it('should get stage stats', () => {
    let s = createTrustPipelineState();
    s = runPipelineStage(s, 'hash', 'd1', true, {});
    s = runPipelineStage(s, 'hash', 'd1', false, {});
    const stats = getStageStats(s, 'hash');
    expect(stats.count).toBe(2);
    expect(stats.successRate).toBe(0.5);
  });

  it('should return 0 stats for empty stage', () => {
    const s = createTrustPipelineState();
    expect(getStageStats(s, 'hash').count).toBe(0);
  });

  it('should clear history', () => {
    let s = createTrustPipelineState();
    s = runPipelineStage(s, 'hash', 'd1', true, {});
    s = clearPipelineHistory(s);
    expect(s.history).toHaveLength(0);
  });

  it('should cap history at 500', () => {
    let s = createTrustPipelineState();
    for (let i = 0; i < 600; i++) s = runPipelineStage(s, 'hash', 'd1', true, {});
    expect(s.history).toHaveLength(500);
  });

  it('should produce report', () => {
    let s = createTrustPipelineState();
    s = runPipelineStage(s, 'hash', 'd1', true, {});
    s = runPipelineStage(s, 'hash', 'd1', false, {});
    const r = getTrustPipelineReport(s);
    expect(r.totalRuns).toBe(2);
    expect(r.successRate).toBe(0.5);
  });
});
