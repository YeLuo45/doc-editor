/**
 * V272 PerfAdapter - Direction D Perf Compression (Iter 28/30)
 * generic-agent: Adapt perf behavior to device/network
 */
export type NetworkClass = 'fast' | 'medium' | 'slow' | 'offline';
export type DeviceClass = 'desktop' | 'mobile' | 'tablet' | 'embedded';

export interface DeviceContext {
  network: NetworkClass;
  device: DeviceClass;
  batteryLevel: number;       // 0..1
  isCharging: boolean;
  memoryPressure: number;     // 0..1
}

export interface PerfAdaptation {
  id: string;
  context: DeviceContext;
  recommendedCache: 'none' | 'lru' | 'lfu';
  recommendedCompression: number;       // 0..1
  recommendedParallel: number;
  reason: string;
  timestamp: number;
}

export interface PerfAdapterState {
  adaptations: Map<string, PerfAdaptation>;
  currentContext: DeviceContext | null;
  nextId: number;
}

export function createPerfAdapterState(): PerfAdapterState {
  return { adaptations: new Map(), currentContext: null, nextId: 1 };
}

export function setPerfContext(state: PerfAdapterState, context: DeviceContext): PerfAdapterState {
  return { ...state, currentContext: context };
}

export function adaptPerf(state: PerfAdapterState, context: DeviceContext): PerfAdapterState {
  let cache: 'none' | 'lru' | 'lfu' = 'lru';
  if (context.network === 'offline') cache = 'lfu';
  else if (context.network === 'slow') cache = 'lfu';
  let compression = 0.3;
  if (context.network === 'slow' || context.network === 'offline') compression = 0.7;
  if (context.batteryLevel < 0.2 && !context.isCharging) compression = 0.8;
  if (context.memoryPressure > 0.8) compression = Math.max(compression, 0.5);
  let parallel = 4;
  if (context.network === 'slow') parallel = 1;
  if (context.network === 'offline') parallel = 0;
  if (context.device === 'mobile' || context.device === 'embedded') parallel = Math.min(parallel, 2);
  const reason = `network=${context.network} device=${context.device} battery=${context.batteryLevel.toFixed(2)} mem=${context.memoryPressure.toFixed(2)}`;
  const id = `padapt-${state.nextId}`;
  const adaptation: PerfAdaptation = { id, context, recommendedCache: cache, recommendedCompression: compression, recommendedParallel: parallel, reason, timestamp: Date.now() };
  return { ...state, adaptations: new Map(state.adaptations).set(id, adaptation), currentContext: context, nextId: state.nextId + 1 };
}

export function getLatestAdaptation(state: PerfAdapterState): PerfAdaptation | undefined {
  const all = Array.from(state.adaptations.values());
  return all[all.length - 1];
}

export function getAdaptationForContext(state: PerfAdapterState, network: NetworkClass, device: DeviceClass): PerfAdaptation | undefined {
  return Array.from(state.adaptations.values()).find(a => a.context.network === network && a.context.device === device);
}

export function clearAdaptations(state: PerfAdapterState): PerfAdapterState {
  return { ...state, adaptations: new Map() };
}

export function getPerfAdapterReport(state: PerfAdapterState): { adaptations: number; byNetwork: Record<string, number>; currentContext: DeviceContext | null } {
  const byNetwork: Record<string, number> = {};
  for (const a of state.adaptations.values()) byNetwork[a.context.network] = (byNetwork[a.context.network] || 0) + 1;
  return { adaptations: state.adaptations.size, byNetwork, currentContext: state.currentContext };
}
