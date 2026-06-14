/**
 * V266 PerfPipeline - Direction D Perf Compression (Iter 22/30)
 * chatdev: Perf-aware pipeline (cache → chunk → compress → AI)
 */
export type StageName = 'cache_lookup' | 'chunk' | 'compress' | 'ai_call' | 'cache_store';

export interface StageResult {
  stage: StageName;
  durationMs: number;
  success: boolean;
  cached: boolean;
  bytesProcessed: number;
  timestamp: number;
}

export interface PipelineState {
  stages: StageResult[];
  totalDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
  totalRuns: number;
}

export function createPipelineState(): PipelineState {
  return { stages: [], totalDurationMs: 0, cacheHits: 0, cacheMisses: 0, totalRuns: 0 };
}

export function runStage(state: PipelineState, stage: StageName, durationMs: number, success: boolean, cached: boolean, bytesProcessed: number): PipelineState {
  const result: StageResult = { stage, durationMs, success, cached, bytesProcessed, timestamp: Date.now() };
  return {
    ...state,
    stages: [...state.stages, result].slice(-200),
    totalDurationMs: state.totalDurationMs + durationMs,
    cacheHits: state.cacheHits + (cached ? 1 : 0),
    cacheMisses: state.cacheMisses + (!cached ? 1 : 0),
    totalRuns: state.totalRuns + 1,
  };
}

export function runFullPipeline(state: PipelineState, bytes: number, cacheHit: boolean, aiLatency: number): PipelineState {
  let s = state;
  s = runStage(s, 'cache_lookup', 1, true, cacheHit, bytes);
  if (!cacheHit) {
    s = runStage(s, 'chunk', 5, true, false, bytes);
    s = runStage(s, 'compress', 3, true, false, bytes / 4);
    s = runStage(s, 'ai_call', aiLatency, true, false, bytes / 8);
    s = runStage(s, 'cache_store', 2, true, false, bytes);
  }
  return s;
}

export function getStagesByName(state: PipelineState, stage: StageName): StageResult[] {
  return state.stages.filter(s => s.stage === stage);
}

export function getAverageStageDuration(state: PipelineState, stage: StageName): number {
  const stages = getStagesByName(state, stage);
  if (stages.length === 0) return 0;
  return stages.reduce((a, b) => a + b.durationMs, 0) / stages.length;
}

export function getPipelineCacheHitRate(state: PipelineState): number {
  const total = state.cacheHits + state.cacheMisses;
  if (total === 0) return 0;
  return state.cacheHits / total;
}

export function getPipelineReport(state: PipelineState): { totalRuns: number; totalDurationMs: number; cacheHitRate: number; byStage: Record<string, { count: number; avgMs: number }> } {
  const byStage: Record<string, { count: number; avgMs: number }> = {};
  for (const s of state.stages) {
    if (!byStage[s.stage]) byStage[s.stage] = { count: 0, avgMs: 0 };
    byStage[s.stage].count += 1;
    byStage[s.stage].avgMs = (byStage[s.stage].avgMs * (byStage[s.stage].count - 1) + s.durationMs) / byStage[s.stage].count;
  }
  return { totalRuns: state.totalRuns, totalDurationMs: state.totalDurationMs, cacheHitRate: getPipelineCacheHitRate(state), byStage };
}
