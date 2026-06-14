import { describe, it, expect } from 'vitest';
import {
  createBuilderState, addNode, moveNode, removeNode, connectNodes,
  selectNode, updateNodeConfig, getConnectedNodes, clearCanvas, getBuilderReport,
} from '../../forge/V186-AgentBuilder';

describe('V186 AgentBuilder', () => {
  it('should create empty state', () => {
    const s = createBuilderState();
    expect(s.nodes.size).toBe(0);
    expect(s.edges.size).toBe(0);
  });

  it('should add node', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'My Agent', 100, 200);
    expect(s.nodes.size).toBe(1);
  });

  it('should move node', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    const id = s.nodes.keys().next().value as string;
    s = moveNode(s, id, 50, 60);
    expect(s.nodes.get(id)!.x).toBe(50);
    expect(s.nodes.get(id)!.y).toBe(60);
  });

  it('should remove node', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    const id = s.nodes.keys().next().value as string;
    s = removeNode(s, id);
    expect(s.nodes.size).toBe(0);
  });

  it('should connect nodes', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    s = addNode(s, 'tool', 'B', 100, 0);
    const ids = Array.from(s.nodes.keys());
    s = connectNodes(s, ids[0], ids[1], 'uses');
    expect(s.edges.size).toBe(1);
  });

  it('should remove connected edges when node removed', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    s = addNode(s, 'tool', 'B', 100, 0);
    const ids = Array.from(s.nodes.keys());
    s = connectNodes(s, ids[0], ids[1]);
    s = removeNode(s, ids[0]);
    expect(s.edges.size).toBe(0);
  });

  it('should select node', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    const id = s.nodes.keys().next().value as string;
    s = selectNode(s, id);
    expect(s.selectedNode).toBe(id);
  });

  it('should update node config', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    const id = s.nodes.keys().next().value as string;
    s = updateNodeConfig(s, id, { temperature: 0.5 });
    expect(s.nodes.get(id)!.config.temperature).toBe(0.5);
  });

  it('should get connected nodes', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    s = addNode(s, 'tool', 'B', 100, 0);
    s = addNode(s, 'input', 'C', 200, 0);
    const ids = Array.from(s.nodes.keys());
    s = connectNodes(s, ids[0], ids[1]);
    s = connectNodes(s, ids[1], ids[2]);
    const connected = getConnectedNodes(s, ids[1]);
    expect(connected).toHaveLength(2);
  });

  it('should clear canvas', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    s = clearCanvas(s);
    expect(s.nodes.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createBuilderState();
    s = addNode(s, 'agent', 'A', 0, 0);
    const r = getBuilderReport(s);
    expect(r.nodes).toBe(1);
  });
});
