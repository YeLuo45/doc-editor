/**
 * APIGateway.ts - V78 API Gateway
 * Main gateway for routing and handling API requests
 */

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware?: string[];
  timeout?: number;
}

export interface GatewayConfig {
  port: number;
  host: string;
  routes: RouteConfig[];
  enableLogging: boolean;
  enableMetrics: boolean;
  requestTimeout: number;
  maxConcurrentRequests: number;
}

type APIGatewayConfig = GatewayConfig;

interface RouteMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
}

export class APIGateway {
  private routes: Map<string, RouteConfig> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private routeMetrics: Map<string, RouteMetrics> = new Map();
  
  public readonly config: APIGatewayConfig;

  constructor(config: Partial<GatewayConfig> = {}) {
    this.config = {
      port: config.port ?? 3000,
      host: config.host ?? 'localhost',
      routes: config.routes ?? [],
      enableLogging: config.enableLogging ?? true,
      enableMetrics: config.enableMetrics ?? true,
      requestTimeout: config.requestTimeout ?? 30000,
      maxConcurrentRequests: config.maxConcurrentRequests ?? 1000,
    };
    
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    for (const route of this.config.routes) {
      const key = `${route.method}:${route.path}`;
      this.routes.set(key, route);
      this.routeMetrics.set(key, {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
      });
    }
  }

  /**
   * Add a new route to the gateway
   */
  route(method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, handler: string, middleware?: string[]): boolean {
    const key = `${method}:${path}`;
    
    if (this.routes.has(key)) {
      return false;
    }

    const routeConfig: RouteConfig = { path, method, handler, middleware };
    this.routes.set(key, routeConfig);
    this.routeMetrics.set(key, {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
    });

    return true;
  }

  /**
   * Handle an incoming request
   */
  handle(method: string, path: string, body?: unknown): { success: boolean; response: unknown; error?: string } {
    const key = `${method}:${path}`;
    const route = this.routes.get(key);

    if (!route) {
      return { success: false, response: null, error: 'Route not found' };
    }

    const metrics = this.routeMetrics.get(key);
    if (metrics) {
      metrics.totalRequests++;
    }

    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);

    return {
      success: true,
      response: {
        handler: route.handler,
        path: route.path,
        method: route.method,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Remove a route from the gateway
   */
  unroute(method: string, path: string): boolean {
    const key = `${method}:${path}`;
    const deleted = this.routes.delete(key);
    if (deleted) {
      this.routeMetrics.delete(key);
      this.requestCounts.delete(key);
    }
    return deleted;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get gateway statistics
   */
  getStats(): { totalRoutes: number; totalRequests: number; routes: Record<string, RouteMetrics> } {
    let totalRequests = 0;
    const routeStats: Record<string, RouteMetrics> = {};

    for (const [key, metrics] of this.routeMetrics.entries()) {
      routeStats[key] = metrics;
      totalRequests += metrics.totalRequests;
    }

    return {
      totalRoutes: this.routes.size,
      totalRequests,
      routes: routeStats,
    };
  }

  /**
   * Get a snapshot of current gateway state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const stats = this.getStats();
    return {
      metrics: {
        totalRoutes: stats.totalRoutes,
        totalRequests: stats.totalRequests,
        activeRoutes: Array.from(this.routes.keys()),
        config: {
          port: this.config.port,
          host: this.config.host,
          enableLogging: this.config.enableLogging,
          enableMetrics: this.config.enableMetrics,
        },
      },
    };
  }

  /**
   * Reset gateway state
   */
  reset(): void {
    this.routes.clear();
    this.requestCounts.clear();
    this.routeMetrics.clear();
    this.initializeRoutes();
  }

  /**
   * Generate a detailed report
   */
  getReport(): string {
    const stats = this.getStats();
    const lines: string[] = [
      '=== API Gateway Report ===',
      `Port: ${this.config.port}`,
      `Host: ${this.config.host}`,
      `Total Routes: ${stats.totalRoutes}`,
      `Total Requests: ${stats.totalRequests}`,
      '',
      '--- Route Details ---',
    ];

    for (const [key, metrics] of this.routeMetrics.entries()) {
      lines.push(`${key}: ${metrics.totalRequests} requests, ${metrics.successCount} success, ${metrics.errorCount} errors`);
    }

    return lines.join('\n');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}