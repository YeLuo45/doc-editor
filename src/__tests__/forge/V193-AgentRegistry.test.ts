import { describe, it, expect } from 'vitest';
import {
  createAgentRegistryState, registerAgent, unregisterAgent, setAgentStatus,
  invokeAgent, findByCapability, findByStatus, listAllAgents, getAgent, clearRegistry, getRegistryReport,
} from '../../forge/V193-AgentRegistry';

describe('V193 AgentRegistry', () => {
  it('should create empty state', () => {
    const s = createAgentRegistryState();
    expect(s.agents.size).toBe(0);
  });

  it('should register agent', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a1', name: 'agent1', version: '1.0', status: 'active', capabilities: ['edit'] });
    expect(s.agents.size).toBe(1);
  });

  it('should unregister agent', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a1', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    s = unregisterAgent(s, 'a1');
    expect(s.agents.size).toBe(0);
  });

  it('should set agent status', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    s = setAgentStatus(s, 'a', 'deprecated');
    expect(s.agents.get('a')!.status).toBe('deprecated');
  });

  it('should invoke agent', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    s = invokeAgent(s, 'a', true, 100);
    expect(s.agents.get('a')!.invocationCount).toBe(1);
    expect(s.callLog).toHaveLength(1);
  });

  it('should find by capability', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: ['edit'] });
    s = registerAgent(s, { id: 'b', name: 'b', version: '1.0', status: 'active', capabilities: ['review'] });
    expect(findByCapability(s, 'edit')).toHaveLength(1);
  });

  it('should find by status', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    s = registerAgent(s, { id: 'b', name: 'b', version: '1.0', status: 'deprecated', capabilities: [] });
    expect(findByStatus(s, 'active')).toHaveLength(1);
  });

  it('should list all agents', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    s = registerAgent(s, { id: 'b', name: 'b', version: '1.0', status: 'active', capabilities: [] });
    expect(listAllAgents(s)).toHaveLength(2);
  });

  it('should get agent by id', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    expect(getAgent(s, 'a')).toBeDefined();
  });

  it('should clear registry', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    s = clearRegistry(s);
    expect(s.agents.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createAgentRegistryState();
    s = registerAgent(s, { id: 'a', name: 'a', version: '1.0', status: 'active', capabilities: [] });
    const r = getRegistryReport(s);
    expect(r.total).toBe(1);
    expect(r.byStatus.active).toBe(1);
  });
});
