import { describe, it, expect } from 'vitest';
import {
  createTransportState, openConnection, markConnected, markFailed, closeConnection,
  sendMessage, receiveMessage, getConnection, getConnectionsByStatus, getTransportReport,
} from '../../federation/V217-SyncTransport';

describe('V217 SyncTransport', () => {
  it('should create empty state', () => {
    const s = createTransportState();
    expect(s.connections.size).toBe(0);
  });

  it('should open connection', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    expect(s.connections.size).toBe(1);
    expect(getConnection(s, 'c1')!.status).toBe('connecting');
  });

  it('should mark connected with latency', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    s = markConnected(s, 'c1', 50);
    expect(getConnection(s, 'c1')!.status).toBe('connected');
    expect(getConnection(s, 'c1')!.latencyMs).toBe(50);
  });

  it('should mark failed', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    s = markFailed(s, 'c1', 'timeout');
    expect(getConnection(s, 'c1')!.status).toBe('failed');
    expect(getConnection(s, 'c1')!.lastError).toBe('timeout');
  });

  it('should close connection', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    s = markConnected(s, 'c1', 50);
    s = closeConnection(s, 'c1');
    expect(getConnection(s, 'c1')!.status).toBe('disconnected');
  });

  it('should send message when connected', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    s = markConnected(s, 'c1', 50);
    s = sendMessage(s, 'c1', { op: 'update' });
    expect(s.totalSent).toBe(1);
    expect(getConnection(s, 'c1')!.bytesOut).toBeGreaterThan(0);
  });

  it('should not send message when not connected', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    s = sendMessage(s, 'c1', { op: 'update' });
    expect(s.totalSent).toBe(0);
  });

  it('should receive message', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'device1');
    s = receiveMessage(s, 'c1', { op: 'sync' });
    expect(s.totalReceived).toBe(1);
  });

  it('should get connections by status', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'd1');
    s = markConnected(s, 'c1', 50);
    s = openConnection(s, 'c2', 'websocket', 'd2');
    s = markFailed(s, 'c2', 'err');
    expect(getConnectionsByStatus(s, 'connected')).toHaveLength(1);
    expect(getConnectionsByStatus(s, 'failed')).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'd1');
    s = markConnected(s, 'c1', 50);
    s = sendMessage(s, 'c1', { x: 1 });
    const r = getTransportReport(s);
    expect(r.connected).toBe(1);
    expect(r.totalSent).toBe(1);
  });

  it('should cap message queue at 1000', () => {
    let s = createTransportState();
    s = openConnection(s, 'c1', 'websocket', 'd1');
    s = markConnected(s, 'c1', 50);
    for (let i = 0; i < 1500; i++) s = sendMessage(s, 'c1', { i });
    expect(s.messageQueue).toHaveLength(1000);
  });
});
