/**
 * V186 AgentBuilder - Direction B Agent Forge (Iter 2/30)
 * thunderbolt: Drag-drop visual agent builder UI state
 */
export type CanvasNodeType = 'agent' | 'tool' | 'input' | 'output' | 'condition';

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  label?: string;
  condition?: string;
}

export interface BuilderState {
  nodes: Map<string, CanvasNode>;
  edges: Map<string, CanvasEdge>;
  selectedNode: string | null;
  nextId: number;
  history: string[];
}

export function createBuilderState(): BuilderState {
  return { nodes: new Map(), edges: new Map(), selectedNode: null, nextId: 1, history: [] };
}

export function addNode(state: BuilderState, type: CanvasNodeType, label: string, x: number, y: number): BuilderState {
  const id = `node-${state.nextId}`;
  const node: CanvasNode = { id, type, label, x, y, config: {} };
  return {
    ...state,
    nodes: new Map(state.nodes).set(id, node),
    nextId: state.nextId + 1,
    history: [...state.history, `add:${id}`].slice(-100),
  };
}

export function moveNode(state: BuilderState, id: string, x: number, y: number): BuilderState {
  const n = state.nodes.get(id);
  if (!n) return state;
  return { ...state, nodes: new Map(state.nodes).set(id, { ...n, x, y }), history: [...state.history, `move:${id}`].slice(-100) };
}

export function removeNode(state: BuilderState, id: string): BuilderState {
  const nodes = new Map(state.nodes);
  nodes.delete(id);
  // Also remove connected edges
  const edges = new Map(state.edges);
  for (const [eid, e] of Array.from(edges.entries())) {
    if (e.fromNode === id || e.toNode === id) edges.delete(eid);
  }
  return { ...state, nodes, edges, history: [...state.history, `remove:${id}`].slice(-100) };
}

export function connectNodes(state: BuilderState, fromNode: string, toNode: string, label?: string): BuilderState {
  const id = `edge-${state.nextId}`;
  const edge: CanvasEdge = { id, fromNode, toNode, label };
  return { ...state, edges: new Map(state.edges).set(id, edge), nextId: state.nextId + 1, history: [...state.history, `connect:${id}`].slice(-100) };
}

export function selectNode(state: BuilderState, id: string | null): BuilderState {
  return { ...state, selectedNode: id };
}

export function updateNodeConfig(state: BuilderState, id: string, config: Record<string, any>): BuilderState {
  const n = state.nodes.get(id);
  if (!n) return state;
  return { ...state, nodes: new Map(state.nodes).set(id, { ...n, config: { ...n.config, ...config } }) };
}

export function getConnectedNodes(state: BuilderState, id: string): CanvasNode[] {
  const connected = new Set<string>();
  for (const e of state.edges.values()) {
    if (e.fromNode === id) connected.add(e.toNode);
    if (e.toNode === id) connected.add(e.fromNode);
  }
  return Array.from(connected).map(nid => state.nodes.get(nid)).filter((n): n is CanvasNode => n !== undefined);
}

export function clearCanvas(state: BuilderState): BuilderState {
  return createBuilderState();
}

export function getBuilderReport(state: BuilderState): { nodes: number; edges: number; selected: string | null; historySize: number } {
  return { nodes: state.nodes.size, edges: state.edges.size, selected: state.selectedNode, historySize: state.history.length };
}
