/**
 * V228 SyncGateway - Direction C Doc Federation (Iter 14/30)
 * nanobot: Gateway for remote instance connections
 */
export type GatewayStatus = 'online' | 'offline' | 'connecting' | 'error';

export interface GatewayConnection {
  id: string;
  remoteInstanceId: string;
  remoteUrl: string;
  status: GatewayStatus;
  connectedAt?: number;
  lastPingAt: number;
  bytesIn: number;
  bytesOut: number;
  latencyMs: number;
}

export interface SyncGatewayState {
  connections: Map<string, GatewayConnection>;
  totalConnections: number;
  totalBytesIn: number;
  totalBytesOut: number;
}

export function createSyncGatewayState(): SyncGatewayState {
  return { connections: new Map(), totalConnections: 0, totalBytesIn: 0, totalBytesOut: 0 };
}

export function connectGateway(state: SyncGatewayState, connId: string, remoteInstanceId: string, remoteUrl: string): SyncGatewayState {
  const conn: GatewayConnection = { id: connId, remoteInstanceId, remoteUrl, status: 'connecting', lastPingAt: Date.now(), bytesIn: 0, bytesOut: 0, latencyMs: 0 };
  return { ...state, connections: new Map(state.connections).set(connId, conn), totalConnections: state.totalConnections + 1 };
}

export function markGatewayOnline(state: SyncGatewayState, connId: string, latencyMs: number): SyncGatewayState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, status: 'online', connectedAt: Date.now(), latencyMs, lastPingAt: Date.now() }) };
}

export function markGatewayOffline(state: SyncGatewayState, connId: string): SyncGatewayState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, status: 'offline' }) };
}

export function recordBytesIn(state: SyncGatewayState, connId: string, bytes: number): SyncGatewayState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, bytesIn: c.bytesIn + bytes }), totalBytesIn: state.totalBytesIn + bytes };
}

export function recordBytesOut(state: SyncGatewayState, connId: string, bytes: number): SyncGatewayState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, bytesOut: c.bytesOut + bytes }), totalBytesOut: state.totalBytesOut + bytes };
}

export function pingGateway(state: SyncGatewayState, connId: string, latencyMs: number): SyncGatewayState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, latencyMs, lastPingAt: Date.now() }) };
}

export function getConnection(state: SyncGatewayState, connId: string): GatewayConnection | undefined {
  return state.connections.get(connId);
}

export function getConnectionsByStatus(state: SyncGatewayState, status: GatewayStatus): GatewayConnection[] {
  return Array.from(state.connections.values()).filter(c => c.status === status);
}

export function getSyncGatewayReport(state: SyncGatewayState): { totalConnections: number; online: number; totalBytesIn: number; totalBytesOut: number; avgLatency: number } {
  const conns = Array.from(state.connections.values());
  const online = conns.filter(c => c.status === 'online');
  const avgLatency = online.length > 0 ? online.reduce((a, b) => a + b.latencyMs, 0) / online.length : 0;
  return { totalConnections: conns.length, online: online.length, totalBytesIn: state.totalBytesIn, totalBytesOut: state.totalBytesOut, avgLatency };
}
