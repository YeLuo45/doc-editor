/**
 * V296 TrustPipeline - Direction E Trust Verification (Iter 22/30)
 * chatdev: Sequential trust pipeline (hash -> sign -> validate -> log)
 */
export type TrustStage = 'hash' | 'sign' | 'validate' | 'log';

export interface TrustStageResult {
  stage: TrustStage;
  docId: string;
  success: boolean;
  durationMs: number;
  timestamp: number;
  output: any;
}

export interface TrustPipelineState {
  history: TrustStageResult[];
  totalRuns: number;
  totalSuccess: number;
  totalFailure: number;
  byStage: Record<TrustStage, number>;
}

export function createTrustPipelineState(): TrustPipelineState {
  return { history: [], totalRuns: 0, totalSuccess: 0, totalFailure: 0, byStage: { hash: 0, sign: 0, validate: 0, log: 0 } };
}

export function runPipelineStage(state: TrustPipelineState, stage: TrustStage, docId: string, success: boolean, output: any, durationMs: number = 1): TrustPipelineState {
  const result: TrustStageResult = { stage, docId, success, durationMs, timestamp: Date.now(), output };
  return {
    ...state,
    history: [...state.history, result].slice(-500),
    totalRuns: state.totalRuns + 1,
    totalSuccess: state.totalSuccess + (success ? 1 : 0),
    totalFailure: state.totalFailure + (success ? 0 : 1),
    byStage: { ...state.byStage, [stage]: state.byStage[stage] + 1 },
  };
}

export function runFullTrustPipeline(state: TrustPipelineState, docId: string, hash: string, signature: string, validationPassed: boolean, logMessage: string): TrustPipelineState {
  let s = state;
  s = runPipelineStage(s, 'hash', docId, !!hash, { hash }, 5);
  s = runPipelineStage(s, 'sign', docId, !!signature, { signature }, 10);
  s = runPipelineStage(s, 'validate', docId, validationPassed, { valid: validationPassed }, 20);
  s = runPipelineStage(s, 'log', docId, !!logMessage, { logMessage }, 2);
  return s;
}

export function getHistoryForDoc(state: TrustPipelineState, docId: string): TrustStageResult[] {
  return state.history.filter(r => r.docId === docId);
}

export function getFailures(state: TrustPipelineState): TrustStageResult[] {
  return state.history.filter(r => !r.success);
}

export function getStageStats(state: TrustPipelineState, stage: TrustStage): { count: number; successRate: number } {
  const results = state.history.filter(r => r.stage === stage);
  if (results.length === 0) return { count: 0, successRate: 0 };
  return { count: results.length, successRate: results.filter(r => r.success).length / results.length };
}

export function clearPipelineHistory(state: TrustPipelineState): TrustPipelineState {
  return createTrustPipelineState();
}

export function getTrustPipelineReport(state: TrustPipelineState): { totalRuns: number; totalSuccess: number; totalFailure: number; successRate: number } {
  return { totalRuns: state.totalRuns, totalSuccess: state.totalSuccess, totalFailure: state.totalFailure, successRate: state.totalRuns > 0 ? state.totalSuccess / state.totalRuns : 0 };
}
