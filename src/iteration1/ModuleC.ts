/**
 * ModuleC - Helper module for doc-editor V31 Iteration 1
 * Handles calculation and computation operations
 */

export interface ComputationResult {
  computationId: string;
  operation: string;
  inputs: unknown[];
  result: unknown;
  duration: number;
  timestamp: number;
}

export interface ComputeOptions {
  precision?: number;
  timeout?: number;
  cacheable?: boolean;
}

export class ModuleC {
  private computations: Map<string, ComputationResult> = new Map();
  private cache: Map<string, unknown> = new Map();
  private metrics: {
    totalCalculations: number;
    totalComputations: number;
    cacheHits: number;
    cacheMisses: number;
    averageDuration: number;
  } = {
    totalCalculations: 0,
    totalComputations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageDuration: 0,
  };

  /**
   * Perform a calculation with the given operands and operator
   */
  calculate(operand1: number, operand2: number, operator: '+' | '-' | '*' | '/' | '%'): number {
    this.metrics.totalCalculations++;

    switch (operator) {
      case '+':
        return operand1 + operand2;
      case '-':
        return operand1 - operand2;
      case '*':
        return operand1 * operand2;
      case '/':
        return operand2 !== 0 ? operand1 / operand2 : 0;
      case '%':
        return operand2 !== 0 ? operand1 % operand2 : 0;
      default:
        return 0;
    }
  }

  /**
   * Compute a result based on operation type
   */
  compute(
    operation: string,
    inputs: unknown[],
    options?: ComputeOptions
  ): ComputationResult {
    const computationId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    const cacheKey = `${operation}:${JSON.stringify(inputs)}`;
    if (options?.cacheable && this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      const cachedResult = this.cache.get(cacheKey);
      const duration = Date.now() - startTime;

      const result: ComputationResult = {
        computationId,
        operation,
        inputs,
        result: cachedResult,
        duration,
        timestamp: Date.now(),
      };
      this.computations.set(computationId, result);
      return result;
    }

    this.metrics.cacheMisses++;
    let computedResult: unknown;

    switch (operation) {
      case 'sum':
        computedResult = this.computeSum(inputs as number[]);
        break;
      case 'average':
        computedResult = this.computeAverage(inputs as number[]);
        break;
      case 'min':
        computedResult = this.computeMin(inputs as number[]);
        break;
      case 'max':
        computedResult = this.computeMax(inputs as number[]);
        break;
      case 'count':
        computedResult = (inputs as unknown[]).length;
        break;
      case 'concat':
        computedResult = (inputs as string[]).join('');
        break;
      default:
        computedResult = null;
    }

    if (options?.cacheable) {
      this.cache.set(cacheKey, computedResult);
    }

    const duration = Date.now() - startTime;
    const compResult: ComputationResult = {
      computationId,
      operation,
      inputs,
      result: computedResult,
      duration,
      timestamp: Date.now(),
    };

    this.computations.set(computationId, compResult);
    this.metrics.totalComputations++;
    this.metrics.averageDuration =
      (this.metrics.averageDuration * (this.metrics.totalComputations - 1) + duration) /
      this.metrics.totalComputations;

    return compResult;
  }

  private computeSum(numbers: number[]): number {
    return numbers.reduce((acc, n) => acc + n, 0);
  }

  private computeAverage(numbers: number[]): number {
    return numbers.length > 0 ? this.computeSum(numbers) / numbers.length : 0;
  }

  private computeMin(numbers: number[]): number {
    return numbers.length > 0 ? Math.min(...numbers) : 0;
  }

  private computeMax(numbers: number[]): number {
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }

  /**
   * Get computed result by ID
   */
  getValue(id: string): ComputationResult | undefined {
    return this.computations.get(id);
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): {
    computations: Map<string, ComputationResult>;
    cacheSize: number;
    metrics: typeof this.metrics;
  } {
    return {
      computations: new Map(this.computations),
      cacheSize: this.cache.size,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset all state and metrics
   */
  reset(): void {
    this.computations.clear();
    this.cache.clear();
    this.metrics = {
      totalCalculations: 0,
      totalComputations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageDuration: 0,
    };
  }

  /**
   * Generate a status report
   */
  getReport(): {
    status: 'idle' | 'active';
    totalComputations: number;
    cacheSize: number;
    metrics: typeof this.metrics;
    hitRate: number;
  } {
    const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate = totalCacheOps > 0 ? this.metrics.cacheHits / totalCacheOps : 0;

    return {
      status: this.computations.size > 0 ? 'active' : 'idle',
      totalComputations: this.computations.size,
      cacheSize: this.cache.size,
      metrics: { ...this.metrics },
      hitRate,
    };
  }

  /**
   * Export metrics
   */
  exportMetrics(): {
    timestamp: number;
    metrics: typeof this.metrics;
    version: string;
  } {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
    };
  }
}

export default ModuleC;