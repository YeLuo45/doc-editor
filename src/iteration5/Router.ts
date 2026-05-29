/**
 * Router.ts - V35 Iteration 5
 * Core router with route/match/getRoutes capabilities
 */

export interface Route {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: string;
  middleware?: string[];
}

export interface RouteSnapshot {
  routes: string[];
  count: number;
  methods: Record<string, number>;
  metrics: {
    totalRoutes: number;
    registrations: number;
    matches: number;
  };
}

export class Router {
  private routes: Map<string, Route> = new Map();
  private registrations: number = 0;
  private matches: number = 0;

  constructor() {
    this.routes = new Map();
    this.registrations = 0;
    this.matches = 0;
  }

  /**
   * Register a new route
   */
  route(path: string, method: Route['method'], handler: string, middleware?: string[]): boolean {
    if (!path || !method || !handler) {
      return false;
    }

    const key = this.makeKey(path, method);
    
    if (this.routes.has(key)) {
      return false;
    }

    const route: Route = { path, method, handler, middleware: middleware || [] };
    this.routes.set(key, route);
    this.registrations++;
    
    return true;
  }

  /**
   * Match a request path and method to a registered route
   */
  match(path: string, method: string): Route | null {
    if (!path || !method) {
      return null;
    }

    const upperMethod = method.toUpperCase() as Route['method'];
    const key = this.makeKey(path, upperMethod);
    
    const route = this.routes.get(key);
    
    if (route) {
      this.matches++;
      return route;
    }

    // Try pattern matching with params
    for (const [routeKey, routeValue] of this.routes.entries()) {
      if (this.matchPattern(routeValue.path, path) && routeValue.method === upperMethod) {
        this.matches++;
        return routeValue;
      }
    }

    return null;
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Route[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get snapshot of current router state
   */
  getSnapshot(): RouteSnapshot {
    const routeArray = this.getRoutes();
    const methods: Record<string, number> = {};

    routeArray.forEach(route => {
      methods[route.method] = (methods[route.method] || 0) + 1;
    });

    return {
      routes: routeArray.map(r => `${r.method}:${r.path}`),
      count: routeArray.length,
      methods,
      metrics: {
        totalRoutes: routeArray.length,
        registrations: this.registrations,
        matches: this.matches,
      },
    };
  }

  /**
   * Reset all routes and metrics
   */
  reset(): void {
    this.routes.clear();
    this.registrations = 0;
    this.matches = 0;
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Router Report ===',
      `Total Routes: ${snapshot.count}`,
      `Registrations: ${snapshot.metrics.registrations}`,
      `Matches: ${snapshot.metrics.matches}`,
      '',
      'Routes by Method:',
    ];

    for (const [method, count] of Object.entries(snapshot.methods)) {
      lines.push(`  ${method}: ${count}`);
    }

    lines.push('');
    lines.push('Registered Paths:');

    if (snapshot.routes.length === 0) {
      lines.push('  (none)');
    } else {
      snapshot.routes.forEach(route => {
        lines.push(`  - ${route}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as a plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snapshot = this.getSnapshot();
    return {
      totalRoutes: snapshot.count,
      registrations: snapshot.metrics.registrations,
      matches: this.matches,
      methods: snapshot.methods,
    };
  }

  private makeKey(path: string, method: string): string {
    return `${method}:${path}`;
  }

  private matchPattern(routePath: string, requestPath: string): boolean {
    if (routePath === requestPath) return true;

    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');

    if (routeParts.length !== requestParts.length) return false;

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      if (routePart.startsWith(':')) continue;
      if (routePart === '*') continue;
      if (routePart !== requestPart) return false;
    }

    return true;
  }
}

export default Router;