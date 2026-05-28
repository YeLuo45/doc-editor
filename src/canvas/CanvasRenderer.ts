/**
 * V26 Zero-Code Agent Canvas - CanvasRenderer Module
 * Rendering with render/update/getCanvasState
 */

import type { CanvasNodeData } from './CanvasNode';
import type { CanvasEdgeData } from './CanvasEdge';

export interface CanvasSnapshot {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  version: string;
  timestamp: number;
}

export interface RenderOptions {
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  showLabels: boolean;
  showConnections: boolean;
  nodeSize: { width: number; height: number };
}

const DEFAULT_OPTIONS: RenderOptions = {
  backgroundColor: '#0a0a0f',
  showGrid: true,
  gridSize: 20,
  showLabels: true,
  showConnections: true,
  nodeSize: { width: 160, height: 120 },
};

export interface CanvasState {
  nodes: Map<string, RenderedNode>;
  edges: Map<string, RenderedEdge>;
  viewport: { x: number; y: number; scale: number };
  options: RenderOptions;
}

export interface RenderedNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  properties: Record<string, unknown>;
}

export interface RenderedEdge {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: string;
  color: string;
  dashed: boolean;
}

export interface RenderMetrics {
  nodeCount: number;
  edgeCount: number;
  renderTime: number;
  canvasWidth: number;
  canvasHeight: number;
}

export class CanvasRenderer {
  private options: RenderOptions;
  private canvasState: CanvasState;
  private lastRenderTime: number = 0;

  constructor(options?: Partial<RenderOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.canvasState = this.createInitialState();
  }

  private createInitialState(): CanvasState {
    return {
      nodes: new Map(),
      edges: new Map(),
      viewport: { x: 0, y: 0, scale: 1 },
      options: { ...this.options },
    };
  }

  render(snapshot: CanvasSnapshot): string {
    const startTime = performance.now();
    
    this.canvasState.nodes.clear();
    this.canvasState.edges.clear();

    // Render nodes
    snapshot.nodes.forEach(node => {
      const renderedNode = this.renderNode(node);
      this.canvasState.nodes.set(node.id, renderedNode);
    });

    // Render edges
    snapshot.edges.forEach(edge => {
      const renderedEdge = this.renderEdge(edge, snapshot.nodes);
      this.canvasState.edges.set(edge.id, renderedEdge);
    });

    this.lastRenderTime = performance.now() - startTime;

    return this.generateSVG();
  }

  private renderNode(node: CanvasNodeData): RenderedNode {
    const colors: Record<string, string> = {
      agent: '#06b6d4',
      phase: '#f97316',
      task: '#22c55e',
      default: '#8b5cf6',
    };

    return {
      id: node.id,
      type: node.type,
      x: node.x,
      y: node.y,
      width: this.options.nodeSize.width,
      height: this.options.nodeSize.height,
      label: node.properties?.name as string || node.id,
      color: colors[node.type] || colors.default,
      properties: node.properties,
    };
  }

  private renderEdge(edge: CanvasEdgeData, nodes: CanvasNodeData[]): RenderedEdge {
    const fromNode = nodes.find(n => n.id === edge.fromId);
    const toNode = nodes.find(n => n.id === edge.toId);

    const colors: Record<string, string> = {
      agent: '#06b6d4',
      phase: '#f97316',
      task: '#22c55e',
      default: '#8b5cf6',
    };

    return {
      id: edge.id,
      from: {
        x: fromNode?.x ?? 0,
        y: fromNode?.y ?? 0,
      },
      to: {
        x: toNode?.x ?? 0,
        y: toNode?.y ?? 0,
      },
      type: edge.type,
      color: colors[edge.type] || colors.default,
      dashed: edge.type !== 'agent',
    };
  }

  private generateSVG(): string {
    const lines: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4000 3000">`,
      `<rect width="4000" height="3000" fill="${this.options.backgroundColor}"/>`,
    ];

    // Grid
    if (this.options.showGrid) {
      lines.push(this.generateGrid());
    }

    // Edges
    if (this.options.showConnections) {
      lines.push(this.generateEdges());
    }

    // Nodes
    lines.push(this.generateNodes());

    lines.push('</svg>');
    return lines.join('\n');
  }

  private generateGrid(): string {
    const { gridSize } = this.options;
    const lines: string[] = [];
    
    for (let x = 0; x <= 4000; x += gridSize) {
      lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="3000" stroke="#1a1a2e" stroke-width="1"/>`);
    }
    for (let y = 0; y <= 3000; y += gridSize) {
      lines.push(`<line x1="0" y1="${y}" x2="4000" y2="${y}" stroke="#1a1a2e" stroke-width="1"/>`);
    }
    
    return lines.join('');
  }

  private generateEdges(): string {
    const lines: string[] = [];
    
    this.canvasState.edges.forEach(edge => {
      const x1 = edge.from.x + 80;
      const y1 = edge.from.y + 60;
      const x2 = edge.to.x + 80;
      const y2 = edge.to.y + 60;
      
      lines.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
        `stroke="${edge.color}" stroke-width="2" ` +
        `stroke-dasharray="${edge.dashed ? '5,5' : 'none'}" ` +
        `opacity="0.6"/>`,
        `<circle cx="${x2}" cy="${y2}" r="6" fill="${edge.color}"/>`
      );
    });
    
    return lines.join('');
  }

  private generateNodes(): string {
    const lines: string[] = [];
    
    this.canvasState.nodes.forEach(node => {
      lines.push(
        `<g transform="translate(${node.x}, ${node.y})">`,
        `<rect width="${node.width}" height="${node.height}" `,
        `fill="#1a1a2e" stroke="${node.color}" stroke-width="2" rx="8"/>`,
        `<text x="${node.width/2}" y="30" text-anchor="middle" `,
        `fill="${node.color}" font-size="14" font-weight="600">${node.type}</text>`,
        `<text x="${node.width/2}" y="${node.height - 20}" text-anchor="middle" `,
        `fill="#a0a0b0" font-size="12">${node.label}</text>`,
        `</g>`
      );
    });
    
    return lines.join('');
  }

  update(nodeId: string, updates: Record<string, unknown>): boolean {
    const node = this.canvasState.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    if (updates.x !== undefined) node.x = updates.x as number;
    if (updates.y !== undefined) node.y = updates.y as number;
    if (updates.label !== undefined) node.label = updates.label as string;
    if (updates.color !== undefined) node.color = updates.color as string;

    return true;
  }

  getCanvasState(): Record<string, unknown> {
    return {
      nodeCount: this.canvasState.nodes.size,
      edgeCount: this.canvasState.edges.size,
      viewport: this.canvasState.viewport,
      options: this.canvasState.options,
      lastRenderTime: this.lastRenderTime,
    };
  }

  setViewport(x: number, y: number, scale: number): void {
    this.canvasState.viewport = { x, y, scale };
  }

  getViewport(): { x: number; y: number; scale: number } {
    return { ...this.canvasState.viewport };
  }

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.canvasState.options = { ...this.options };
  }

  getOptions(): RenderOptions {
    return { ...this.options };
  }

  getSnapshot(): {
    options: RenderOptions;
    lastRenderTime: number;
  } {
    return {
      options: this.options,
      lastRenderTime: this.lastRenderTime,
    };
  }

  reset(): void {
    this.options = { ...DEFAULT_OPTIONS };
    this.canvasState = this.createInitialState();
    this.lastRenderTime = 0;
  }

  getReport(): {
    nodeCount: number;
    edgeCount: number;
    lastRenderTime: number;
    viewport: { x: number; y: number; scale: number };
  } {
    return {
      nodeCount: this.canvasState.nodes.size,
      edgeCount: this.canvasState.edges.size,
      lastRenderTime: this.lastRenderTime,
      viewport: this.canvasState.viewport,
    };
  }

  exportMetrics(): RenderMetrics {
    return {
      nodeCount: this.canvasState.nodes.size,
      edgeCount: this.canvasState.edges.size,
      renderTime: this.lastRenderTime,
      canvasWidth: 4000,
      canvasHeight: 3000,
    };
  }
}

export default CanvasRenderer;