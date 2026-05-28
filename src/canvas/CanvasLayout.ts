/**
 * V26 Zero-Code Agent Canvas - CanvasLayout Module
 * Layout engine with autoLayout/snapToGrid/getLayoutMetrics
 */

export interface Position {
  id: string;
  x: number;
  y: number;
}

export interface LayoutMetrics {
  complexity: number;
  width: number;
  height: number;
  nodeCount: number;
  avgDistance: number;
}

export interface LayoutConfig {
  gridSize: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  startX: number;
  startY: number;
  direction: 'horizontal' | 'vertical';
}

const DEFAULT_CONFIG: LayoutConfig = {
  gridSize: 20,
  horizontalSpacing: 200,
  verticalSpacing: 150,
  startX: 100,
  startY: 100,
  direction: 'horizontal',
};

export class CanvasLayout {
  private config: LayoutConfig;
  private lastLayoutTime: number = 0;

  constructor(config?: Partial<LayoutConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  autoLayout(positions: Position[]): { positions: Position[]; metrics: LayoutMetrics } {
    const nodes = positions.length;
    if (nodes === 0) {
      return {
        positions: [],
        metrics: this.getLayoutMetrics([]),
      };
    }

    const layout = this.calculateLayout(positions);
    this.lastLayoutTime = Date.now();
    return layout;
  }

  private calculateLayout(positions: Position[]): { positions: Position[]; metrics: LayoutMetrics } {
    const { startX, startY, horizontalSpacing, verticalSpacing, direction } = this.config;
    
    // Simple grid-based layout
    const cols = Math.ceil(Math.sqrt(positions.length));
    const updatedPositions = positions.map((pos, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      if (direction === 'horizontal') {
        return {
          id: pos.id,
          x: startX + col * horizontalSpacing,
          y: startY + row * verticalSpacing,
        };
      } else {
        return {
          id: pos.id,
          x: startX + row * horizontalSpacing,
          y: startY + col * verticalSpacing,
        };
      }
    });

    return {
      positions: updatedPositions,
      metrics: this.getLayoutMetrics(updatedPositions),
    };
  }

  snapToGrid(positions: Position[], gridSize?: number): Position[] {
    const size = gridSize || this.config.gridSize;
    return positions.map(pos => ({
      id: pos.id,
      x: Math.round(pos.x / size) * size,
      y: Math.round(pos.y / size) * size,
    }));
  }

  getLayoutMetrics(positions: Position[]): LayoutMetrics {
    const nodeCount = positions.length;
    
    if (nodeCount === 0) {
      return { complexity: 0, width: 0, height: 0, nodeCount: 0, avgDistance: 0 };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let totalDistance = 0;
    let pairCount = 0;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    });

    // Calculate average distance between adjacent nodes
    const sortedX = [...positions].sort((a, b) => a.x - b.x);
    const sortedY = [...positions].sort((a, b) => a.y - b.y);

    for (let i = 1; i < sortedX.length; i++) {
      totalDistance += sortedX[i].x - sortedX[i - 1].x;
      pairCount++;
    }
    for (let i = 1; i < sortedY.length; i++) {
      totalDistance += sortedY[i].y - sortedY[i - 1].y;
      pairCount++;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
    const complexity = nodeCount * (width + height) / 1000;

    return {
      complexity: Math.min(complexity, 100),
      width,
      height,
      nodeCount,
      avgDistance,
    };
  }

  getConfig(): LayoutConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getLastLayoutTime(): number {
    return this.lastLayoutTime;
  }

  getSnapshot(): { config: LayoutConfig; lastLayoutTime: number } {
    return {
      config: this.getConfig(),
      lastLayoutTime: this.lastLayoutTime,
    };
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.lastLayoutTime = 0;
  }

  getReport(): {
    nodeCount: number;
    direction: string;
    gridSize: number;
    lastLayoutTime: number;
  } {
    return {
      nodeCount: 0,
      direction: this.config.direction,
      gridSize: this.config.gridSize,
      lastLayoutTime: this.lastLayoutTime,
    };
  }

  exportMetrics(): {
    layoutAlgorithm: string;
    complexity: number;
    gridSize: number;
    spacing: { horizontal: number; vertical: number };
  } {
    return {
      layoutAlgorithm: 'grid-based',
      complexity: 0,
      gridSize: this.config.gridSize,
      spacing: {
        horizontal: this.config.horizontalSpacing,
        vertical: this.config.verticalSpacing,
      },
    };
  }

  applyForces(
    positions: Position[],
    iterations: number = 50
  ): Position[] {
    // Simple force-directed layout (placeholder implementation)
    const result = [...positions];
    for (let i = 0; i < iterations; i++) {
      // Apply repulsion between nodes
      for (let j = 0; j < result.length; j++) {
        for (let k = j + 1; k < result.length; k++) {
          const dx = result[k].x - result[j].x;
          const dy = result[k].y - result[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 100 / (dist * dist);
          
          result[j].x -= (dx / dist) * force;
          result[j].y -= (dy / dist) * force;
          result[k].x += (dx / dist) * force;
          result[k].y += (dy / dist) * force;
        }
      }
    }
    return result;
  }

  static calculateDistance(p1: Position, p2: Position): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export default CanvasLayout;