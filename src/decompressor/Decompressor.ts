/**
 * Decompressor.ts - V125 Decompressor
 * Core decompression interface with statistics tracking
 */

export type DecompressorConfig = {
  algorithm: string;
  mode?: string;
  level?: number;
  bufferSize?: number;
  timeout?: number;
};

export type DecompressorStats = {
  decompressCount: number;
  totalBytesDecompressed: number;
  averageTimeMs: number;
  lastDecompressAt: number | null;
  successCount: number;
  errorCount: number;
};

export type DecompressorSnapshot = {
  metrics: DecompressorStats;
  timestamp: number;
  config: DecompressorConfig;
};

export interface DecompressionResult {
  data: string;
  originalSize: number;
  decompressedSize: number;
  timeMs: number;
  algorithm: string;
  success: boolean;
}

export interface DecompressionOutput {
  data: string;
  metrics: {
    inputSize: number;
    outputSize: number;
    processingTimeMs: number;
  };
}

/**
 * Decompressor - Core decompression class
 * Provides unified interface for various decompression algorithms
 */
export class Decompressor {
  config: DecompressorConfig;
  private decompressCount: number = 0;
  private totalBytesDecompressed: number = 0;
  private totalDecompressionTime: number = 0;
  private lastDecompressAt: number | null = null;
  private successCount: number = 0;
  private errorCount: number = 0;

  constructor(config: DecompressorConfig) {
    this.config = { ...config };
  }

  /**
   * Decompress data using configured algorithm
   */
  decompress(data: string): DecompressionResult {
    const startTime = Date.now();
    const originalSize = data.length;
    
    try {
      const decompressed = this.decode(data);
      const decompressedSize = decompressed.length;
      
      this.decompressCount++;
      this.totalBytesDecompressed += decompressedSize;
      this.totalDecompressionTime += Date.now() - startTime;
      this.lastDecompressAt = Date.now();
      this.successCount++;

      return {
        data: decompressed,
        originalSize,
        decompressedSize,
        timeMs: Date.now() - startTime,
        algorithm: this.config.algorithm,
        success: true,
      };
    } catch (error) {
      this.errorCount++;
      return {
        data: '',
        originalSize,
        decompressedSize: 0,
        timeMs: Date.now() - startTime,
        algorithm: this.config.algorithm,
        success: false,
      };
    }
  }

  /**
   * Get current decompressor stats
   */
  getStats(): DecompressorStats {
    return {
      decompressCount: this.decompressCount,
      totalBytesDecompressed: this.totalBytesDecompressed,
      averageTimeMs: this.decompressCount > 0
        ? this.totalDecompressionTime / this.decompressCount
        : 0,
      lastDecompressAt: this.lastDecompressAt,
      successCount: this.successCount,
      errorCount: this.errorCount,
    };
  }

  /**
   * Get current decompressor algorithm name
   */
  getDecompressor(): string {
    return this.config.algorithm;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): DecompressorSnapshot {
    return {
      metrics: this.getStats(),
      timestamp: Date.now(),
      config: { ...this.config },
    };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.decompressCount = 0;
    this.totalBytesDecompressed = 0;
    this.totalDecompressionTime = 0;
    this.lastDecompressAt = null;
    this.successCount = 0;
    this.errorCount = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `Decompressor Report (${this.config.algorithm})`,
      `==========================================`,
      `Decompressions: ${stats.decompressCount}`,
      `Bytes Decompressed: ${stats.totalBytesDecompressed}`,
      `Average Time: ${stats.averageTimeMs.toFixed(2)}ms`,
      `Last Decompress: ${stats.lastDecompressAt ? new Date(stats.lastDecompressAt).toISOString() : 'N/A'}`,
      `Success: ${stats.successCount}`,
      `Errors: ${stats.errorCount}`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: DecompressorStats; config: DecompressorConfig } {
    return {
      version: 'V125',
      stats: this.getStats(),
      config: { ...this.config },
    };
  }

  private decode(data: string): string {
    // Simple base64 decoding for simulation
    try {
      return Buffer.from(data, 'base64').toString();
    } catch {
      return data;
    }
  }
}

export default Decompressor;