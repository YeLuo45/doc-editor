/**
 * V217 SyncTransport - Direction C Doc Federation (Iter 3/30)
 * thunderbolt: Transport layer (WebSocket/HTTP/Peer) for sync messages
 */
export type TransportType = 'websocket' | 'http' | 'webrtc' | 'broadcast';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface TransportConnection {
  id: string;
  type: TransportType;
  remoteDeviceId: string;
  status: ConnectionStatus;
  latencyMs: number;
  bytesIn: number;
  bytesOut: number;
  connectedAt?: number;
  lastError?: string;
}

export interface TransportState {
  connections: Map<string, TransportConnection>;
  messageQueue: Array<{ connId: string; payload: any; timestamp: number }>;
  totalSent: number;
  totalReceived: number;
}

export function createTransportState(): TransportState {
  return { connections: new Map(), messageQueue: [], totalSent: 0, totalReceived: 0 };
}

export function openConnection(state: TransportState, connId: string, type: TransportType, remoteDeviceId: string): TransportState {
  const conn: TransportConnection = { id: connId, type, remoteDeviceId, status: 'connecting', latencyMs: 0, bytesIn: 0, bytesOut: 0 };
  return { ...state, connections: new Map(state.connections).set(connId, conn) };
}

export function markConnected(state: TransportState, connId: string, latencyMs: number): TransportState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, status: 'connected', latencyMs, connectedAt: Date.now() }) };
}

export function markFailed(state: TransportState, connId: string, error: string): TransportState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, status: 'failed', lastError: error }) };
}

export function closeConnection(state: TransportState, connId: string): TransportState {
  const c = state.connections.get(connId);
  if (!c) return state;
  return { ...state, connections: new Map(state.connections).set(connId, { ...c, status: 'disconnected' }) };
}

export function sendMessage(state: TransportState, connId: string, payload: any): TransportState {
  const c = state.connections.get(connId);
  if (!c || c.status !== 'connected') return state;
  const bytes = JSON.stringify(payload).length;
  return {
    ...state,
    connections: new Map(state.connections).set(connId, { ...c, bytesOut: c.bytesOut + bytes }),
    totalSent: state.totalSent + 1,
    messageQueue: [...state.messageQueue, { connId, payload, timestamp: Date.now() }].slice(-1000),
  };
}

export function receiveMessage(state: TransportState, connId: string, payload: any): TransportState {
  const c = state.connections.get(connId);
  if (!c) return state;
  const bytes = JSON.stringify(payload).length;
  return {
    ...state,
    connections: new Map(state.connections).set(connId, { ...c, bytesIn: c.bytesIn + bytes }),
    totalReceived: state.totalReceived + 1,
  };
}

export function getConnection(state: TransportState, connId: string): TransportConnection | undefined {
  return state.connections.get(connId);
}

export function getConnectionsByStatus(state: TransportState, status: ConnectionStatus): TransportConnection[] {
  return Array.from(state.connections.values()).filter(c => c.status === status);
}

export function getTransportReport(state: TransportState): { totalConnections: number; connected: number; failed: number; totalSent: number; totalReceived: number; totalBytes: number } {
  const conns = Array.from(state.connections.values());
  const totalBytes = conns.reduce((a, b) => a + b.bytesIn + b.bytesOut, 0);
  return {
    totalConnections: conns.length,
    connected: getConnectionsByStatus(state, 'connected').length,
    failed: getConnectionsByStatus(state, 'failed').length,
    totalSent: state.totalSent,
    totalReceived: state.totalReceived,
    totalBytes,
  };
}
