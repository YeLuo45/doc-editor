/**
 * IntegrationConfig.ts - Configuration Management
 * V30 Integration Hub for doc-editor
 */

export interface IntegrationConfig {
  version: string;
  hub: {
    name: string;
    timeout: number;
    retries: number;
  };
  adapters: Record<string, Record<string, unknown>>;
  pipelines: Record<string, unknown>;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
  metadata?: Record<string, unknown>;
}

export class IntegrationConfigManager {
  private config: IntegrationConfig | null = null;
  private snapshots: Record<string, unknown>[] = [];
  private history: IntegrationConfig[] = [];

  loadConfig(config: IntegrationConfig): void {
    this.validateConfig(config);
    this.history.push({ ...this.config } as IntegrationConfig);
    this.config = this.deepClone(config);
  }

  saveConfig(): IntegrationConfig | null {
    return this.config ? this.deepClone(this.config) : null;
  }

  getConfig(): IntegrationConfig | null {
    return this.config ? this.deepClone(this.config) : null;
  }

  updateConfig(updates: Partial<IntegrationConfig>): void {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    this.config = this.deepClone({ ...this.config, ...updates });
  }

  getConfigValue<T>(path: string): T | undefined {
    if (!this.config) return undefined;
    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = this.config;
    for (const key of keys) {
      value = value?.[key];
    }
    return value as T;
  }

  setConfigValue(path: string, value: unknown): void {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }
    const keys = path.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let target: any = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (target[keys[i]] === undefined) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
  }

  resetConfig(): void {
    this.config = null;
  }

  private validateConfig(config: IntegrationConfig): void {
    if (!config.version) throw new Error('Config must have version');
    if (!config.hub) throw new Error('Config must have hub section');
    if (typeof config.hub.timeout !== 'number') {
      throw new Error('Hub timeout must be a number');
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot = {
      hasConfig: this.config !== null,
      configVersion: this.config?.version,
      historySize: this.history.length,
      timestamp: Date.now(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  reset(): void {
    this.config = null;
    this.history = [];
    this.snapshots = [];
  }

  getReport(): Record<string, unknown> {
    return {
      hasConfig: this.config !== null,
      configVersion: this.config?.version,
      historySize: this.history.length,
      snapshots: this.snapshots.length,
    };
  }

  exportMetrics(): Record<string, unknown> {
    return {
      hasConfig: this.config !== null,
      version: this.config?.version,
      historySize: this.history.length,
      hubConfigured: this.config?.hub !== undefined,
      adaptersConfigured: Object.keys(this.config?.adapters ?? {}).length,
    };
  }
}

export default IntegrationConfigManager;