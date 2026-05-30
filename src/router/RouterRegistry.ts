/**
 * RouterRegistry.ts - V117 Router Registry
 * Central registry for managing router instances with register/unregister/get/getAll/has
 */

export type RegistryConfig = {
  name: string;
  maxRouters: number;
  autoCleanup: boolean;
};

export type RouterInstance = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
};

export class RouterRegistry {
  private _routers: Map<string, RouterInstance> = new Map();
  private _creationOrder: string[] = [];
  private _startTime: number = Date.now();

  public config: RegistryConfig;

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  /**
   * Register a new router instance
   */
  register(instance: RouterInstance): boolean {
    if (!instance.id || !instance.name) {
      return false;
    }
    if (this._routers.has(instance.id)) {
      return false;
    }
    if (this._routers.size >= this.config.maxRouters) {
      if (this.config.autoCleanup && this._creationOrder.length > 0) {
        const oldest = this._creationOrder.shift();
        if (oldest) {
          this._routers.delete(oldest);
        }
      } else {
        return false;
      }
    }
    this._routers.set(instance.id, { ...instance });
    this._creationOrder.push(instance.id);
    return true;
  }

  /**
   * Unregister a router by id
   */
  unregister(routerId: string): boolean {
    const index = this._creationOrder.indexOf(routerId);
    if (index > -1) {
      this._creationOrder.splice(index, 1);
    }
    return this._routers.delete(routerId);
  }

  /**
   * Get a specific router by id
   */
  get(routerId: string): RouterInstance | undefined {
    return this._routers.get(routerId);
  }

  /**
   * Get all registered routers
   */
  getAll(): RouterInstance[] {
    return Array.from(this._routers.values());
  }

  /**
   * Check if a router is registered
   */
  has(routerId: string): boolean {
    return this._routers.has(routerId);
  }

  /**
   * Get routers by type
   */
  getByType(type: string): RouterInstance[] {
    return this.getAll().filter(r => r.type === type);
  }

  /**
   * Enable or disable a router
   */
  setEnabled(routerId: string, enabled: boolean): boolean {
    const router = this._routers.get(routerId);
    if (!router) {
      return false;
    }
    router.enabled = enabled;
    return true;
  }

  /**
   * Get registry statistics
   */
  getStats(): { totalRouters: number; enabledCount: number; maxRouters: number; uptime: number } {
    const enabledCount = this.getAll().filter(r => r.enabled).length;
    return {
      totalRouters: this._routers.size,
      enabledCount,
      maxRouters: this.config.maxRouters,
      uptime: Date.now() - this._startTime,
    };
  }

  /**
   * Get current snapshot of registry state
   */
  getSnapshot(): { routers: RouterInstance[]; stats: ReturnType<RouterRegistry['getStats']> } {
    return {
      routers: this.getAll(),
      stats: this.getStats(),
    };
  }

  /**
   * Reset all registry state
   */
  reset(): void {
    this._routers.clear();
    this._creationOrder = [];
    this._startTime = Date.now();
  }

  /**
   * Generate a text report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines = [
      `Router Registry Report: ${this.config.name}`,
      `Max Routers: ${stats.maxRouters}`,
      `Total Registered: ${stats.totalRouters}`,
      `Enabled: ${stats.enabledCount}`,
      `Uptime: ${stats.uptime}ms`,
      '',
      'Registered Routers:',
      ...this.getAll().map(r => `  - ${r.id} (${r.type}): ${r.enabled ? 'enabled' : 'disabled'}`),
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; timestamp: number; stats: ReturnType<RouterRegistry['getStats']> } {
    return {
      version: 'V117',
      timestamp: Date.now(),
      stats: this.getStats(),
    };
  }
}