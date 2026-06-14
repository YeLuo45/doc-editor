import { describe, it, expect } from 'vitest';
import {
  createDistributionState, addInstance, removeInstance, setInstanceStatus,
  startDistribution, markDistributionStatus, getDistributionsByStatus,
  getDistributionsByInstance, getDistributionsByAgent, getOnlineInstances, getDistributionReport,
} from '../../forge/V197-AgentDistribution';

describe('V197 AgentDistribution', () => {
  it('should create empty state', () => {
    const s = createDistributionState();
    expect(s.instances.size).toBe(0);
  });

  it('should add instance', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'Instance 1', url: 'https://x.com' });
    expect(s.instances.size).toBe(1);
  });

  it('should remove instance', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = removeInstance(s, 'i1');
    expect(s.instances.size).toBe(0);
  });

  it('should set instance status', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = setInstanceStatus(s, 'i1', 'online');
    expect(s.instances.get('i1')!.status).toBe('online');
  });

  it('should start distribution', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = startDistribution(s, 'agent1', '1.0.0', 'i1');
    expect(s.distributions).toHaveLength(1);
  });

  it('should mark distribution status', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = startDistribution(s, 'a', '1.0', 'i1');
    const id = s.distributions[0].id;
    s = markDistributionStatus(s, id, 'success');
    expect(s.distributions[0].status).toBe('success');
  });

  it('should get distributions by status', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = startDistribution(s, 'a', '1.0', 'i1');
    s = startDistribution(s, 'b', '1.0', 'i1');
    expect(getDistributionsByStatus(s, 'pending')).toHaveLength(2);
  });

  it('should get distributions by instance', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = addInstance(s, { id: 'i2', name: 'b', url: 'https://y' });
    s = startDistribution(s, 'a', '1.0', 'i1');
    s = startDistribution(s, 'b', '1.0', 'i2');
    expect(getDistributionsByInstance(s, 'i1')).toHaveLength(1);
  });

  it('should get distributions by agent', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = startDistribution(s, 'agent1', '1.0', 'i1');
    s = startDistribution(s, 'agent2', '1.0', 'i1');
    expect(getDistributionsByAgent(s, 'agent1')).toHaveLength(1);
  });

  it('should get online instances', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    s = addInstance(s, { id: 'i2', name: 'b', url: 'https://y' });
    s = setInstanceStatus(s, 'i1', 'online');
    expect(getOnlineInstances(s)).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createDistributionState();
    s = addInstance(s, { id: 'i1', name: 'a', url: 'https://x' });
    const r = getDistributionReport(s);
    expect(r.instances).toBe(1);
  });
});
