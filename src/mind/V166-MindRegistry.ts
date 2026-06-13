/**
 * V166 MindRegistry - Direction A Writing Mind (Iter 12/30)
 * nanobot: writing mind services registry (discover/list/invoke)
 */
export type ServiceStatus = 'active' | 'inactive' | 'error' | 'loading';

export interface ServiceDefinition {
  name: string;
  version: string;
  description: string;
  status: ServiceStatus;
  tags: string[];
  handler: (...args: any[]) => any;
}

export interface RegistryState {
  services: Map<string, ServiceDefinition>;
  callLog: Array<{ name: string; timestamp: number; success: boolean }>;
}

export function createRegistry(): RegistryState {
  return { services: new Map(), callLog: [] };
}

export function registerService(state: RegistryState, definition: ServiceDefinition): RegistryState {
  const services = new Map(state.services);
  services.set(definition.name, definition);
  return { ...state, services };
}

export function unregisterService(state: RegistryState, name: string): RegistryState {
  const services = new Map(state.services);
  services.delete(name);
  return { ...state, services };
}

export function invokeService(state: RegistryState, name: string, ...args: any[]): { state: RegistryState; result?: any; error?: string } {
  const service = state.services.get(name);
  if (!service) {
    return { state: { ...state, callLog: [...state.callLog, { name, timestamp: Date.now(), success: false }].slice(-100) }, error: `Service not found: ${name}` };
  }
  try {
    const result = service.handler(...args);
    return {
      state: { ...state, callLog: [...state.callLog, { name, timestamp: Date.now(), success: true }].slice(-100) },
      result,
    };
  } catch (e) {
    return {
      state: { ...state, callLog: [...state.callLog, { name, timestamp: Date.now(), success: false }].slice(-100) },
      error: String(e),
    };
  }
}

export function listServices(state: RegistryState): ServiceDefinition[] {
  return Array.from(state.services.values());
}

export function findServicesByTag(state: RegistryState, tag: string): ServiceDefinition[] {
  return Array.from(state.services.values()).filter(s => s.tags.includes(tag));
}

export function setServiceStatus(state: RegistryState, name: string, status: ServiceStatus): RegistryState {
  const service = state.services.get(name);
  if (!service) return state;
  const services = new Map(state.services);
  services.set(name, { ...service, status });
  return { ...state, services };
}

export function getRegistryReport(state: RegistryState): { total: number; byStatus: Record<string, number>; totalCalls: number; errorRate: number } {
  const services = Array.from(state.services.values());
  const byStatus: Record<string, number> = {};
  for (const s of services) byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  const totalCalls = state.callLog.length;
  const errorCalls = state.callLog.filter(c => !c.success).length;
  return { total: services.length, byStatus, totalCalls, errorRate: totalCalls > 0 ? errorCalls / totalCalls : 0 };
}

export function clearRegistry(): RegistryState {
  return createRegistry();
}
