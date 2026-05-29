/**
 * ConfigRegistry.ts
 * V79 Config Registry - Core configuration management
 */

export type ConfigValue = string | number | boolean | object | null;
export type ConfigMap = Map<string, ConfigValue>;
export type ConfigSnapshot = {
  timestamp: number;
  config: Record<string, ConfigValue>;
  size: number;
};
export type ConfigMetrics = {
  totalKeys: number;
  timestamp: number;
  operationCount: number;
};

export interface IConfigRegistry {
  register(key: string, value: ConfigValue): boolean;
  unregister(key: string): boolean;
  get(key: string): ConfigValue | undefined;
  getAll(): Record<string, ConfigValue>;
  set(key: string, value: ConfigValue): boolean;
}

export class ConfigRegistry implements IConfigRegistry {
  private _config: ConfigMap = new Map();
  private _operationCount: number = 0;
  private _creationTime: number = Date.now();

  get config(): ConfigMap {
    return this._config;
  }

  register(key: string, value: ConfigValue): boolean {
    if (this._config.has(key)) {
      return false;
    }
    this._config.set(key, value);
    this._operationCount++;
    return true;
  }

  unregister(key: string): boolean {
    if (!this._config.has(key)) {
      return false;
    }
    this._config.delete(key);
    this._operationCount++;
    return true;
  }

  get(key: string): ConfigValue | undefined {
    this._operationCount++;
    return this._config.get(key);
  }

  getAll(): Record<string, ConfigValue> {
    this._operationCount++;
    const result: Record<string, ConfigValue> = {};
    this._config.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  set(key: string, value: ConfigValue): boolean {
    this._config.set(key, value);
    this._operationCount++;
    return true;
  }

  has(key: string): boolean {
    return this._config.has(key);
  }

  clear(): void {
    this._config.clear();
    this._operationCount++;
  }

  getSnapshot(): { metrics: ConfigMetrics } {
    return {
      metrics: {
        totalKeys: this._config.size,
        timestamp: Date.now(),
        operationCount: this._operationCount,
      },
    };
  }

  reset(): void {
    this._config.clear();
    this._operationCount = 0;
    this._creationTime = Date.now();
  }

  getReport(): string {
    const uptime = Date.now() - this._creationTime;
    const lines = [
      '=== ConfigRegistry Report ===',
      `Registered Keys: ${this._config.size}`,
      `Total Operations: ${this._operationCount}`,
      `Uptime: ${uptime}ms`,
      '=== End Report ===',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V79-ConfigRegistry-1.0',
    };
  }
}

export const defaultRegistry = new ConfigRegistry();