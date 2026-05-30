/**
 * V97 MessageRouter - Message routing with rule-based filtering for doc-editor
 * Handles message routing with dynamic route management
 */

export type MessageRouterConfig = {
  enableWildcards?: boolean;
  enableRules?: boolean;
  maxRoutes?: number;
  enableLogging?: boolean;
  defaultHandler?: string;
};

export type Route = {
  id: string;
  pattern: string;
  destination: string;
  priority: number;
  filters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type RoutedMessage = {
  messageId: string;
  pattern: string;
  destination: string;
  timestamp: number;
};

type MessageRouterConfigType = MessageRouterConfig;

export class MessageRouter {
  private config: MessageRouterConfigType;
  private routes: Map<string, Route> = new Map();
  private routingHistory: RoutedMessage[] = [];
  private stats = {
    totalRoutes: 0,
    totalRouted: 0,
    totalMatches: 0,
    totalMisses: 0,
  };

  constructor(config: MessageRouterConfig = {}) {
    this.config = {
      enableWildcards: config.enableWildcards ?? true,
      enableRules: config.enableRules ?? true,
      maxRoutes: config.maxRoutes ?? 50,
      enableLogging: config.enableLogging ?? true,
      defaultHandler: config.defaultHandler ?? 'default',
    };
  }

  route(message: unknown, messageId: string, metadata?: Record<string, unknown>): string[] {
    const matchedDestinations: string[] = [];
    const messageStr = JSON.stringify(message);

    for (const route of this.routes.values()) {
      if (this.matchesPattern(messageStr, route.pattern)) {
        matchedDestinations.push(route.destination);
        this.stats.totalMatches++;
        this.routingHistory.push({
          messageId,
          pattern: route.pattern,
          destination: route.destination,
          timestamp: Date.now(),
        });
      }
    }

    if (matchedDestinations.length === 0) {
      this.stats.totalMisses++;
      matchedDestinations.push(this.config.defaultHandler ?? 'default');
    }

    this.stats.totalRouted++;
    return matchedDestinations;
  }

  addRoute(pattern: string, destination: string, priority?: number, filters?: Record<string, unknown>): string {
    if (this.routes.size >= (this.config.maxRoutes ?? 50)) {
      throw new Error('Maximum routes reached');
    }
    const id = this.generateRouteId();
    const route: Route = {
      id,
      pattern,
      destination,
      priority: priority ?? 0,
      filters,
    };
    this.routes.set(id, route);
    this.stats.totalRoutes++;
    return id;
  }

  removeRoute(routeId: string): boolean {
    const deleted = this.routes.delete(routeId);
    if (deleted) {
      this.stats.totalRoutes--;
    }
    return deleted;
  }

  getRoutes(pattern?: string): Route[] {
    if (pattern) {
      return Array.from(this.routes.values()).filter((r) => r.pattern === pattern);
    }
    return Array.from(this.routes.values());
  }

  getRoute(routeId: string): Route | null {
    return this.routes.get(routeId) ?? null;
  }

  updateRoute(routeId: string, updates: Partial<Route>): boolean {
    const route = this.routes.get(routeId);
    if (!route) {
      return false;
    }
    const updated: Route = { ...route, ...updates, id: routeId };
    this.routes.set(routeId, updated);
    return true;
  }

  getHistory(): RoutedMessage[] {
    return [...this.routingHistory];
  }

  clearHistory(): void {
    this.routingHistory = [];
  }

  getStats(): {
    totalRoutes: number;
    totalRouted: number;
    totalMatches: number;
    totalMisses: number;
  } {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        routes: Array.from(this.routes.values()),
        history: [...this.routingHistory],
        stats: this.getStats(),
        config: this.config,
      },
    };
  }

  reset(): void {
    this.routes.clear();
    this.routingHistory = [];
    this.stats = {
      totalRoutes: 0,
      totalRouted: 0,
      totalMatches: 0,
      totalMisses: 0,
    };
  }

  getReport(): string {
    const stats = this.getStats();
    const lines = [
      '=== Message Router Report ===',
      `Total Routes: ${stats.totalRoutes}`,
      `Total Routed: ${stats.totalRouted}`,
      `Total Matches: ${stats.totalMatches}`,
      `Total Misses: ${stats.totalMisses}`,
      `Routes: ${this.routes.size}`,
      `Enable Wildcards: ${this.config.enableWildcards}`,
      `Max Routes: ${this.config.maxRoutes}`,
      `Config: ${JSON.stringify(this.config)}`,
      '============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v97',
      routes: this.routes.size,
      routed: this.stats.totalRouted,
      matches: this.stats.totalMatches,
      misses: this.stats.totalMisses,
    };
  }

  private matchesPattern(message: string, pattern: string): boolean {
    if (this.config.enableWildcards && pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(message);
    }
    return message.includes(pattern);
  }

  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}