/**
 * V123 Decoder - Document Editor Decoder Module
 */

export type DecoderConfig = {
  enabled?: boolean;
  timeout?: number;
  maxRetries?: number;
  onDecodeStart?: (data: unknown) => void;
  onDecodeComplete?: (result: unknown) => void;
  onDecodeError?: (error: Error) => void;
};

export interface DecodingStats {
  totalDecodes: number;
  successfulDecodes: number;
  failedDecodes: number;
  averageDecodeTime: number;
  lastDecodeTime: number;
}

export interface DecoderSnapshot {
  config: DecoderConfig;
  stats: DecodingStats;
  active: boolean;
}

export class Decoder {
  private _config: DecoderConfig;
  private _stats: DecodingStats;
  private _active: boolean;
  private _name: string;

  constructor(name: string, config: DecoderConfig = {}) {
    this._name = name;
    this._config = { enabled: true, timeout: 5000, maxRetries: 3, ...config };
    this._stats = { totalDecodes: 0, successfulDecodes: 0, failedDecodes: 0, averageDecodeTime: 0, lastDecodeTime: 0 };
    this._active = true;
  }

  get config(): DecoderConfig { return { ...this._config }; }
  get name(): string { return this._name; }
  get stats(): DecodingStats { return { ...this._stats }; }
  get active(): boolean { return this._active; }
  set active(value: boolean) { this._active = value; }

  decode(data: unknown): { success: boolean; result?: unknown; error?: string } {
    if (!this._config.enabled || !this._active) {
      return { success: false, error: 'Decoder is disabled' };
    }

    const startTime = Date.now();
    this._config.onDecodeStart?.(data);

    try {
      if (data === null || data === undefined) {
        throw new Error('Cannot decode null or undefined data');
      }

      const decoded = this._performDecode(data);
      const decodeTime = Date.now() - startTime;
      this._updateStats(true, decodeTime);
      this._config.onDecodeComplete?.(decoded);
      return { success: true, result: decoded };
    } catch (error) {
      const decodeTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._updateStats(false, decodeTime);
      this._config.onDecodeError?.(error instanceof Error ? error : new Error(errorMessage));
      return { success: false, error: errorMessage };
    }
  }

  private _performDecode(data: unknown): unknown {
    if (typeof data === 'string') {
      try { return JSON.parse(data); }
      catch { return { type: 'text', content: data, decoded: true }; }
    }
    if (typeof data === 'object') {
      return { ...data as object, decoded: true, version: '1.2.3' };
    }
    return { type: typeof data, value: data, decoded: true };
  }

  private _updateStats(success: boolean, decodeTime: number): void {
    this._stats.totalDecodes++;
    if (success) { this._stats.successfulDecodes++; }
    else { this._stats.failedDecodes++; }
    const totalTime = this._stats.averageDecodeTime * (this._stats.totalDecodes - 1);
    this._stats.averageDecodeTime = (totalTime + decodeTime) / this._stats.totalDecodes;
    this._stats.lastDecodeTime = decodeTime;
  }

  getDecoder(): string { return `Decoder:${this._name}:v1.2.3`; }
  getStats(): DecodingStats { return this.stats; }

  getSnapshot(): { metrics: DecoderSnapshot } {
    return { metrics: { config: this.config, stats: this.stats, active: this._active } };
  }

  reset(): void {
    this._stats = { totalDecodes: 0, successfulDecodes: 0, failedDecodes: 0, averageDecodeTime: 0, lastDecodeTime: 0 };
  }

  getReport(): string {
    const { totalDecodes, successfulDecodes, failedDecodes, averageDecodeTime } = this._stats;
    const successRate = totalDecodes > 0 ? ((successfulDecodes / totalDecodes) * 100).toFixed(2) : '0.00';
    return [
      `=== Decoder Report: ${this._name} ===`,
      `Status: ${this._active ? 'ACTIVE' : 'INACTIVE'}`,
      `Total: ${totalDecodes} | Success: ${successfulDecodes} | Failed: ${failedDecodes}`,
      `Rate: ${successRate}% | Avg: ${averageDecodeTime.toFixed(2)}ms | v1.2.3`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.2.3',
      decoderName: this._name,
      metrics: { total: this._stats.totalDecodes, success: this._stats.successfulDecodes, failed: this._stats.failedDecodes, avgTime: this._stats.averageDecodeTime },
    };
  }

  updateConfig(config: Partial<DecoderConfig>): void { this._config = { ...this._config, ...config }; }
  setEnabled(enabled: boolean): void { this._config.enabled = enabled; }
  setTimeout(timeout: number): void { this._config.timeout = timeout; }
}