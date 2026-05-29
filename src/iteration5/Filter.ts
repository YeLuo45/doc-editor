/**
 * Filter.ts - V35 Iteration 5
 * Request filter with filter/intercept/getFiltered capabilities
 */

export type FilterFn = (request: RequestData) => FilterResult;

export interface RequestData {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  modifiedRequest?: RequestData;
}

export interface FilterEntry {
  name: string;
  fn: FilterFn;
  priority: number;
}

export interface FilterSnapshot {
  filters: string[];
  count: number;
  metrics: {
    totalFilters: number;
    registrations: number;
    checks: number;
    blocks: number;
    allows: number;
  };
}

export class Filter {
  private filters: FilterEntry[] = [];
  private registrations: number = 0;
  private checks: number = 0;
  private blocks: number = 0;
  private allows: number = 0;

  constructor() {
    this.filters = [];
    this.registrations = 0;
    this.checks = 0;
    this.blocks = 0;
    this.allows = 0;
  }

  /**
   * Register a filter function
   */
  filter(name: string, fn: FilterFn, priority?: number): boolean {
    if (!name || typeof fn !== 'function') {
      return false;
    }

    const entry: FilterEntry = {
      name,
      fn,
      priority: priority ?? this.filters.length,
    };

    this.filters.push(entry);
    this.filters.sort((a, b) => b.priority - a.priority);
    this.registrations++;

    return true;
  }

  /**
   * Intercept a request through all filters
   */
  intercept(request: RequestData): FilterResult {
    if (!request || !request.url || !request.method) {
      this.checks++;
      this.blocks++;
      return { allowed: false, reason: 'Invalid request format' };
    }

    this.checks++;

    for (const entry of this.filters) {
      try {
        const result = entry.fn(request);

        if (!result.allowed) {
          this.blocks++;
          return {
            allowed: false,
            reason: result.reason || `Blocked by filter: ${entry.name}`,
            modifiedRequest: result.modifiedRequest,
          };
        }

        // Apply modifications if any
        if (result.modifiedRequest) {
          request = { ...request, ...result.modifiedRequest };
        }
      } catch (err) {
        this.blocks++;
        return {
          allowed: false,
          reason: `Filter ${entry.name} threw error: ${String(err)}`,
        };
      }
    }

    this.allows++;
    return { allowed: true, modifiedRequest: request };
  }

  /**
   * Get all registered filters
   */
  getFiltered(): FilterEntry[] {
    return [...this.filters];
  }

  /**
   * Get snapshot of current filter state
   */
  getSnapshot(): FilterSnapshot {
    return {
      filters: this.filters.map(f => `${f.priority}:${f.name}`),
      count: this.filters.length,
      metrics: {
        totalFilters: this.filters.length,
        registrations: this.registrations,
        checks: this.checks,
        blocks: this.blocks,
        allows: this.allows,
      },
    };
  }

  /**
   * Reset all filters and metrics
   */
  reset(): void {
    this.filters = [];
    this.registrations = 0;
    this.checks = 0;
    this.blocks = 0;
    this.allows = 0;
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Filter Report ===',
      `Total Filters: ${snapshot.count}`,
      `Registrations: ${snapshot.metrics.registrations}`,
      `Checks: ${snapshot.metrics.checks}`,
      `Blocks: ${snapshot.metrics.blocks}`,
      `Allows: ${snapshot.metrics.allows}`,
      '',
      'Filter Chain (by priority):',
    ];

    if (this.filters.length === 0) {
      lines.push('  (none)');
    } else {
      this.filters.forEach(f => {
        lines.push(`  [${f.priority}] ${f.name}`);
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
      totalFilters: snapshot.count,
      registrations: snapshot.metrics.registrations,
      checks: snapshot.metrics.checks,
      blocks: snapshot.metrics.blocks,
      allows: snapshot.metrics.allows,
      chain: snapshot.filters,
    };
  }

  /**
   * Clear all filters
   */
  clear(): void {
    this.filters = [];
  }
}

export default Filter;