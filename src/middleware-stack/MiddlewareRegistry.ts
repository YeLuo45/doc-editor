/**
 * MiddlewareRegistry.ts
 * V85 Middleware Registry - Central registry for middleware components
 * Provides registration, lookup, and management capabilities
 */

export interface RegistryConfig {
  autoRegister?: boolean;
  validateMiddleware?: boolean;
  namespace?: string;
}

export interface MiddlewareEntry<T = unknown, R = unknown> {
  id: string;
  name: string;
  version: string;
  middleware: (context: T, next: () => Promise<R>) => Promise<R>;
  metadata: Record<string, unknown>;
  registeredAt: number;
  enabled: boolean;
  usageCount: number;
}

export interface RegistrySnapshot {
  timestamp: number;
  total: number;
  enabled: number;
  entries: Array<{ id: string; name: string; usageCount: number }>;
}

const defaultConfig: Required<RegistryConfig> = {
  autoRegister: true,
  validateMiddleware: true,
  namespace: 'default',
};

export class MiddlewareRegistry<T = unknown, R = unknown> {
  readonly config: RegistryConfig;
  private readonly _registry: Map<string, MiddlewareEntry<T, R>> = new Map();

  constructor(config?: RegistryConfig) {
    this.config = {
      autoRegister: config?.autoRegister ?? defaultConfig.autoRegister,
      validateMiddleware: config?.validateMiddleware ?? defaultConfig.validateMiddleware,
      namespace: config?.namespace ?? defaultConfig.namespace,
    };
  }

  /**
   * Register a middleware with the registry
   */
  register(
    middleware: (context: T, next: () => Promise<R>) => Promise<R>,
    options: { id?: string; name?: string; version?: string; metadata?: Record<string, unknown> } = {}
  ): string {
    const id = options.id ?? `mw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    if (this.config.validateMiddleware && typeof middleware !== 'function') {
      throw new Error('Invalid middleware: must be a function');
    }

    const entry: MiddlewareEntry<T, R> = {
      id,
      name: options.name ?? `middleware_${this._registry.size}`,
      version: options.version ?? '1.0.0',
      middleware,
      metadata: options.metadata ?? {},
      registeredAt: Date.now(),
      enabled: true,
      usageCount: 0,
    };

    this._registry.set(id, entry);
    return id;
  }

  /**
   * Unregister a middleware by ID
   */
  unregister(id: string): boolean {
    const entry = this._registry.get(id);
    if (!entry) return false;

    this._registry.delete(id);
    return true;
  }

  /**
   * Get a middleware by ID
   */
  get(id: string): MiddlewareEntry<T, R> | undefined {
    const entry = this._registry.get(id);
    if (entry) {
      entry.usageCount++;
    }
    return entry;
  }

  /**
   * Get all registered middleware
   */
  getAll(): MiddlewareEntry<T, R>[] {
    return Array.from(this._registry.values());
  }

  /**
   * Get enabled middleware only
   */
  getEnabled(): MiddlewareEntry<T, R>[] {
    return this.getAll().filter(e => e.enabled);
  }

  /**
   * Enable a middleware by ID
   */
  enable(id: string): boolean {
    const entry = this._registry.get(id);
    if (!entry) return false;
    entry.enabled = true;
    return true;
  }

  /**
   * Disable a middleware by ID
   */
  disable(id: string): boolean {
    const entry = this._registry.get(id);
    if (!entry) return false;
    entry.enabled = false;
    return true;
  }

  /**
   * Check if middleware is registered
   */
  has(id: string): boolean {
    return this._registry.has(id);
  }

  /**
   * Get count of registered middleware
   */
  count(): number {
    return this._registry.size;
  }

  /**
   * Get snapshot of registry state
   */
  getSnapshot(): { metrics: RegistrySnapshot } {
    return {
      metrics: {
        timestamp: Date.now(),
        total: this._registry.size,
        enabled: this.getEnabled().length,
        entries: this.getAll().map(e => ({
          id: e.id,
          name: e.name,
          usageCount: e.usageCount,
        })),
      },
    };
  }

  /**
   * Reset registry statistics
   */
  reset(): void {
    this._registry.forEach(entry => {
      entry.usageCount = 0;
      entry.enabled = true;
    });
  }

  /**
   * Generate registry report
   */
  getReport(): string {
    const entries = this.getAll();
    const lines = [
      '=== MiddlewareRegistry Report ===',
      `Config: namespace=${this.config.namespace}, autoRegister=${this.config.autoRegister}`,
      `Total Registered: ${entries.length}`,
      `Enabled: ${this.getEnabled().length}`,
      '',
      'Entries:',
    ];

    entries.forEach(entry => {
      const status = entry.enabled ? '[ENABLED]' : '[DISABLED]';
      lines.push(`  ${status} ${entry.name} (v${entry.version}) - id=${entry.id}, usage=${entry.usageCount}`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics for external systems
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V85-middleware-registry-1.0.0',
    };
  }
}

export default MiddlewareRegistry;