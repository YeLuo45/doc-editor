import { describe, it, expect } from 'vitest';
import {
  createPipelineState, runStage, runFullPipeline, getStagesByName,
  getAverageStageDuration, getPipelineCacheHitRate, getPipelineReport,
} from '../../perf/V266-PerfPipeline';

describe('V266 PerfPipeline', () => {
  it('should create empty state', () => {
    const s = createPipelineState();
    expect(s.stages).toHaveLength(0);
  });

  it('should run stage', () => {
    let s = createPipelineState();
    s = runStage(s, 'cache_lookup', 5, true, true, 1000);
    expect(s.stages).toHaveLength(1);
  });

  it('should run full pipeline on cache miss', () => {
    let s = createPipelineState();
    s = runFullPipeline(s, 1000, false, 100);
    expect(s.stages.length).toBe(5);  // cache_lookup + chunk + compress + ai_call + cache_store
  });

  it('should run only cache_lookup on cache hit', () => {
    let s = createPipelineState();
    s = runFullPipeline(s, 1000, true, 0);
    expect(s.stages.length).toBe(1);
  });

  it('should get stages by name', () => {
    let s = createPipelineState();
    s = runStage(s, 'chunk', 5, true, false, 100);
    s = runStage(s, 'ai_call', 100, true, false, 50);
    expect(getStagesByName(s, 'chunk')).toHaveLength(1);
  });

  it('should get average stage duration', () => {
    let s = createPipelineState();
    s = runStage(s, 'chunk', 10, true, false, 100);
    s = runStage(s, 'chunk', 20, true, false, 100);
    expect(getAverageStageDuration(s, 'chunk')).toBe(15);
  });

  it('should compute cache hit rate', () => {
    let s = createPipelineState();
    s = runStage(s, 'cache_lookup', 1, true, true, 100);
    s = runStage(s, 'cache_lookup', 1, true, false, 100);
    expect(getPipelineCacheHitRate(s)).toBe(0.5);
  });

  it('should return 0 hit rate for no runs', () => {
    const s = createPipelineState();
    expect(getPipelineCacheHitRate(s)).toBe(0);
  });

  it('should return 0 avg for no stages', () => {
    const s = createPipelineState();
    expect(getAverageStageDuration(s, 'chunk')).toBe(0);
  });

  it('should cap stages at 200', () => {
    let s = createPipelineState();
    for (let i = 0; i < 300; i++) s = runStage(s, 'cache_lookup', 1, true, true, 100);
    expect(s.stages).toHaveLength(200);
  });

  it('should produce report', () => {
    let s = createPipelineState();
    s = runStage(s, 'chunk', 5, true, false, 100);
    const r = getPipelineReport(s);
    expect(r.byStage.chunk.count).toBe(1);
  });
});
