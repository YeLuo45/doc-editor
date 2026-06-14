/**
 * V224 DeviceRegistry - Direction C Doc Federation (Iter 10/30)
 * nanobot: Registry of all sync-enabled devices/instances
 */
export type DeviceStatus = 'online' | 'offline' | 'syncing' | 'paused' | 'error';

export interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'web' | 'server';
  status: DeviceStatus;
  userId: string;
  lastSeen: number;
  registeredAt: number;
  capabilities: string[];
  endpoint?: string;
}

export interface DeviceRegistryState {
  devices: Map<string, Device>;
  totalRegistrations: number;
}

export function createDeviceRegistryState(): DeviceRegistryState {
  return { devices: new Map(), totalRegistrations: 0 };
}

export function registerDevice(state: DeviceRegistryState, device: Omit<Device, 'registeredAt' | 'lastSeen'> & { lastSeen?: number }): DeviceRegistryState {
  const now = Date.now();
  return { ...state, devices: new Map(state.devices).set(device.id, { ...device, registeredAt: now, lastSeen: device.lastSeen || now }), totalRegistrations: state.totalRegistrations + 1 };
}

export function unregisterDevice(state: DeviceRegistryState, id: string): DeviceRegistryState {
  const devices = new Map(state.devices);
  devices.delete(id);
  return { ...state, devices };
}

export function updateDeviceStatus(state: DeviceRegistryState, id: string, status: DeviceStatus): DeviceRegistryState {
  const d = state.devices.get(id);
  if (!d) return state;
  return { ...state, devices: new Map(state.devices).set(id, { ...d, status, lastSeen: Date.now() }) };
}

export function heartbeatDevice(state: DeviceRegistryState, id: string): DeviceRegistryState {
  const d = state.devices.get(id);
  if (!d) return state;
  return { ...state, devices: new Map(state.devices).set(id, { ...d, lastSeen: Date.now() }) };
}

export function getDevice(state: DeviceRegistryState, id: string): Device | undefined {
  return state.devices.get(id);
}

export function getDevicesByUser(state: DeviceRegistryState, userId: string): Device[] {
  return Array.from(state.devices.values()).filter(d => d.userId === userId);
}

export function getDevicesByStatus(state: DeviceRegistryState, status: DeviceStatus): Device[] {
  return Array.from(state.devices.values()).filter(d => d.status === status);
}

export function getDevicesByCapability(state: DeviceRegistryState, capability: string): Device[] {
  return Array.from(state.devices.values()).filter(d => d.capabilities.includes(capability));
}

export function removeStaleDevices(state: DeviceRegistryState, maxAge: number = 300000): DeviceRegistryState {
  const now = Date.now();
  const devices = new Map(state.devices);
  for (const [id, d] of Array.from(devices.entries())) {
    if (now - d.lastSeen > maxAge) devices.delete(id);
  }
  return { ...state, devices };
}

export function getDeviceRegistryReport(state: DeviceRegistryState): { total: number; byType: Record<string, number>; byStatus: Record<string, number> } {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const d of state.devices.values()) {
    byType[d.type] = (byType[d.type] || 0) + 1;
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  }
  return { total: state.devices.size, byType, byStatus };
}
