import { describe, it, expect } from 'vitest';
import {
  createDeviceRegistryState, registerDevice, unregisterDevice, updateDeviceStatus, heartbeatDevice,
  getDevice, getDevicesByUser, getDevicesByStatus, getDevicesByCapability, removeStaleDevices, getDeviceRegistryReport,
  type Device,
} from '../../federation/V224-DeviceRegistry';

describe('V224 DeviceRegistry', () => {
  it('should create empty state', () => {
    const s = createDeviceRegistryState();
    expect(s.devices.size).toBe(0);
  });

  it('should register device', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'Laptop', type: 'desktop', status: 'online', userId: 'u1', capabilities: ['sync', 'edit'] });
    expect(s.devices.size).toBe(1);
  });

  it('should unregister device', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    s = unregisterDevice(s, 'd1');
    expect(s.devices.size).toBe(0);
  });

  it('should update device status', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    s = updateDeviceStatus(s, 'd1', 'offline');
    expect(s.devices.get('d1')!.status).toBe('offline');
  });

  it('should heartbeat', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    s = heartbeatDevice(s, 'd1');
    expect(s.devices.get('d1')!.lastSeen).toBeGreaterThan(0);
  });

  it('should get device by id', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    expect(getDevice(s, 'd1')).toBeDefined();
  });

  it('should get devices by user', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    s = registerDevice(s, { id: 'd2', name: 'b', type: 'mobile', status: 'online', userId: 'u1', capabilities: [] });
    s = registerDevice(s, { id: 'd3', name: 'c', type: 'mobile', status: 'online', userId: 'u2', capabilities: [] });
    expect(getDevicesByUser(s, 'u1')).toHaveLength(2);
  });

  it('should get devices by status', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    s = registerDevice(s, { id: 'd2', name: 'b', type: 'mobile', status: 'offline', userId: 'u2', capabilities: [] });
    expect(getDevicesByStatus(s, 'online')).toHaveLength(1);
  });

  it('should get devices by capability', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: ['sync'] });
    s = registerDevice(s, { id: 'd2', name: 'b', type: 'mobile', status: 'online', userId: 'u1', capabilities: ['edit'] });
    expect(getDevicesByCapability(s, 'sync')).toHaveLength(1);
  });

  it('should remove stale devices', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [], lastSeen: 1000 });
    s = registerDevice(s, { id: 'd2', name: 'b', type: 'mobile', status: 'online', userId: 'u1', capabilities: [] });
    s = removeStaleDevices(s, 30000);
    expect(s.devices.size).toBe(1);
  });

  it('should produce report', () => {
    let s = createDeviceRegistryState();
    s = registerDevice(s, { id: 'd1', name: 'a', type: 'desktop', status: 'online', userId: 'u1', capabilities: [] });
    s = registerDevice(s, { id: 'd2', name: 'b', type: 'mobile', status: 'offline', userId: 'u1', capabilities: [] });
    const r = getDeviceRegistryReport(s);
    expect(r.total).toBe(2);
    expect(r.byType.desktop).toBe(1);
  });
});
