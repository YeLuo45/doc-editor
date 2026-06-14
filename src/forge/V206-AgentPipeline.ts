/**
 * V206 AgentPipeline - Direction B Agent Forge (Iter 22/30)
 * chatdev: Phase-gated multi-agent pipeline (design→code→test→review)
 */
export type PhaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export type PipelinePhaseName = 'design' | 'code' | 'test' | 'review' | 'deploy';

export interface PipelinePhase {
  name: PipelinePhaseName;
  agentId: string;
  status: PhaseStatus;
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

export interface PipelineState {
  phases: PipelinePhase[];
  currentPhase: number;
  startedAt: number;
  completedAt?: number;
  success: boolean;
}

export function createPipelineState(): PipelineState {
  return { phases: [], currentPhase: 0, startedAt: 0, success: false };
}

export function addPhase(state: PipelineState, name: PipelinePhaseName, agentId: string): PipelineState {
  return { ...state, phases: [...state.phases, { name, agentId, status: 'pending' }] };
}

export function startPipeline(state: PipelineState): PipelineState {
  if (state.phases.length === 0) return state;
  return { ...state, startedAt: Date.now(), currentPhase: 0, phases: state.phases.map((p, i) => i === 0 ? { ...p, status: 'running' } : p) };
}

export function completePhase(state: PipelineState, output: any): PipelineState {
  if (state.currentPhase >= state.phases.length) return state;
  const phases = [...state.phases];
  const current = phases[state.currentPhase];
  const duration = Date.now() - state.startedAt;
  phases[state.currentPhase] = { ...current, status: 'passed', output, duration };
  const nextPhase = state.currentPhase + 1;
  if (nextPhase < phases.length) {
    phases[nextPhase] = { ...phases[nextPhase], status: 'running' };
    return { ...state, phases, currentPhase: nextPhase };
  }
  return { ...state, phases, currentPhase: nextPhase, completedAt: Date.now(), success: true };
}

export function failPhase(state: PipelineState, error: string): PipelineState {
  if (state.currentPhase >= state.phases.length) return state;
  const phases = [...state.phases];
  phases[state.currentPhase] = { ...phases[state.currentPhase], status: 'failed', error };
  // Skip remaining phases
  for (let i = state.currentPhase + 1; i < phases.length; i++) {
    phases[i] = { ...phases[i], status: 'skipped' };
  }
  return { ...state, phases, completedAt: Date.now(), success: false };
}

export function getCurrentPhase(state: PipelineState): PipelinePhase | undefined {
  return state.phases[state.currentPhase];
}

export function getPhaseByName(state: PipelineState, name: PipelinePhaseName): PipelinePhase | undefined {
  return state.phases.find(p => p.name === name);
}

export function getPassedPhases(state: PipelineState): PipelinePhase[] {
  return state.phases.filter(p => p.status === 'passed');
}

export function getFailedPhases(state: PipelineState): PipelinePhase[] {
  return state.phases.filter(p => p.status === 'failed');
}

export function getPipelineReport(state: PipelineState): { totalPhases: number; passed: number; failed: number; currentPhase: string | null; duration: number } {
  const passed = getPassedPhases(state).length;
  const failed = getFailedPhases(state).length;
  const current = getCurrentPhase(state);
  const duration = state.completedAt ? state.completedAt - state.startedAt : state.startedAt ? Date.now() - state.startedAt : 0;
  return { totalPhases: state.phases.length, passed, failed, currentPhase: current?.name || null, duration };
}
