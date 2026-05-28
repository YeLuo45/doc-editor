/**
 * V26 Zero-Code Agent Canvas - CanvasSerializer Module
 * Save/load with serialize/deserialize/exportCanvas/importCanvas
 */

import type { CanvasNodeData } from './CanvasNode';
import type { CanvasEdgeData } from './CanvasEdge';

export interface CanvasSnapshot {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  version: string;
  timestamp: number;
}

export interface SerializedCanvas {
  format: 'json' | 'yaml';
  version: string;
  data: string;
  checksum: string;
}

export interface ExportFormat {
  type: 'json' | 'yaml' | 'png' | 'svg';
  compression: boolean;
}

export class CanvasSerializer {
  private format: 'json' | 'yaml' = 'json';
  private compressionEnabled: boolean = false;

  constructor(format: 'json' | 'yaml' = 'json') {
    this.format = format;
  }

  serialize(snapshot: CanvasSnapshot): string {
    const data = JSON.stringify(snapshot);
    
    if (this.compressionEnabled) {
      return this.compress(data);
    }
    return data;
  }

  deserialize(data: string): CanvasSnapshot | null {
    try {
      const decompressed = this.compressionEnabled ? this.decompress(data) : data;
      const parsed = JSON.parse(decompressed);
      
      if (!this.validateSnapshot(parsed)) {
        return null;
      }
      
      return parsed as CanvasSnapshot;
    } catch {
      return null;
    }
  }

  exportCanvas(snapshot: CanvasSnapshot): Record<string, unknown> {
    const serialized = this.serialize(snapshot);
    const checksum = this.calculateChecksum(serialized);
    
    return {
      format: this.format,
      version: snapshot.version,
      data: serialized,
      checksum,
      timestamp: snapshot.timestamp,
      nodeCount: snapshot.nodes.length,
      edgeCount: snapshot.edges.length,
    };
  }

  importCanvas(data: Record<string, unknown>): CanvasSnapshot | null {
    try {
      if (!this.validateImportData(data)) {
        return null;
      }
      
      const serialized = data.data as string;
      const checksum = data.checksum as string;
      const calculatedChecksum = this.calculateChecksum(serialized);
      
      if (checksum !== calculatedChecksum) {
        console.warn('Checksum mismatch, data may be corrupted');
      }
      
      return this.deserialize(serialized);
    } catch {
      return null;
    }
  }

  private validateSnapshot(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      Array.isArray(obj.nodes) &&
      Array.isArray(obj.edges) &&
      typeof obj.version === 'string' &&
      typeof obj.timestamp === 'number'
    );
  }

  private validateImportData(data: Record<string, unknown>): boolean {
    return (
      typeof data.data === 'string' &&
      typeof data.checksum === 'string' &&
      typeof data.version === 'string'
    );
  }

  private compress(data: string): string {
    // Simple compression using encodeURIComponent/btoa
    // In production, use a proper compression library like pako
    try {
      return encodeURIComponent(data);
    } catch {
      return data;
    }
  }

  private decompress(data: string): string {
    try {
      return decodeURIComponent(data);
    } catch {
      return data;
    }
  }

  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  setFormat(format: 'json' | 'yaml'): void {
    this.format = format;
  }

  getFormat(): 'json' | 'yaml' {
    return this.format;
  }

  setCompression(enabled: boolean): void {
    this.compressionEnabled = enabled;
  }

  isCompressionEnabled(): boolean {
    return this.compressionEnabled;
  }

  getSnapshot(): {
    format: string;
    compressionEnabled: boolean;
  } {
    return {
      format: this.format,
      compressionEnabled: this.compressionEnabled,
    };
  }

  reset(): void {
    this.format = 'json';
    this.compressionEnabled = false;
  }

  getReport(): {
    format: string;
    compressionEnabled: boolean;
    sampleChecksum: string;
  } {
    const sampleData = 'sample';
    return {
      format: this.format,
      compressionEnabled: this.compressionEnabled,
      sampleChecksum: this.calculateChecksum(sampleData),
    };
  }

  exportMetrics(): {
    serializerType: string;
    format: string;
    compressionEnabled: boolean;
    estimatedSize: number;
  } {
    return {
      serializerType: 'canvas-v26',
      format: this.format,
      compressionEnabled: this.compressionEnabled,
      estimatedSize: 0,
    };
  }

  toJSON(): Record<string, unknown> {
    return this.getSnapshot();
  }

  static validateCanvasData(data: Record<string, unknown>): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'nodes' in data &&
      'edges' in data
    );
  }
}

export default CanvasSerializer;