/**
 * V74 Event Filter - Filters and transforms events based on criteria
 * Provides event filtering with add/remove/get filters functionality
 */

import { Event } from './EventBus';

export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

export interface EventFilter {
  id: string;
  name: string;
  criteria: FilterCriteria[];
  transform?: (event: Event) => Event;
  enabled: boolean;
  priority: number;
}

export interface FilterConfig {
  enableLogging: boolean;
  maxFilters: number;
  defaultPriority: number;
  strictMode: boolean;
}

type FilterList = EventFilter[];

export class EventFilterClass {
  public config: FilterConfig;
  
  private filters: FilterList = [];
  private filteredCount: number = 0;
  private passedCount: number = 0;

  constructor(config: Partial<FilterConfig> = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? false,
      maxFilters: config.maxFilters ?? 100,
      defaultPriority: config.defaultPriority ?? 5,
      strictMode: config.strictMode ?? false,
    };
  }

  /**
   * Filter an event - returns the event if it passes all filter criteria
   */
  filter<T>(event: Event<T>): Event<T> | null {
    if (this.config.enableLogging) {
      console.log(`[EventFilter] Filtering event: ${event.type}`);
    }

    const enabledFilters = this.getFilters().filter(f => f.enabled);
    
    if (enabledFilters.length === 0) {
      return event;
    }

    for (const filter of enabledFilters) {
      if (!this.matchesCriteria(event, filter.criteria)) {
        this.filteredCount++;
        
        if (this.config.enableLogging) {
          console.log(`[EventFilter] Event filtered out by: ${filter.name}`);
        }
        
        return null;
      }
    }

    this.passedCount++;

    // Apply transform if defined
    const matchingFilter = enabledFilters.find(f => f.transform);
    if (matchingFilter?.transform) {
      return matchingFilter.transform(event) as Event<T>;
    }

    return event;
  }

  /**
   * Check if an event matches filter criteria
   */
  private matchesCriteria(event: Event, criteria: FilterCriteria[]): boolean {
    if (criteria.length === 0) return true;

    const result = criteria.every(c => {
      const value = this.getNestedValue(event, c.field);
      
      switch (c.operator) {
        case 'eq':
          return value === c.value;
        case 'neq':
          return value !== c.value;
        case 'gt':
          return typeof value === 'number' && value > c.value;
        case 'lt':
          return typeof value === 'number' && value < c.value;
        case 'contains':
          return typeof value === 'string' && value.includes(String(c.value));
        case 'startsWith':
          return typeof value === 'string' && value.startsWith(String(c.value));
        case 'endsWith':
          return typeof value === 'string' && value.endsWith(String(c.value));
        default:
          return false;
      }
    });

    return this.config.strictMode ? result : true;
  }

  /**
   * Get nested value from an object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Add a new filter
   */
  addFilter(
    name: string,
    criteria: FilterCriteria[],
    options?: { priority?: number; transform?: (event: Event) => Event }
  ): string {
    const id = this.generateFilterId();

    const filter: EventFilter = {
      id,
      name,
      criteria,
      transform: options?.transform,
      enabled: true,
      priority: options?.priority ?? this.config.defaultPriority,
    };

    if (this.filters.length >= this.config.maxFilters) {
      if (this.config.enableLogging) {
        console.warn('[EventFilter] Max filters limit reached');
      }
      return id;
    }

    this.filters.push(filter);
    this.filters.sort((a, b) => b.priority - a.priority);

    if (this.config.enableLogging) {
      console.log(`[EventFilter] Added filter: ${name}`);
    }

    return id;
  }

  /**
   * Remove a filter by ID
   */
  removeFilter(filterId: string): boolean {
    const index = this.filters.findIndex(f => f.id === filterId);
    
    if (index === -1) return false;

    this.filters.splice(index, 1);

    if (this.config.enableLogging) {
      console.log(`[EventFilter] Removed filter: ${filterId}`);
    }

    return true;
  }

  /**
   * Get all filters, optionally filtered by enabled state
   */
  getFilters(enabledOnly?: boolean): EventFilter[] {
    if (enabledOnly) {
      return this.filters.filter(f => f.enabled);
    }
    return [...this.filters];
  }

  /**
   * Get filter by ID
   */
  getFilterById(filterId: string): EventFilter | undefined {
    return this.filters.find(f => f.id === filterId);
  }

  /**
   * Enable or disable a filter
   */
  setFilterEnabled(filterId: string, enabled: boolean): boolean {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return false;

    filter.enabled = enabled;
    return true;
  }

  /**
   * Generate a unique filter ID
   */
  private generateFilterId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current snapshot of filter state
   */
  getSnapshot(): { metrics: Record<string, number | string | boolean> } {
    return {
      metrics: {
        totalFilters: this.filters.length,
        enabledFilters: this.filters.filter(f => f.enabled).length,
        filteredCount: this.filteredCount,
        passedCount: this.passedCount,
        maxFilters: this.config.maxFilters,
        strictMode: this.config.strictMode,
      },
    };
  }

  /**
   * Reset all filters and metrics
   */
  reset(): void {
    this.filters = [];
    this.filteredCount = 0;
    this.passedCount = 0;
    
    if (this.config.enableLogging) {
      console.log('[EventFilter] Reset performed');
    }
  }

  /**
   * Get a human-readable report of the filter state
   */
  getReport(): string {
    return [
      '=== EventFilter Report ===',
      `Total Filters: ${this.filters.length}`,
      `Enabled Filters: ${this.filters.filter(f => f.enabled).length}`,
      `Filtered Events: ${this.filteredCount}`,
      `Passed Events: ${this.passedCount}`,
      `Strict Mode: ${this.config.strictMode ? 'Enabled' : 'Disabled'}`,
      `Max Filters: ${this.config.maxFilters}`,
      '===========================',
    ].join('\n');
  }

  /**
   * Export metrics in a portable format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V74',
      metrics: {
        totalFilters: this.filters.length,
        enabledFilters: this.filters.filter(f => f.enabled).length,
        filteredCount: this.filteredCount,
        passedCount: this.passedCount,
        config: { ...this.config },
      },
    };
  }
}