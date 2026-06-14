import { describe, it, expect } from 'vitest';
import {
  createSyncAdapterState, setDeviceContext, adaptSyncBehavior,
  getAdaptationForDevice, getAllAdaptations, clearAdaptations, getSyncAdapterReport,
} from '../../federation/V242-SyncAdapter';

describe('V242 SyncAdapter', () => {
  it('should create empty state', () => {
    const s = createSyncAdapterState();
    expect(s.adaptations.size).toBe(0);
  });

  it('should set device context', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'mobile', networkType: 'wifi', bandwidth: 5000, isCharging: true, storageQuotaUsed: 0.3 });
    expect(s.deviceContexts.size).toBe(1);
  });

  it('should adapt for offline', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'mobile', networkType: 'offline', bandwidth: 0, isCharging: true, storageQuotaUsed: 0.3 });
    s = adaptSyncBehavior(s, 'd1');
    expect(getAdaptationForDevice(s, 'd1')!.recommendedStrategy).toBe('lazy');
  });

  it('should adapt for wifi with eager', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'desktop', networkType: 'wifi', bandwidth: 50000, isCharging: true, storageQuotaUsed: 0.1 });
    s = adaptSyncBehavior(s, 'd1');
    expect(getAdaptationForDevice(s, 'd1')!.recommendedStrategy).toBe('eager');
  });

  it('should reduce batch size on low battery', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'mobile', networkType: 'wifi', bandwidth: 5000, batteryLevel: 0.1, isCharging: false, storageQuotaUsed: 0.3 });
    s = adaptSyncBehavior(s, 'd1');
    const a = getAdaptationForDevice(s, 'd1')!;
    expect(a.recommendedBatchSize).toBeLessThan(50);
    expect(a.reason).toContain('battery');
  });

  it('should reduce batch size on tight storage', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'mobile', networkType: 'wifi', bandwidth: 5000, isCharging: true, storageQuotaUsed: 0.95 });
    s = adaptSyncBehavior(s, 'd1');
    expect(getAdaptationForDevice(s, 'd1')!.reason).toContain('storage');
  });

  it('should return undefined for unadapted device', () => {
    const s = createSyncAdapterState();
    expect(getAdaptationForDevice(s, 'unknown')).toBeUndefined();
  });

  it('should get all adaptations', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'desktop', networkType: 'wifi', bandwidth: 5000, isCharging: true, storageQuotaUsed: 0.3 });
    s = adaptSyncBehavior(s, 'd1');
    s = setDeviceContext(s, 'd2', { type: 'mobile', networkType: 'cellular', bandwidth: 1000, isCharging: true, storageQuotaUsed: 0.3 });
    s = adaptSyncBehavior(s, 'd2');
    expect(getAllAdaptations(s)).toHaveLength(2);
  });

  it('should clear adaptations', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'mobile', networkType: 'wifi', bandwidth: 5000, isCharging: true, storageQuotaUsed: 0.3 });
    s = adaptSyncBehavior(s, 'd1');
    s = clearAdaptations(s);
    expect(s.adaptations.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createSyncAdapterState();
    s = setDeviceContext(s, 'd1', { type: 'mobile', networkType: 'wifi', bandwidth: 5000, isCharging: true, storageQuotaUsed: 0.3 });
    s = adaptSyncBehavior(s, 'd1');
    const r = getSyncAdapterReport(s);
    expect(r.adaptations).toBe(1);
    expect(r.devices).toBe(1);
  });
});
