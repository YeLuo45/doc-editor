/**
 * V74 Event Router - Routes events to specific destinations based on rules
 * Provides event routing with add/remove/get routes functionality
 */

import { Event } from './EventBus';

export interface RouteRule {
  id: string;
  eventType: string;
  destination: string;
  priority: number;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface RouterConfig {
  enableLogging: boolean;
  maxRoutes: number;
  defaultPriority: number;
  asyncMode: boolean;
}

type RouteMap = Map<string, RouteRule[]>;

export class EventRouter {
  public config: RouterConfig;
  
  private routes: RouteMap = new Map();
  private routedCount: number = 0;
  private droppedCount: number = 0;

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      maxRoutes: config.maxRoutes ?? 500,
      defaultPriority: config.defaultPriority ?? 10,
      asyncMode: config.asyncMode ?? false,
    };
  }

  /**
   * Route an event based on its type - finds matching rules and routes
   */
  route<T>(event: Event<T>): string[] {
    if (this.config.enableLogging) {
      console.log(`[EventRouter] Routing event: ${event.type}`);
    }

    const rules = this.getRoutes(event.type);
    const matchedDestinations: string[] = [];

    rules.forEach(rule => {
      if (rule.enabled) {
        matchedDestinations.push(rule.destination);
        this.routedCount++;
        
        if (this.config.enableLogging) {
          console.log(`[EventRouter] Routed to: ${rule.destination}`);
        }
      }
    });

    if (matchedDestinations.length === 0) {
      this.droppedCount++;
    }

    return matchedDestinations;
  }

  /**
   * Add a new route rule
   */
  addRoute(
    eventType: string,
    destination: string,
    options?: { priority?: number; metadata?: Record<string, unknown> }
  ): string {
    const id = this.generateRouteId();
    
    const rule: RouteRule = {
      id,
      eventType,
      destination,
      priority: options?.priority ?? this.config.defaultPriority,
      enabled: true,
      metadata: options?.metadata,
    };

    if (!this.routes.has(eventType)) {
      this.routes.set(eventType, []);
    }

    const rules = this.routes.get(eventType)!;
    
    // Enforce max routes limit
    if (rules.length >= this.config.maxRoutes) {
      if (this.config.enableLogging) {
        console.warn('[EventRouter] Max routes limit reached');
      }
      return id;
    }

    rules.push(rule);
    rules.sort((a, b) => b.priority - a.priority);

    if (this.config.enableLogging) {
      console.log(`[EventRouter] Added route: ${eventType} -> ${destination}`);
    }

    return id;
  }

  /**
   * Remove a route by ID
   */
  removeRoute(routeId: string): boolean {
    let found = false;
    
    this.routes.forEach((rules, eventType) => {
      const index = rules.findIndex(r => r.id === routeId);
      if (index !== -1) {
        rules.splice(index, 1);
        found = true;
        if (rules.length === 0) {
          this.routes.delete(eventType);
        }
      }
    });

    if (this.config.enableLogging && found) {
      console.log(`[EventRouter] Removed route: ${routeId}`);
    }

    return found;
  }

  /**
   * Get all routes for a specific event type
   */
  getRoutes(eventType?: string): RouteRule[] {
    if (eventType) {
      return this.routes.get(eventType) ?? [];
    }
    
    // Return all routes flattened
    const allRoutes: RouteRule[] = [];
    this.routes.forEach(rules => {
      allRoutes.push(...rules);
    });
    return allRoutes;
  }

  /**
   * Get routes filtered by destination
   */
  getRoutesByDestination(destination: string): RouteRule[] {
    const result: RouteRule[] = [];
    this.routes.forEach(rules => {
      rules.forEach(rule => {
        if (rule.destination === destination) {
          result.push(rule);
        }
      });
    });
    return result;
  }

  /**
   * Enable or disable a route
   */
  setRouteEnabled(routeId: string, enabled: boolean): boolean {
    let found = false;
    
    this.routes.forEach(rules => {
      const rule = rules.find(r => r.id === routeId);
      if (rule) {
        rule.enabled = enabled;
        found = true;
      }
    });

    return found;
  }

  /**
   * Generate a unique route ID
   */
  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current snapshot of router state
   */
  getSnapshot(): { metrics: Record<string, number | string | boolean> } {
    let totalRoutes = 0;
    this.routes.forEach(rules => {
      totalRoutes += rules.length;
    });

    return {
      metrics: {
        totalRoutes,
        routedCount: this.routedCount,
        droppedCount: this.droppedCount,
        eventTypes: this.routes.size,
        maxRoutes: this.config.maxRoutes,
        asyncMode: this.config.asyncMode,
      },
    };
  }

  /**
   * Reset all routing data and metrics
   */
  reset(): void {
    this.routes.clear();
    this.routedCount = 0;
    this.droppedCount = 0;
    
    if (this.config.enableLogging) {
      console.log('[EventRouter] Reset performed');
    }
  }

  /**
   * Get a human-readable report of the router state
   */
  getReport(): string {
    let totalRoutes = 0;
    this.routes.forEach(rules => {
      totalRoutes += rules.length;
    });

    return [
      '=== EventRouter Report ===',
      `Total Routes: ${totalRoutes}`,
      `Event Types: ${this.routes.size}`,
      `Routed Events: ${this.routedCount}`,
      `Dropped Events: ${this.droppedCount}`,
      `Async Mode: ${this.config.asyncMode ? 'Enabled' : 'Disabled'}`,
      `Max Routes: ${this.config.maxRoutes}`,
      '===========================',
    ].join('\n');
  }

  /**
   * Export metrics in a portable format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    let totalRoutes = 0;
    this.routes.forEach(rules => {
      totalRoutes += rules.length;
    });

    return {
      version: 'V74',
      metrics: {
        totalRoutes,
        routedCount: this.routedCount,
        droppedCount: this.droppedCount,
        eventTypes: this.routes.size,
        config: { ...this.config },
      },
    };
  }
}