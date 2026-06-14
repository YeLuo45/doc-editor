/**
 * V242 SyncAdapter - Direction C Doc Federation (Iter 28/30)
 * generic-agent: Adapt sync behavior to network/device context
 */
export interface DeviceContext {
  type: 'desktop' | 'mobile' | 'web' | 'server';
  batteryLevel?: number;     // 0..1
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'offline';
  bandwidth: number;          // kbps
  isCharging: boolean;
  storageQuotaUsed: number;  // 0..1
}

export interface SyncAdaptation {
  id: string;
  deviceId: string;
  context: DeviceContext;
  recommendedStrategy: string;
  recommendedBatchSize: number;
  reason: string;
  timestamp: number;
}

export interface SyncAdapterState {
  adaptations: Map<string, SyncAdaptation>;  // by deviceId
  deviceContexts: Map<string, DeviceContext>;
}

export function createSyncAdapterState(): SyncAdapterState {
  return { adaptations: new Map(), deviceContexts: new Map() };
}

export function setDeviceContext(state: SyncAdapterState, deviceId: string, context: DeviceContext): SyncAdapterState {
  return { ...state, deviceContexts: new Map(state.deviceContexts).set(deviceId, context) };
}

export function adaptSyncBehavior(state: SyncAdapterState, deviceId: string): SyncAdapterState {
  const ctx = state.deviceContexts.get(deviceId);
  if (!ctx) return state;
  // Recommend strategy based on context
  let strategy = 'adaptive';
  let batchSize = 20;
  let reason = 'default';
  if (ctx.networkType === 'offline') {
    strategy = 'lazy';
    batchSize = 5;
    reason = 'offline - defer sync';
  } else if (ctx.networkType === 'cellular') {
    strategy = 'lazy';
    batchSize = 10;
    reason = 'cellular - small batches';
  } else if (ctx.networkType === 'wifi' || ctx.networkType === 'ethernet') {
    strategy = 'eager';
    batchSize = 50;
    reason = 'fast network - eager sync';
  }
  if (ctx.batteryLevel !== undefined && ctx.batteryLevel < 0.2 && !ctx.isCharging) {
    batchSize = Math.max(5, Math.floor(batchSize / 2));
    reason += ', low battery';
  }
  if (ctx.storageQuotaUsed > 0.9) {
    batchSize = Math.max(5, Math.floor(batchSize / 2));
    reason += ', storage tight';
  }
  const adaptation: SyncAdaptation = { id: `adapt-${Date.now()}`, deviceId, context: ctx, recommendedStrategy: strategy, recommendedBatchSize: batchSize, reason, timestamp: Date.now() };
  return { ...state, adaptations: new Map(state.adaptations).set(deviceId, adaptation) };
}

export function getAdaptationForDevice(state: SyncAdapterState, deviceId: string): SyncAdaptation | undefined {
  return state.adaptations.get(deviceId);
}

export function getAllAdaptations(state: SyncAdapterState): SyncAdaptation[] {
  return Array.from(state.adaptations.values());
}

export function clearAdaptations(state: SyncAdapterState): SyncAdapterState {
  return { ...state, adaptations: new Map() };
}

export function getSyncAdapterReport(state: SyncAdapterState): { devices: number; adaptations: number; byStrategy: Record<string, number> } {
  const byStrategy: Record<string, number> = {};
  for (const a of state.adaptations.values()) byStrategy[a.recommendedStrategy] = (byStrategy[a.recommendedStrategy] || 0) + 1;
  return { devices: state.deviceContexts.size, adaptations: state.adaptations.size, byStrategy };
}
