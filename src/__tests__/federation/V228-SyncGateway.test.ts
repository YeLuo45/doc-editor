import { describe, it, expect } from 'vitest';
import {
  createSyncGatewayState, connectGateway, markGatewayOnline, markGatewayOffline,
  recordBytesIn, recordBytesOut, pingGateway, getConnection, getConnectionsByStatus, getSyncGatewayReport,
} from '../../federation/V228-SyncGateway';

describe('V228 SyncGateway', () => {
  it('should create empty state', () => {
    const s = createSyncGatewayState();
    expect(s.connections.size).toBe(0);
  });

  it('should connect gateway', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'remote1', 'https://x');
    expect(s.connections.size).toBe(1);
    expect(getConnection(s, 'c1')!.status).toBe('connecting');
  });

  it('should mark online', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'r1', 'https://x');
    s = markGatewayOnline(s, 'c1', 50);
    expect(getConnection(s, 'c1')!.status).toBe('online');
    expect(getConnection(s, 'c1')!.latencyMs).toBe(50);
  });

  it('should mark offline', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'r1', 'https://x');
    s = markGatewayOffline(s, 'c1');
    expect(getConnection(s, 'c1')!.status).toBe('offline');
  });

  it('should record bytes in/out', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'r1', 'https://x');
    s = recordBytesIn(s, 'c1', 100);
    s = recordBytesOut(s, 'c1', 50);
    expect(getConnection(s, 'c1')!.bytesIn).toBe(100);
    expect(getConnection(s, 'c1')!.bytesOut).toBe(50);
  });

  it('should ping', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'r1', 'https://x');
    s = pingGateway(s, 'c1', 25);
    expect(getConnection(s, 'c1')!.latencyMs).toBe(25);
  });

  it('should get connections by status', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'r1', 'https://x');
    s = connectGateway(s, 'c2', 'r2', 'https://y');
    s = markGatewayOnline(s, 'c1', 50);
    expect(getConnectionsByStatus(s, 'online')).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createSyncGatewayState();
    s = connectGateway(s, 'c1', 'r1', 'https://x');
    s = markGatewayOnline(s, 'c1', 50);
    s = recordBytesIn(s, 'c1', 100);
    s = recordBytesOut(s, 'c1', 50);
    const r = getSyncGatewayReport(s);
    expect(r.online).toBe(1);
    expect(r.totalBytesIn).toBe(100);
    expect(r.avgLatency).toBe(50);
  });
});
