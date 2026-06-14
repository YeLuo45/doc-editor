/**
 * V219 ConflictResolver - Direction C Doc Federation (Iter 5/30)
 * thunderbolt: Resolve conflicts via 3-way merge and user prompt
 */
export type Resolution = 'local_wins' | 'remote_wins' | 'merge' | 'manual';

export interface ResolvedConflict {
  path: string;
  resolution: Resolution;
  finalValue: any;
  baseValue: any;     // common ancestor
  localValue: any;
  remoteValue: any;
  timestamp: number;
}

export interface ConflictResolverState {
  resolutions: ResolvedConflict[];
  autoResolved: number;
  manualPending: number;
}

export function createConflictResolverState(): ConflictResolverState {
  return { resolutions: [], autoResolved: 0, manualPending: 0 };
}

export function resolveLocalWins(state: ConflictResolverState, path: string, localValue: any, baseValue: any, remoteValue: any): ConflictResolverState {
  const resolved: ResolvedConflict = { path, resolution: 'local_wins', finalValue: localValue, baseValue, localValue, remoteValue, timestamp: Date.now() };
  return { ...state, resolutions: [...state.resolutions, resolved], autoResolved: state.autoResolved + 1 };
}

export function resolveRemoteWins(state: ConflictResolverState, path: string, localValue: any, baseValue: any, remoteValue: any): ConflictResolverState {
  const resolved: ResolvedConflict = { path, resolution: 'remote_wins', finalValue: remoteValue, baseValue, localValue, remoteValue, timestamp: Date.now() };
  return { ...state, resolutions: [...state.resolutions, resolved], autoResolved: state.autoResolved + 1 };
}

export function resolveMerge(state: ConflictResolverState, path: string, localValue: any, baseValue: any, remoteValue: any, mergedValue: any): ConflictResolverState {
  const resolved: ResolvedConflict = { path, resolution: 'merge', finalValue: mergedValue, baseValue, localValue, remoteValue, timestamp: Date.now() };
  return { ...state, resolutions: [...state.resolutions, resolved], autoResolved: state.autoResolved + 1 };
}

export function markManual(state: ConflictResolverState, path: string, localValue: any, baseValue: any, remoteValue: any): ConflictResolverState {
  const resolved: ResolvedConflict = { path, resolution: 'manual', finalValue: localValue, baseValue, localValue, remoteValue, timestamp: Date.now() };
  return { ...state, resolutions: [...state.resolutions, resolved], manualPending: state.manualPending + 1 };
}

export function threeWayMerge(base: string, local: string, remote: string): string {
  if (local === remote) return local;
  if (base === local) return remote;
  if (base === remote) return local;
  // Simple diff3-style merge
  const NL = String.fromCharCode(10);
  const baseLines = base.split(NL);
  const localLines = local.split(NL);
  const remoteLines = remote.split(NL);
  const result: string[] = [];
  const maxLen = Math.max(localLines.length, remoteLines.length);
  for (let i = 0; i < maxLen; i++) {
    const b = baseLines[i] || '';
    const l = localLines[i] || '';
    const r = remoteLines[i] || '';
    if (l === r) { result.push(l); continue; }
    if (b === l) { result.push(r); continue; }
    if (b === r) { result.push(l); continue; }
    // Both changed: include both with marker
    result.push(`<<<LOCAL:${l}|||REMOTE:${r}>>>`);
  }
  return result.join(NL);
}

export function getResolutionForPath(state: ConflictResolverState, path: string): ResolvedConflict | undefined {
  return state.resolutions.find(r => r.path === path);
}

export function getManualPending(state: ConflictResolverState): ResolvedConflict[] {
  return state.resolutions.filter(r => r.resolution === 'manual');
}

export function clearResolutions(state: ConflictResolverState): ConflictResolverState {
  return { ...state, resolutions: [], autoResolved: 0, manualPending: 0 };
}

export function getResolverReport(state: ConflictResolverState): { total: number; autoResolved: number; manualPending: number; byResolution: Record<string, number> } {
  const byResolution: Record<string, number> = {};
  for (const r of state.resolutions) byResolution[r.resolution] = (byResolution[r.resolution] || 0) + 1;
  return { total: state.resolutions.length, autoResolved: state.autoResolved, manualPending: state.manualPending, byResolution };
}
