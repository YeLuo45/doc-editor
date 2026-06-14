import { describe, it, expect } from 'vitest';
import {
  createDiscoveryState, addAgent, removeAgent, discover, discoverByCapability,
  discoverByTag, clearKnown, getDiscoveryReport,
} from '../../forge/V198-AgentDiscovery';

describe('V198 AgentDiscovery', () => {
  it('should create empty state', () => {
    const s = createDiscoveryState();
    expect(s.known.size).toBe(0);
  });

  it('should add agent', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'Agent', description: 'desc', capabilities: ['edit'], tags: ['editor'], source: 'local' });
    expect(s.known.size).toBe(1);
  });

  it('should remove agent', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: [], tags: [], source: 'local' });
    s = removeAgent(s, 'a');
    expect(s.known.size).toBe(0);
  });

  it('should discover by text', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'EditorAgent', description: 'edit docs', capabilities: ['edit'], tags: [], source: 'local' });
    s = addAgent(s, { id: 'b', name: 'ReviewerAgent', description: 'review', capabilities: ['review'], tags: [], source: 'local' });
    const { results } = discover(s, { text: 'edit' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('a');
  });

  it('should discover by capability', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: ['edit'], tags: [], source: 'local' });
    s = addAgent(s, { id: 'b', name: 'B', description: '', capabilities: ['review'], tags: [], source: 'local' });
    const { results, state: newState } = discoverByCapability(s, 'edit');
    expect(results.some(r => r.id === 'a')).toBe(true);
  });

  it('should discover by tag', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: [], tags: ['editor'], source: 'local' });
    const { results } = discoverByTag(s, 'editor');
    expect(results).toHaveLength(1);
  });

  it('should filter by source', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: ['x'], tags: [], source: 'local' });
    s = addAgent(s, { id: 'b', name: 'B', description: '', capabilities: ['x'], tags: [], source: 'registry' });
    const { results } = discover(s, { capabilities: ['x'], source: 'local' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a');
  });

  it('should limit results', () => {
    let s = createDiscoveryState();
    for (let i = 0; i < 10; i++) s = addAgent(s, { id: `a${i}`, name: `Agent${i}`, description: 'edit', capabilities: ['edit'], tags: [], source: 'local' });
    const { results } = discover(s, { text: 'edit', limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('should track query history', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: ['edit'], tags: [], source: 'local' });
    const r1 = discover(s, { capabilities: ['edit'] });
    s = r1.state;
    expect(s.queryHistory).toHaveLength(1);
  });

  it('should clear known', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: [], tags: [], source: 'local' });
    s = clearKnown(s);
    expect(s.known.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createDiscoveryState();
    s = addAgent(s, { id: 'a', name: 'A', description: '', capabilities: ['x'], tags: [], source: 'local' });
    const r1 = discover(s, { capabilities: ['x'] });
    s = r1.state;
    const r = getDiscoveryReport(s);
    expect(r.knownAgents).toBe(1);
    expect(r.queriesRun).toBe(1);
  });
});
