/**
 * V189 AgentDebugger - Direction B Agent Forge (Iter 5/30)
 * thunderbolt: Step-through agent execution trace inspector
 */
export type TraceEventType = 'start' | 'input' | 'tool_call' | 'tool_result' | 'llm_call' | 'output' | 'error' | 'end';

export interface TraceEvent {
  id: number;
  type: TraceEventType;
  timestamp: number;
  duration?: number;
  data: any;
  parent?: number;
}

export interface DebuggerState {
  traces: TraceEvent[];
  breakpoints: Set<number>;  // trace event IDs
  paused: boolean;
  currentStep: number;
  nextTraceId: number;
}

export function createDebuggerState(): DebuggerState {
  return { traces: [], breakpoints: new Set(), paused: false, currentStep: 0, nextTraceId: 1 };
}

export function addTrace(state: DebuggerState, type: TraceEventType, data: any, duration?: number, parent?: number): DebuggerState {
  const event: TraceEvent = { id: state.nextTraceId, type, timestamp: Date.now(), duration, data, parent };
  return { ...state, traces: [...state.traces, event].slice(-500), nextTraceId: state.nextTraceId + 1 };
}

export function setBreakpoint(state: DebuggerState, traceId: number): DebuggerState {
  const breakpoints = new Set(state.breakpoints);
  breakpoints.add(traceId);
  return { ...state, breakpoints };
}

export function clearBreakpoint(state: DebuggerState, traceId: number): DebuggerState {
  const breakpoints = new Set(state.breakpoints);
  breakpoints.delete(traceId);
  return { ...state, breakpoints };
}

export function pause(state: DebuggerState): DebuggerState {
  return { ...state, paused: true };
}

export function resume(state: DebuggerState): DebuggerState {
  return { ...state, paused: false };
}

export function stepTo(state: DebuggerState, traceId: number): DebuggerState {
  return { ...state, paused: true, currentStep: traceId };
}

export function getTraceByType(state: DebuggerState, type: TraceEventType): TraceEvent[] {
  return state.traces.filter(t => t.type === type);
}

export function getTraceChildren(state: DebuggerState, parentId: number): TraceEvent[] {
  return state.traces.filter(t => t.parent === parentId);
}

export function getErrorTraces(state: DebuggerState): TraceEvent[] {
  return state.traces.filter(t => t.type === 'error');
}

export function clearTraces(state: DebuggerState): DebuggerState {
  return createDebuggerState();
}

export function getDebuggerReport(state: DebuggerState): { traces: number; breakpoints: number; errors: number; paused: boolean } {
  return { traces: state.traces.length, breakpoints: state.breakpoints.size, errors: getErrorTraces(state).length, paused: state.paused };
}
