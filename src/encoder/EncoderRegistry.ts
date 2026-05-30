/**
 * V122 EncoderRegistry Module
 * Registry for managing multiple encoder instances
 */

import { Encoder, EncoderConfig, EncodingResult } from './Encoder';

export type RegistryConfig = {
  maxEncoders: number;
  allowDuplicates: boolean;
  autoInitialize: boolean;
};

export type RegistryStats = {
  totalRegistrations: number;
  activeEncoders: number;
  totalEncodings: number;
};

export class EncoderRegistry {
  private config: RegistryConfig;
  private encoders: Map<string, Encoder> = new Map();
  private stats: RegistryStats = {
    totalRegistrations: 0,
    activeEncoders: 0,
    totalEncodings: 0,
  };

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  get config(): RegistryConfig {
    return { ...this.config };
  }

  register(id: string, encoder: Encoder): boolean {
    if (this.encoders.has(id)) {
      if (!this.config.allowDuplicates) {
        return false;
      }
    }

    if (this.encoders.size >= this.config.maxEncoders) {
      return false;
    }

    this.encoders.set(id, encoder);
    this.stats.totalRegistrations++;
    this.stats.activeEncoders = this.encoders.size;
    return true;
  }

  unregister(id: string): boolean {
    const result = this.encoders.delete(id);
    if (result) {
      this.stats.activeEncoders = this.encoders.size;
    }
    return result;
  }

  get(id: string): Encoder | undefined {
    return this.encoders.get(id);
  }

  getAll(): Map<string, Encoder> {
    return new Map(this.encoders);
  }

  has(id: string): boolean {
    return this.encoders.has(id);
  }

  clear(): void {
    this.encoders.clear();
    this.stats.activeEncoders = 0;
  }

  execute(id: string, encodingId: string, data: unknown): EncodingResult {
    const encoder = this.encoders.get(id);
    if (!encoder) {
      return {
        success: false,
        error: `Encoder ${id} not found`,
        timestamp: Date.now(),
      };
    }
    return encoder.encode(encodingId, data);
  }

  getStats(): RegistryStats {
    return { ...this.stats };
  }

  getEncoderStats(id: string) {
    const encoder = this.encoders.get(id);
    return encoder ? encoder.getStats() : undefined;
  }

  getSnapshot(): { stats: RegistryStats; config: RegistryConfig; encoderIds: string[] } {
    return {
      stats: this.getStats(),
      config: this.config,
      encoderIds: Array.from(this.encoders.keys()),
    };
  }

  reset(): void {
    this.stats = {
      totalRegistrations: 0,
      activeEncoders: 0,
      totalEncodings: 0,
    };
    this.encoders.forEach((encoder) => encoder.reset());
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `EncoderRegistry Report:
  Max Encoders: ${snapshot.config.maxEncoders}
  Total Registrations: ${snapshot.stats.totalRegistrations}
  Active Encoders: ${snapshot.stats.activeEncoders}
  Encoder IDs: ${snapshot.encoderIds.join(', ') || 'none'}`;
  }

  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: '1.2.2',
      stats: this.getStats(),
      config: this.config,
    };
  }
}