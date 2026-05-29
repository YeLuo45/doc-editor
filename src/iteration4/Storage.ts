/**
 * Storage.ts - Core storage module for V34 Iteration 4
 * Provides persistent storage operations with save, load, remove, getKeys
 */

export interface StorageMetrics {
  saves: number;
  loads: number;
  removals: number;
  errors: number;
  lastSave: number | null;
  lastLoad: number | null;
}

export interface StorageSnapshot {
  size: number;
  keys: string[];
  metrics: StorageMetrics;
}

export class Storage {
  private store: Map<string, unknown> = new Map();
  private metrics: StorageMetrics = {
    saves: 0,
    loads: 0,
    removals: 0,
    errors: 0,
    lastSave: null,
    lastLoad: null,
  };

  /**
   * Save a value to storage
   */
  save(key: string, value: unknown): boolean {
    try {
      this.store.set(key, value);
      this.metrics.saves++;
      this.metrics.lastSave = Date.now();
      return true;
    } catch (e) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Load a value from storage
   */
  load<T = unknown>(key: string): T | undefined {
    try {
      this.metrics.loads++;
      this.metrics.lastLoad = Date.now();
      return this.store.get(key) as T | undefined;
    } catch (e) {
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * Remove a key from storage
   */
  remove(key: string): boolean {
    try {
      const existed = this.store.has(key);
      this.store.delete(key);
      this.metrics.removals++;
      return existed;
    } catch (e) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get all keys in storage
   */
  getKeys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * Get current snapshot of storage state
   */
  getSnapshot(): StorageSnapshot {
    return {
      size: this.store.size,
      keys: this.getKeys(),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset storage to initial state
   */
  reset(): void {
    this.store.clear();
    this.metrics = {
      saves: 0,
      loads: 0,
      removals: 0,
      errors: 0,
      lastSave: null,
      lastLoad: null,
    };
  }

  /**
   * Get human-readable report
   */
  getReport(): string {
    return [
      '=== Storage Report ===',
      `Size: ${this.store.size}`,
      `Saves: ${this.metrics.saves}`,
      `Loads: ${this.metrics.loads}`,
      `Removals: ${this.metrics.removals}`,
      `Errors: ${this.metrics.errors}`,
      `Last Save: ${this.metrics.lastSave ? new Date(this.metrics.lastSave).toISOString() : 'N/A'}`,
      `Last Load: ${this.metrics.lastLoad ? new Date(this.metrics.lastLoad).toISOString() : 'N/A'}`,
      '=====================',
    ].join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): StorageMetrics {
    return { ...this.metrics };
  }
}

export default Storage;