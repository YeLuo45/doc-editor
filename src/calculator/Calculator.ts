/**
 * V132 Calculator Module
 * Core calculator functionality for doc-editor
 */

export type CalculatorConfig = {
  precision: number;
  maxOperations: number;
  enableValidation: boolean;
  timeout: number;
};

export type Operation = {
  id: string;
  name: string;
  execute: (a: number, b: number) => number;
  undo?: () => void;
};

export type CalculationResult = {
  id: string;
  operation: string;
  operands: [number, number];
  result: number;
  timestamp: number;
};

export type CalculatorStats = {
  totalCalculations: number;
  successfulCalculations: number;
  failedCalculations: number;
  lastCalculation: number | null;
  averageExecutionTime: number;
};

export class Calculator {
  private _config: CalculatorConfig;
  private operations: Map<string, Operation>;
  private history: CalculationResult[];
  private stats: CalculatorStats;

  constructor(config: CalculatorConfig) {
    this._config = { ...config };
    this.operations = new Map();
    this.history = [];
    this.stats = {
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      lastCalculation: null,
      averageExecutionTime: 0,
    };
  }

  get config(): CalculatorConfig {
    return { ...this._config };
  }

  calculate(operationName: string, a: number, b: number): number {
    const operation = this.operations.get(operationName);
    if (!operation) {
      throw new Error(`Operation '${operationName}' not found`);
    }

    if (this._config.enableValidation) {
      if (isNaN(a) || isNaN(b)) {
        throw new Error('Invalid operands: NaN detected');
      }
    }

    const startTime = Date.now();
    try {
      const result = operation.execute(a, b);
      const executionTime = Date.now() - startTime;

      const calcResult: CalculationResult = {
        id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: operationName,
        operands: [a, b],
        result,
        timestamp: Date.now(),
      };

      this.history.push(calcResult);
      this.stats.totalCalculations++;
      this.stats.successfulCalculations++;
      this.stats.lastCalculation = executionTime;
      this.stats.averageExecutionTime =
        (this.stats.averageExecutionTime * (this.stats.successfulCalculations - 1) + executionTime) /
        this.stats.successfulCalculations;

      return result;
    } catch (error) {
      this.stats.totalCalculations++;
      this.stats.failedCalculations++;
      throw error;
    }
  }

  addOperation(operation: Operation): void {
    if (this.operations.size >= this._config.maxOperations) {
      throw new Error('Maximum operations limit reached');
    }
    if (this.operations.has(operation.id)) {
      throw new Error(`Operation with id '${operation.id}' already exists`);
    }
    this.operations.set(operation.id, operation);
  }

  removeOperation(operationId: string): boolean {
    return this.operations.delete(operationId);
  }

  getCalculator(): Calculator {
    return this;
  }

  getStats(): CalculatorStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: CalculatorStats } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this.history = [];
    this.stats = {
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      lastCalculation: null,
      averageExecutionTime: 0,
    };
  }

  getReport(): string {
    return [
      '=== Calculator Report ===',
      `Total Calculations: ${this.stats.totalCalculations}`,
      `Successful: ${this.stats.successfulCalculations}`,
      `Failed: ${this.stats.failedCalculations}`,
      `Avg Execution Time: ${this.stats.averageExecutionTime.toFixed(2)}ms`,
      `Operations Registered: ${this.operations.size}`,
      '========================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}