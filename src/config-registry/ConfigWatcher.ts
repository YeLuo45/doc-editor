/**
 * ConfigWatcher.ts
 * V79 Config Watcher - Configuration change monitoring
 */

export type WatchCallback = (key: string, oldValue: unknown, newValue: unknown) => void;
export type WatchedKey = {
  key: string;
  callbacks: WatchCallback[];
  lastValue: unknown;
  createdAt: number;
};

export type WatcherMetrics = {
  watchedCount: number;
  triggeredCount: number;
  timestamp: number;
};

export interface IConfigWatcher {
  watch(key: string, callback: WatchCallback): void;
  unwatch(key: string, callback?: WatchCallback): void;
  getWatched(): string[];
  check(key: string, newValue: unknown): boolean;
}

export class ConfigWatcher implements IConfigWatcher {
  private _watched: Map<string, WatchedKey> = new Map();
  private _triggeredCount: number = 0;
  private _operationCount: number = 0;
  private _creationTime: number = Date.now();

  get config(): Map<string, WatchedKey> {
    return this._watched;
  }

  watch(key: string, callback: WatchCallback): void {
    this._operationCount++;
    let watched = this._watched.get(key);

    if (!watched) {
      watched = {
        key,
        callbacks: [],
        lastValue: undefined,
        createdAt: Date.now(),
      };
      this._watched.set(key, watched);
    }

    watched.callbacks.push(callback);
  }

  unwatch(key: string, callback?: WatchCallback): void {
    this._operationCount++;
    const watched = this._watched.get(key);

    if (!watched) {
      return;
    }

    if (callback) {
      watched.callbacks = watched.callbacks.filter((cb) => cb !== callback);
      if (watched.callbacks.length === 0) {
        this._watched.delete(key);
      }
    } else {
      this._watched.delete(key);
    }
  }

  getWatched(): string[] {
    this._operationCount++;
    return Array.from(this._watched.keys());
  }

  check(key: string, newValue: unknown): boolean {
    this._operationCount++;
    const watched = this._watched.get(key);

    if (!watched) {
      return false;
    }

    if (watched.lastValue !== newValue) {
      const oldValue = watched.lastValue;
      watched.lastValue = newValue;

      watched.callbacks.forEach((callback) => {
        callback(key, oldValue, newValue);
      });

      this._triggeredCount++;
      return true;
    }

    return false;
  }

  getWatchedInfo(): Array<{ key: string; callbackCount: number; createdAt: number }> {
    const result: Array<{ key: string; callbackCount: number; createdAt: number }> = [];
    this._watched.forEach((watched) => {
      result.push({
        key: watched.key,
        callbackCount: watched.callbacks.length,
        createdAt: watched.createdAt,
      });
    });
    return result;
  }

  clear(): void {
    this._watched.clear();
    this._operationCount++;
  }

  getSnapshot(): { metrics: WatcherMetrics } {
    return {
      metrics: {
        watchedCount: this._watched.size,
        triggeredCount: this._triggeredCount,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this._watched.clear();
    this._triggeredCount = 0;
    this._operationCount = 0;
    this._creationTime = Date.now();
  }

  getReport(): string {
    const uptime = Date.now() - this._creationTime;
    const lines = [
      '=== ConfigWatcher Report ===',
      `Watched Keys: ${this._watched.size}`,
      `Total Triggers: ${this._triggeredCount}`,
      `Total Operations: ${this._operationCount}`,
      `Uptime: ${uptime}ms`,
      '=== End Report ===',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V79-ConfigWatcher-1.0',
    };
  }
}

export const defaultWatcher = new ConfigWatcher();