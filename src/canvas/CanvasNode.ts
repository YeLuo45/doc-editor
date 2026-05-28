/**
 * V26 Zero-Code Agent Canvas - CanvasNode Module
 * Node representation with createNode/updateNode/getNodeState
 */

export interface CanvasNodeData {
  id: string;
  type: string;
  x: number;
  y: number;
  properties: Record<string, unknown>;
  state: {
    selected: boolean;
    visible: boolean;
    locked: boolean;
  };
}

export interface NodeSnapshot {
  id: string;
  type: string;
  position: { x: number; y: number };
  properties: Record<string, unknown>;
  state: { selected: boolean; visible: boolean; locked: boolean };
  timestamp: number;
}

export interface NodeReport {
  id: string;
  type: string;
  propertyCount: number;
  connectionCount: number;
  position: { x: number; y: number };
  isSelected: boolean;
  isVisible: boolean;
  isLocked: boolean;
}

export interface NodeMetrics {
  nodeId: string;
  propertyCount: number;
  connectionCount: number;
  x: number;
  y: number;
  depth: number;
  breadth: number;
}

export class CanvasNode {
  private id: string;
  private type: string;
  private x: number;
  private y: number;
  private properties: Map<string, unknown> = new Map();
  private state: {
    selected: boolean;
    visible: boolean;
    locked: boolean;
  };
  private createdAt: number;
  private updatedAt: number;

  constructor(id: string, type: string, x: number, y: number, data?: Record<string, unknown>) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.state = { selected: false, visible: true, locked: false };
    this.createdAt = Date.now();
    this.updatedAt = Date.now();

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        this.properties.set(key, value);
      });
    }
  }

  getId(): string {
    return this.id;
  }

  getType(): string {
    return this.type;
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
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

  setLocked(locked: boolean): void {
    this.state.locked = locked;
    this.updatedAt = Date.now();
  }

  isLocked(): boolean {
    return this.state.locked;
  }

  getCreatedAt(): number {
    return this.createdAt;
  }

  getUpdatedAt(): number {
    return this.updatedAt;
  }

  getData(): CanvasNodeData {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      properties: this.getAllProperties(),
      state: { ...this.state },
    };
  }

  getSnapshot(): NodeSnapshot {
    return {
      id: this.id,
      type: this.type,
      position: { x: this.x, y: this.y },
      properties: this.getAllProperties(),
      state: { ...this.state },
      timestamp: this.updatedAt,
    };
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.properties.clear();
    this.state = { selected: false, visible: true, locked: false };
    this.updatedAt = Date.now();
  }

  getReport(connectionCount: number = 0): NodeReport {
    return {
      id: this.id,
      type: this.type,
      propertyCount: this.properties.size,
      connectionCount,
      position: { x: this.x, y: this.y },
      isSelected: this.state.selected,
      isVisible: this.state.visible,
      isLocked: this.state.locked,
    };
  }

  exportMetrics(connectionCount: number = 0): NodeMetrics {
    return {
      nodeId: this.id,
      propertyCount: this.properties.size,
      connectionCount,
      x: this.x,
      y: this.y,
      depth: 0,
      breadth: 0,
    };
  }

  clone(): CanvasNode {
    const cloned = new CanvasNode(this.id, this.type, this.x, this.y, this.getAllProperties());
    cloned.state = { ...this.state };
    return cloned;
  }

  mergeProperties(updates: Record<string, unknown>): void {
    Object.entries(updates).forEach(([key, value]) => {
      this.properties.set(key, value);
    });
    this.updatedAt = Date.now();
  }

  toJSON(): CanvasNodeData {
    return this.getData();
  }

  static fromJSON(data: CanvasNodeData): CanvasNode {
    const node = new CanvasNode(data.id, data.type, data.x, data.y, data.properties);
    node.state = { ...data.state };
    return node;
  }
}

export function createNode(
  id: string,
  type: string,
  x: number,
  y: number,
  data?: Record<string, unknown>
): CanvasNode {
  return new CanvasNode(id, type, x, y, data);
}

export function updateNode(node: CanvasNode, updates: Record<string, unknown>): CanvasNode {
  Object.entries(updates).forEach(([key, value]) => {
    if (key === 'x') node.setPosition(value as number, node.getY());
    else if (key === 'y') node.setPosition(node.getX(), value as number);
    else node.updateProperty(key, value);
  });
  return node;
}

export function getNodeState(node: CanvasNode): Record<string, unknown> {
  return {
    id: node.getId(),
    type: node.getType(),
    position: { x: node.getX(), y: node.getY() },
    properties: node.getAllProperties(),
    state: {
      selected: node.isSelected(),
      visible: node.isVisible(),
      locked: node.isLocked(),
    },
    timestamps: {
      created: node.getCreatedAt(),
      updated: node.getUpdatedAt(),
    },
  };
}

export default CanvasNode;