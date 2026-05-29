export interface StreamRouterConfig {
  defaultRoute?: string;
  enableWildcard?: boolean;
  maxRoutes?: number;
}

export interface StreamRoute<T = unknown> {
  name: string;
  pattern: string;
  handler: (msg: T) => void;
  priority?: number;
  active?: boolean;
}

export class StreamRouter<T = unknown> {
  private routes: Map<string, StreamRoute<T>> = new Map();
  private routeOrder: string[] = [];
  private routingStats: Map<string, number> = new Map();
  public config: StreamRouterConfig;

  constructor(config: StreamRouterConfig = {}) {
    this.config = config;
  }

  route(pattern: string, handler: (msg: T) => void, name?: string): boolean {
    const routeName = name || pattern;

    if (this.config.maxRoutes && this.routes.size >= this.config.maxRoutes) {
      return false;
    }

    if (this.routes.has(routeName)) {
      return false;
    }

    const route: StreamRoute<T> = {
      name: routeName,
      pattern,
      handler,
      priority: 0,
      active: true,
    };

    this.routes.set(routeName, route);
    this.routeOrder.push(routeName);
    this.routeOrder.sort((a, b) => {
      const routeA = this.routes.get(a)!;
      const routeB = this.routes.get(b)!;
      return (routeB.priority || 0) - (routeA.priority || 0);
    });

    return true;
  }

  addRoute(route: StreamRoute<T>): boolean {
    if (this.config.maxRoutes && this.routes.size >= this.config.maxRoutes) {
      return false;
    }

    if (this.routes.has(route.name)) {
      return false;
    }

    this.routes.set(route.name, { ...route, active: true });
    this.routeOrder.push(route.name);
    return true;
  }

  removeRoute(name: string): boolean {
    if (!this.routes.has(name)) {
      return false;
    }

    this.routes.delete(name);
    this.routeOrder = this.routeOrder.filter(r => r !== name);
    this.routingStats.delete(name);
    return true;
  }

  getRoutes(): StreamRoute<T>[] {
    return this.routeOrder.map(name => ({ ...this.routes.get(name)! }));
  }

  dispatch(message: T, pattern?: string): string | null {
    let matchedRoute: string | null = null;

    for (const routeName of this.routeOrder) {
      const route = this.routes.get(routeName)!;
      if (!route.active) continue;

      if (this.matchesPattern(pattern || '', route.pattern) || this.matchesPattern('', pattern || '')) {
        try {
          route.handler(message);
          matchedRoute = routeName;
          this.routingStats.set(routeName, (this.routingStats.get(routeName) || 0) + 1);
          break;
        } catch {
          // Route handler failed, continue to next
        }
      }
    }

    return matchedRoute;
  }

  setRouteActive(name: string, active: boolean): boolean {
    const route = this.routes.get(name);
    if (!route) return false;
    route.active = active;
    return true;
  }

  getRouteStats(name: string): number {
    return this.routingStats.get(name) || 0;
  }

  private matchesPattern(input: string, pattern: string): boolean {
    if (!pattern) return true;
    if (pattern === '*') return true;

    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    try {
      return new RegExp(`^${regexPattern}$`).test(input);
    } catch {
      return input === pattern;
    }
  }

  getSnapshot(): { metrics: { routeCount: number; activeRoutes: number; totalDispatches: number } } {
    const activeRoutes = Array.from(this.routes.values()).filter(r => r.active).length;
    const totalDispatches = Array.from(this.routingStats.values()).reduce((a, b) => a + b, 0);
    return {
      metrics: {
        routeCount: this.routes.size,
        activeRoutes,
        totalDispatches,
      },
    };
  }

  reset(): void {
    this.routes.clear();
    this.routeOrder = [];
    this.routingStats.clear();
  }

  getReport(): string {
    const activeRoutes = Array.from(this.routes.values()).filter(r => r.active).length;
    return `StreamRouter Report: routes=${this.routes.size}, active=${activeRoutes}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}