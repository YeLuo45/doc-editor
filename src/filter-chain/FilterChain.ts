/**
 * FilterChain.ts - V110 Filter Chain
 * Manages a chain of filters with add/remove/execute/getChain/getStats
 */

export type FilterChainConfig = {
  maxFilters: number;
  enableBypass: boolean;
  stopOnError: boolean;
  asyncExecution: boolean;
};

export type FilterChainStatus = 'idle' | 'executing' | 'paused' | 'bypassed' | 'completed';

export type FilterChainStats = {
  filtersAdded: number;
  filtersRemoved: number;
  filtersExecuted: number;
  filtersBypassed: number;
  errorsEncountered: number;
  lastExecutionTime: number;
};

export type FilterChainSnapshot = {
  metrics: {
    status: FilterChainStatus;
    filtersAdded: number;
    filtersRemoved: number;
    filtersExecuted: number;
    filtersBypassed: number;
    errorsEncountered: number;
  };
  timestamp: number;
};

export interface Filter {
  name: string;
  priority: number;
  execute(data: unknown): Promise<unknown>;
}

export class FilterChain {
  config: FilterChainConfig;
  private status: FilterChainStatus = 'idle';
  private filters: Filter[] = [];
  private filtersAdded: number = 0;
  private filtersRemoved: number = 0;
  private filtersExecuted: number = 0;
  private filtersBypassed: number = 0;
  private errorsEncountered: number = 0;
  private lastExecutionTime: number = 0;
  private executionStartTime: number = 0;

  constructor(config: FilterChainConfig) {
    this.config = { ...config };
  }

  add(filter: Filter): boolean {
    if (this.filters.length >= this.config.maxFilters) {
      return false;
    }
    const existingIndex = this.filters.findIndex(f => f.name === filter.name);
    if (existingIndex !== -1) {
      return false;
    }
    this.filters.push(filter);
    this.filters.sort((a, b) => a.priority - b.priority);
    this.filtersAdded++;
    return true;
  }

  remove(filterName: string): boolean {
    const index = this.filters.findIndex(f => f.name === filterName);
    if (index === -1) {
      return false;
    }
    this.filters.splice(index, 1);
    this.filtersRemoved++;
    return true;
  }

  execute(initialData: unknown): Promise<unknown> {
    if (this.filters.length === 0) {
      return Promise.resolve(initialData);
    }

    this.status = 'executing';
    this.executionStartTime = Date.now();
    this.filtersExecuted = 0;
    this.filtersBypassed = 0;
    this.errorsEncountered = 0;

    return this.executeFilters(initialData, 0);
  }

  private async executeFilters(data: unknown, index: number): Promise<unknown> {
    if (index >= this.filters.length) {
      this.status = 'completed';
      this.lastExecutionTime = Date.now() - this.executionStartTime;
      return data;
    }

    if (this.status === 'bypassed' || (this.config.enableBypass && this.status === 'bypassed')) {
      this.filtersBypassed++;
      return this.executeFilters(data, index + 1);
    }

    const filter = this.filters[index];

    try {
      data = await filter.execute(data);
      this.filtersExecuted++;
    } catch (error) {
      this.errorsEncountered++;
      if (this.config.stopOnError) {
        this.status = 'idle';
        throw error;
      }
    }

    return this.executeFilters(data, index + 1);
  }

  bypass(): void {
    this.status = 'bypassed';
  }

  getChain(): Filter[] {
    return [...this.filters];
  }

  getStats(): FilterChainStats {
    return {
      filtersAdded: this.filtersAdded,
      filtersRemoved: this.filtersRemoved,
      filtersExecuted: this.filtersExecuted,
      filtersBypassed: this.filtersBypassed,
      errorsEncountered: this.errorsEncountered,
      lastExecutionTime: this.lastExecutionTime,
    };
  }

  getSnapshot(): FilterChainSnapshot {
    return {
      metrics: {
        status: this.status,
        filtersAdded: this.filtersAdded,
        filtersRemoved: this.filtersRemoved,
        filtersExecuted: this.filtersExecuted,
        filtersBypassed: this.filtersBypassed,
        errorsEncountered: this.errorsEncountered,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.status = 'idle';
    this.filters = [];
    this.filtersAdded = 0;
    this.filtersRemoved = 0;
    this.filtersExecuted = 0;
    this.filtersBypassed = 0;
    this.errorsEncountered = 0;
    this.lastExecutionTime = 0;
    this.executionStartTime = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Filter Chain Report ===',
      `Status: ${snapshot.metrics.status}`,
      `Filters in chain: ${this.filters.length}`,
      `Filters Added: ${snapshot.metrics.filtersAdded}`,
      `Filters Removed: ${snapshot.metrics.filtersRemoved}`,
      `Filters Executed: ${snapshot.metrics.filtersExecuted}`,
      `Filters Bypassed: ${snapshot.metrics.filtersBypassed}`,
      `Errors: ${snapshot.metrics.errorsEncountered}`,
      `Last Execution Time: ${this.lastExecutionTime}ms`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & FilterChainSnapshot['metrics'] {
    return {
      version: 'V110',
      ...this.getSnapshot().metrics,
    };
  }
}