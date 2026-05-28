/**
 * V26 Zero-Code Agent Canvas - AgentCanvas Module
 * Canvas management with addNode/removeNode/connect/disconnect
 */

import { CanvasNode, CanvasNodeData } from './CanvasNode';
import { CanvasEdge, CanvasEdgeData } from './CanvasEdge';
import { CanvasLayout } from './CanvasLayout';
import { CanvasSerializer } from './CanvasSerializer';
import { CanvasRenderer } from './CanvasRenderer';

export interface NodePosition {
  x: number;
  y: number;
}

export interface CanvasSnapshot {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  version: string;
  timestamp: number;
}

export interface CanvasReport {
  nodeCount: number;
  edgeCount: number;
  connectedNodes: number;
  orphanedNodes: number;
  lastModified: number;
}

export interface CanvasMetrics {
  totalNodes: number;
  totalEdges: number;
  avgConnectionsPerNode: number;
  layoutComplexity: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class AgentCanvas {
  private nodes: Map<string, CanvasNode> = new Map();
  private edges: Map<string, CanvasEdge> = new Map();
  private layout: CanvasLayout;
  private serializer: CanvasSerializer;
  private renderer: CanvasRenderer;
  private version: string = 'V26';
  private lastModified: number = Date.now();

  constructor() {
    this.layout = new CanvasLayout();
    this.serializer = new CanvasSerializer();
    this.renderer = new CanvasRenderer();
  }

  addNode(id: string, type: string, x: number, y: number, data?: Record<string, unknown>): CanvasNode {
    const node = new CanvasNode(id, type, x, y, data);
    this.nodes.set(id, node);
    this.lastModified = Date.now();
    return node;
  }

  removeNode(id: string): boolean {
    // Remove all connected edges first
    const connectedEdges = this.getConnectedEdges(id);
    connectedEdges.forEach(edge => this.edges.delete(edge.getId()));
    
    const result = this.nodes.delete(id);
    if (result) {
      this.lastModified = Date.now();
    }
    return result;
  }

  connect(fromId: string, toId: string, edgeType: string = 'default'): CanvasEdge | null {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      return null;
    }
    
    // Check if edge already exists
    const existingEdge = Array.from(this.edges.values()).find(
      e => e.getFromId() === fromId && e.getToId() === toId
    );
    if (existingEdge) {
      return null;
    }

    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const edge = new CanvasEdge(edgeId, fromId, toId, edgeType);
    this.edges.set(edgeId, edge);
    this.lastModified = Date.now();
    return edge;
  }

  disconnect(edgeId: string): boolean {
    const result = this.edges.delete(edgeId);
    if (result) {
      this.lastModified = Date.now();
    }
    return result;
  }

  getNode(nodeId: string): CanvasNode | undefined {
    return this.nodes.get(nodeId);
  }

  getEdge(edgeId: string): CanvasEdge | undefined {
    return this.edges.get(edgeId);
  }

  getAllNodes(): CanvasNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): CanvasEdge[] {
    return Array.from(this.edges.values());
  }

  getConnectedEdges(nodeId: string): CanvasEdge[] {
    return Array.from(this.edges.values()).filter(
      edge => edge.getFromId() === nodeId || edge.getToId() === nodeId
    );
  }

  getCanvas(): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
    };
  }

  getSnapshot(): CanvasSnapshot {
    return {
      nodes: Array.from(this.nodes.values()).map(n => n.getData()),
      edges: Array.from(this.edges.values()).map(e => e.getData()),
      version: this.version,
      timestamp: this.lastModified,
    };
  }

  reset(): void {
    this.nodes.clear();
    this.edges.clear();
    this.lastModified = Date.now();
  }

  getReport(): CanvasReport {
    const connectedNodeIds = new Set<string>();
    this.edges.forEach(edge => {
      connectedNodeIds.add(edge.getFromId());
      connectedNodeIds.add(edge.getToId());
    });

    const orphanedNodes = Array.from(this.nodes.values()).filter(
      node => !connectedNodeIds.has(node.getId())
    ).length;

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      connectedNodes: connectedNodeIds.size,
      orphanedNodes,
      lastModified: this.lastModified,
    };
  }

  exportMetrics(): CanvasMetrics {
    const layoutMetrics = this.layout.getLayoutMetrics(
      Array.from(this.nodes.values()).map(n => ({ id: n.getId(), x: n.getX(), y: n.getY() }))
    );

    const totalConnections = Array.from(this.edges.values()).reduce((sum, edge) => {
      return sum + 1;
    }, 0);

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      avgConnectionsPerNode: this.nodes.size > 0 
        ? totalConnections / this.nodes.size 
        : 0,
      layoutComplexity: layoutMetrics.complexity,
      canvasWidth: layoutMetrics.width,
      canvasHeight: layoutMetrics.height,
    };
  }

  autoLayout(): void {
    const nodeData = Array.from(this.nodes.values()).map(n => ({
      id: n.getId(),
      x: n.getX(),
      y: n.getY(),
    }));
    
    const layoutResult = this.layout.autoLayout(nodeData);
    
    layoutResult.positions.forEach(pos => {
      const node = this.nodes.get(pos.id);
      if (node) {
        node.setPosition(pos.x, pos.y);
      }
    });
  }

  snapToGrid(gridSize: number = 20): void {
    this.nodes.forEach(node => {
      const x = Math.round(node.getX() / gridSize) * gridSize;
      const y = Math.round(node.getY() / gridSize) * gridSize;
      node.setPosition(x, y);
    });
  }

  serialize(): string {
    return this.serializer.serialize(this.getSnapshot());
  }

  deserialize(data: string): boolean {
    const snapshot = this.serializer.deserialize(data);
    if (!snapshot) {
      return false;
    }
    
    this.reset();
    
    snapshot.nodes.forEach(nodeData => {
      const node = new CanvasNode(
        nodeData.id,
        nodeData.type,
        nodeData.x,
        nodeData.y,
        nodeData.properties
      );
      this.nodes.set(nodeData.id, node);
    });

    snapshot.edges.forEach(edgeData => {
      const edge = new CanvasEdge(
        edgeData.id,
        edgeData.fromId,
        edgeData.toId,
        edgeData.type
      );
      this.edges.set(edgeData.id, edge);
    });

    this.lastModified = snapshot.timestamp;
    return true;
  }

  exportCanvas(): Record<string, unknown> {
    return this.serializer.exportCanvas(this.getSnapshot());
  }

  importCanvas(data: Record<string, unknown>): boolean {
    const snapshot = this.serializer.importCanvas(data);
    if (!snapshot) {
      return false;
    }
    
    this.reset();
    
    snapshot.nodes.forEach(nodeData => {
      const node = new CanvasNode(
        nodeData.id,
        nodeData.type,
        nodeData.x,
        nodeData.y,
        nodeData.properties
      );
      this.nodes.set(nodeData.id, node);
    });

    snapshot.edges.forEach(edgeData => {
      const edge = new CanvasEdge(
        edgeData.id,
        edgeData.fromId,
        edgeData.toId,
        edgeData.type
      );
      this.edges.set(edgeData.id, edge);
    });

    return true;
  }

  render(): string {
    return this.renderer.render(this.getSnapshot());
  }

  update(nodeId: string, updates: Record<string, unknown>): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'x') node.setPosition(value as number, node.getY());
      else if (key === 'y') node.setPosition(node.getX(), value as number);
      else node.updateProperty(key, value);
    });
    
    this.lastModified = Date.now();
    return true;
  }

  getCanvasState(): Record<string, unknown> {
    return this.renderer.getCanvasState(this.getSnapshot());
  }
}

export default AgentCanvas;