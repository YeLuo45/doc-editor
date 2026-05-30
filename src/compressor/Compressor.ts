/**
 * Compressor.ts - V124 Compressor
 * Core compression/decompression interface with statistics tracking
 */

export type CompressorConfig = {
  algorithm: string;
  level?: number;
  threshold?: number;
  maxSize?: number;
};

export type CompressorStats = {
  compressCount: number;
  decompressCount: number;
  totalBytesCompressed: number;
  totalBytesDecompressed: number;
  compressionRatio: number;
  averageTimeMs: number;
};

export type CompressorSnapshot = {
  metrics: CompressorStats;
  timestamp: number;
  config: CompressorConfig;
};

export interface CompressionResult {
  data: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: string;
  timeMs: number;
}

export interface DecompressionResult {
  data: string;
  originalSize: number;
  decompressedSize: number;
  timeMs: number;
}

/**
 * Compressor - Core compression/decompression class
 * Provides unified interface for various compression algorithms
 */
export class Compressor {
  config: CompressorConfig;
  private compressCount: number = 0;
  private decompressCount: number = 0;
  private totalBytesCompressed: number = 0;
  private totalBytesDecompressed: number = 0;
  private totalCompressionTime: number = 0;
  private decompressTime: number = 0;

  constructor(config: CompressorConfig) {
    this.config = { ...config };
  }

  /**
   * Compress data using configured algorithm
   */
  compress(data: string): CompressionResult {
    const startTime = Date.now();
    const originalSize = data.length;
    
    // Simple compression simulation (in production would use actual algorithm)
    const compressed = this.encode(data);
    const compressedSize = compressed.length;
    
    this.compressCount++;
    this.totalBytesCompressed += originalSize;
    this.totalCompressionTime += Date.now() - startTime;

    return {
      data: compressed,
      originalSize,
      compressedSize,
      ratio: originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0,
      algorithm: this.config.algorithm,
      timeMs: Date.now() - startTime,
    };
  }

  /**
   * Decompress data
   */
  decompress(data: string): DecompressionResult {
    const startTime = Date.now();
    const originalSize = data.length;
    
    // Simple decompression simulation
    const decompressed = this.decode(data);
    const decompressedSize = decompressed.length;
    
    this.decompressCount++;
    this.totalBytesDecompressed += decompressedSize;
    this.decompressTime += Date.now() - startTime;

    return {
      data: decompressed,
      originalSize,
      decompressedSize,
      timeMs: Date.now() - startTime,
    };
  }

  /**
   * Get current compressor stats
   */
  getStats(): CompressorStats {
    return {
      compressCount: this.compressCount,
      decompressCount: this.decompressCount,
      totalBytesCompressed: this.totalBytesCompressed,
      totalBytesDecompressed: this.totalBytesDecompressed,
      compressionRatio: this.totalBytesCompressed > 0
        ? (this.totalBytesCompressed - this.totalBytesDecompressed) / this.totalBytesCompressed * 100
        : 0,
      averageTimeMs: this.compressCount > 0
        ? this.totalCompressionTime / this.compressCount
        : 0,
    };
  }

  /**
   * Get current compressor algorithm name
   */
  getCompressor(): string {
    return this.config.algorithm;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): CompressorSnapshot {
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
    this.compressCount = 0;
    this.decompressCount = 0;
    this.totalBytesCompressed = 0;
    this.totalBytesDecompressed = 0;
    this.totalCompressionTime = 0;
    this.decompressTime = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `Compressor Report (${this.config.algorithm})`,
      `==========================================`,
      `Compressions: ${stats.compressCount}`,
      `Decompressions: ${stats.decompressCount}`,
      `Bytes Compressed: ${stats.totalBytesCompressed}`,
      `Bytes Decompressed: ${stats.totalBytesDecompressed}`,
      `Compression Ratio: ${stats.compressionRatio.toFixed(2)}%`,
      `Average Time: ${stats.averageTimeMs.toFixed(2)}ms`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: CompressorStats; config: CompressorConfig } {
    return {
      version: 'V124',
      stats: this.getStats(),
      config: { ...this.config },
    };
  }

  private encode(data: string): string {
    // Simple base64-like encoding for simulation
    return Buffer.from(data).toString('base64');
  }

  private decode(data: string): string {
    // Simple base64 decoding for simulation
    return Buffer.from(data, 'base64').toString();
  }
}

export default Compressor;