import { describe, it, expect } from 'vitest';
import {
  createRegistry, registerService, unregisterService, invokeService,
  listServices, findServicesByTag, setServiceStatus, getRegistryReport, clearRegistry,
  type ServiceDefinition,
} from '../../mind/V166-MindRegistry';

describe('V166 MindRegistry', () => {
  it('should create empty registry', () => {
    const r = createRegistry();
    expect(r.services.size).toBe(0);
  });

  it('should register service', () => {
    let r = createRegistry();
    const svc: ServiceDefinition = { name: 'analyzer', version: '1.0', description: 'analyzes', status: 'active', tags: ['nlp'], handler: (x: any) => x };
    r = registerService(r, svc);
    expect(r.services.size).toBe(1);
  });

  it('should unregister service', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'a', version: '1.0', description: '', status: 'active', tags: [], handler: () => null });
    r = unregisterService(r, 'a');
    expect(r.services.size).toBe(0);
  });

  it('should invoke service', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'adder', version: '1.0', description: '', status: 'active', tags: [], handler: (a: number, b: number) => a + b });
    const { state, result, error } = invokeService(r, 'adder', 2, 3);
    expect(result).toBe(5);
    expect(error).toBeUndefined();
    expect(state.callLog).toHaveLength(1);
  });

  it('should return error for missing service', () => {
    const r = createRegistry();
    const { result, error } = invokeService(r, 'nonexistent');
    expect(result).toBeUndefined();
    expect(error).toContain('not found');
  });

  it('should catch service errors', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'failer', version: '1.0', description: '', status: 'active', tags: [], handler: () => { throw new Error('boom'); } });
    const { error } = invokeService(r, 'failer');
    expect(error).toContain('boom');
  });

  it('should list services', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'a', version: '1.0', description: '', status: 'active', tags: [], handler: () => null });
    r = registerService(r, { name: 'b', version: '1.0', description: '', status: 'active', tags: [], handler: () => null });
    expect(listServices(r)).toHaveLength(2);
  });

  it('should find services by tag', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'a', version: '1.0', description: '', status: 'active', tags: ['nlp'], handler: () => null });
    r = registerService(r, { name: 'b', version: '1.0', description: '', status: 'active', tags: ['render'], handler: () => null });
    expect(findServicesByTag(r, 'nlp')).toHaveLength(1);
  });

  it('should set service status', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'a', version: '1.0', description: '', status: 'active', tags: [], handler: () => null });
    r = setServiceStatus(r, 'a', 'error');
    expect(r.services.get('a')!.status).toBe('error');
  });

  it('should generate report', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'a', version: '1.0', description: '', status: 'active', tags: [], handler: () => null });
    r = registerService(r, { name: 'b', version: '1.0', description: '', status: 'error', tags: [], handler: () => null });
    invokeService(r, 'a');
    const report = getRegistryReport(r);
    expect(report.total).toBe(2);
    expect(report.byStatus.active).toBe(1);
    expect(report.byStatus.error).toBe(1);
  });

  it('should clear registry', () => {
    let r = createRegistry();
    r = registerService(r, { name: 'a', version: '1.0', description: '', status: 'active', tags: [], handler: () => null });
    r = clearRegistry();
    expect(r.services.size).toBe(0);
  });
});
