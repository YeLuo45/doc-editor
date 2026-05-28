/**
 * V26 Zero-Code Agent Canvas - CanvasEdge Module
 * Edge connections with createEdge/updateEdge/getEdgeState
 */

export interface CanvasEdgeData {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  properties: Record<string, unknown>;
  state: {
    selected: boolean;
    visible: boolean;
    animated: boolean;
  };
}

export interface EdgeSnapshot {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  properties: Record<string, unknown>;
  state: { selected: boolean; visible: boolean; animated: boolean };
  timestamp: number;
}

export interface EdgeReport {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  propertyCount: number;
  isSelected: boolean;
  isVisible: boolean;
  isAnimated: boolean;
  direction: 'incoming' | 'outgoing' | 'bidirectional';
}

export interface EdgeMetrics {
  edgeId: string;
  fromId: string;
  toId: string;
  type: string;
  propertyCount: number;
  length: number;
  angle: number;
}

export class CanvasEdge {
  private id: string;
  private fromId: string;
  private toId: string;
  private type: string;
  private properties: Map<string, unknown> = new Map();
  private state: {
    selected: boolean;
    visible: boolean;
    animated: boolean;
  };
  private createdAt: number;
  private updatedAt: number;

  constructor(id: string, fromId: string, toId: string, type: string = 'default') {
    this.id = id;
    this.fromId = fromId;
    this.toId = toId;
    this.type = type;
    this.state = { selected: false, visible: true, animated: false };
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }

  getId(): string {
    return this.id;
  }

  getFromId(): string {
    return this.fromId;
  }

  getToId(): string {
    return this.toId;
  }

  getType(): string {
    return this.type;
  }

  setType(type: string): void {
    this.type = type;
    this.updatedAt = Date.now();
  }

  setFromId(fromId: string): void {
    this.fromId = fromId;
    this.updatedAt = Date.now();
  }

  setToId(toId: string): void {
    this.toId = toId;
    this.updatedAt = Date.now();
  }

  setEndpoints(fromId: string, toId: string): void {
    this.fromId = fromId;
    this.toId = toId;
    this.updatedAt = Date.now();
  }

  getProperty(key: string): unknown {
    return this.properties.get(key);
  }

  setProperty(key: string, value: unknown): void {
    this.properties.set(key, value);
    this.updatedAt = Date.now();
  }

  removeProperty(key: string): boolean {
    const result = this.properties.delete(key);
    if (result) {
      this.updatedAt = Date.now();
    }
    return result;
  }

  updateProperty(key: string, value: unknown): void {
    this.properties.set(key, value);
    this.updatedAt = Date.now();
  }

  getAllProperties(): Record<string, unknown> {
    return Object.fromEntries(this.properties);
  }

  setSelected(selected: boolean): void {
    this.state.selected = selected;
    this.updatedAt = Date.now();
  }

  isSelected(): boolean {
    return this.state.selected;
  }

  setVisible(visible: boolean): void {
    this.state.visible = visible;
    this.updatedAt = Date.now();
  }

  isVisible(): boolean {
    return this.state.visible;
  }

  setAnimated(animated: boolean): void {
    this.state.animated = animated;
    this.updatedAt = Date.now();
  }

  isAnimated(): boolean {
    return this.state.animated;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getUpdatedAt(): number {
    return this.updatedAt;
  }

  connectsNode(nodeId: string): boolean {
    return this.fromId === nodeId || this.toId === nodeId;
  }

  connectsNodes(fromId: string, toId: string): boolean {
    return (this.fromId === fromId && this.toId === toId) ||
           (this.fromId === toId && this.toId === fromId);
  }

  getData(): CanvasEdgeData {
    return {
      id: this.id,
      fromId: this.fromId,
      toId: this.toId,
      type: this.type,
      properties: this.getAllProperties(),
      state: { ...this.state },
    };
  }

  getSnapshot(): EdgeSnapshot {
    return {
      id: this.id,
      fromId: this.fromId,
      toId: this.toId,
      type: this.type,
      properties: this.getAllProperties(),
      state: { ...this.state },
      timestamp: this.updatedAt,
    };
  }

  reset(): void {
    this.properties.clear();
    this.state = { selected: false, visible: true, animated: false };
    this.updatedAt = Date.now();
  }

  getReport(): EdgeReport {
    return {
      id: this.id,
      fromId: this.fromId,
      toId: this.toId,
      type: this.type,
      propertyCount: this.properties.size,
      isSelected: this.state.selected,
      isVisible: this.state.visible,
      isAnimated: this.state.animated,
      direction: 'outgoing',
    };
  }

  exportMetrics(): EdgeMetrics {
    return {
      edgeId: this.id,
      fromId: this.fromId,
      toId: this.toId,
      type: this.type,
      propertyCount: this.properties.size,
      length: 0,
      angle: 0,
    };
  }

  clone(): CanvasEdge {
    const cloned = new CanvasEdge(this.id, this.fromId, this.toId, this.type);
    cloned.state = { ...this.state };
    return cloned;
  }

  mergeProperties(updates: Record<string, unknown>): void {
    Object.entries(updates).forEach(([key, value]) => {
      this.properties.set(key, value);
    });
    this.updatedAt = Date.now();
  }

  toJSON(): CanvasEdgeData {
    return this.getData();
  }

  static fromJSON(data: CanvasEdgeData): CanvasEdge {
    const edge = new CanvasEdge(data.id, data.fromId, data.toId, data.type);
    edge.state = { ...data.state };
    return edge;
  }
}

export function createEdge(
  id: string,
  fromId: string,
  toId: string,
  type?: string
): CanvasEdge {
  return new CanvasEdge(id, fromId, toId, type);
}

export function updateEdge(edge: CanvasEdge, updates: Record<string, unknown>): CanvasEdge {
  Object.entries(updates).forEach(([key, value]) => {
    switch (key) {
      case 'fromId':
        edge.setFromId(value as string);
        break;
      case 'toId':
        edge.setToId(value as string);
        break;
      case 'type':
        edge.setType(value as string);
        break;
      default:
        edge.updateProperty(key, value);
    }
  });
  return edge;
}

export function getEdgeState(edge: CanvasEdge): Record<string, unknown> {
  return {
    id: edge.getId(),
    fromId: edge.getFromId(),
    toId: edge.getToId(),
    type: edge.getType(),
    properties: edge.getAllProperties(),
    state: {
      selected: edge.isSelected(),
      visible: edge.isVisible(),
      animated: edge.isAnimated(),
    },
    timestamps: {
      created: edge.getCreatedAt(),
      updated: edge.getUpdatedAt(),
    },
  };
}

export default CanvasEdge;