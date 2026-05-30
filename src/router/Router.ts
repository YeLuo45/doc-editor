/**
 * Router.ts - V117 Router Implementation
 * Handles route management with add/remove/getRoute/getStats operations
 */

export type RouterConfig = {
  name: string;
  enabled: boolean;
  timeout: number;
  retryCount: number;
};

export type Route = {
  id: string;
  path: string;
  handler: string;
  priority: number;
  metadata?: Record<string, unknown>;
};

export type RouteStats = {
  totalRoutes: number;
  activeRoutes: number;
  requestsProcessed: number;
  avgResponseTime: number;
};

export class Router {
  private _routes: Map<string, Route> = new Map();
  private _requestCount: number = 0;
  private _responseTimes: number[] = [];
  private _startTime: number = Date.now();

  public config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = { ...config };
  }

  /**
   * Add a new route to the router
   */
  add(route: Route): boolean {
    if (!route.id || !route.path) {
      return false;
    }
    if (this._routes.has(route.id)) {
      return false;
    }
    this._routes.set(route.id, { ...route });
    return true;
  }

  /**
   * Remove a route by id
   */
  remove(routeId: string): boolean {
    return this._routes.delete(routeId);
  }

  /**
   * Get a specific route by id
   */
  getRoute(routeId: string): Route | undefined {
    return this._routes.get(routeId);
  }

  /**
   * Get all registered routes
   */
  getAllRoutes(): Route[] {
    return Array.from(this._routes.values());
  }

  /**
   * Route a request - finds matching route
   */
  route(path: string): Route | undefined {
    const routes = this.getAllRoutes();
    const sorted = routes.sort((a, b) => b.priority - a.priority);
    
    for (const r of sorted) {
      if (this.matchPath(r.path, path)) {
        this._requestCount++;
        return r;
      }
    }
    return undefined;
  }

  /**
   * Get routing statistics
   */
  getStats(): RouteStats {
    const activeRoutes = this._routes.size;
    const avgTime = this._responseTimes.length > 0
      ? this._responseTimes.reduce((a, b) => a + b, 0) / this._responseTimes.length
      : 0;

    return {
      totalRoutes: this._routes.size,
      activeRoutes,
      requestsProcessed: this._requestCount,
      avgResponseTime: Math.round(avgTime * 100) / 100,
    };
  }

  /**
   * Record response time for statistics
   */
  recordResponseTime(ms: number): void {
    this._responseTimes.push(ms);
    if (this._responseTimes.length > 1000) {
      this._responseTimes = this._responseTimes.slice(-500);
    }
  }

  /**
   * Get current snapshot of router state
   */
  getSnapshot(): { metrics: RouteStats; routeCount: number; uptime: number } {
    return {
      metrics: this.getStats(),
      routeCount: this._routes.size,
      uptime: Date.now() - this._startTime,
    };
  }

  /**
   * Reset all router state
   */
  reset(): void {
    this._routes.clear();
    this._requestCount = 0;
    this._responseTimes = [];
    this._startTime = Date.now();
  }

  /**
   * Generate a text report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines = [
      `Router Report: ${this.config.name}`,
      `Enabled: ${this.config.enabled}`,
      `Timeout: ${this.config.timeout}ms`,
      `Total Routes: ${stats.totalRoutes}`,
      `Active Routes: ${stats.activeRoutes}`,
      `Requests Processed: ${stats.requestsProcessed}`,
      `Avg Response Time: ${stats.avgResponseTime}ms`,
      `Uptime: ${Date.now() - this._startTime}ms`,
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; timestamp: number; stats: RouteStats } {
    return {
      version: 'V117',
      timestamp: Date.now(),
      stats: this.getStats(),
    };
  }

  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue;
      }
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }
    return true;
  }
}