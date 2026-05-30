/**
 * V132 Calculator Tests
 */

import { Calculator, CalculatorConfig, Operation } from '../calculator/Calculator';
import { CalculatorRegistry, RegistryConfig } from '../calculator/CalculatorRegistry';
import { CalculatorExecutor, ExecutorConfig } from '../calculator/CalculatorExecutor';
import { CalculatorMonitor, MonitorConfig } from '../calculator/CalculatorMonitor';

describe('V132 Calculator Suite', () => {
  describe('Calculator', () => {
    test('should create calculator with config', () => {
      const config: CalculatorConfig = {
        precision: 2,
        maxOperations: 10,
        enableValidation: true,
        timeout: 5000,
      };
      const calc = new Calculator(config);
      expect(calc.config).toEqual(config);
    });

    test('should calculate with registered operation', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      expect(calc.calculate('add', 5, 3)).toBe(8);
    });

    test('should throw error for unknown operation', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      expect(() => calc.calculate('unknown', 1, 2)).toThrow("Operation 'unknown' not found");
    });

    test('should remove operation', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      expect(calc.removeOperation('add')).toBe(true);
      expect(() => calc.calculate('add', 1, 2)).toThrow();
    });

    test('should get calculator instance', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      expect(calc.getCalculator()).toBe(calc);
    });

    test('should track stats', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      calc.calculate('add', 5, 3);
      const stats = calc.getStats();
      expect(stats.totalCalculations).toBe(1);
      expect(stats.successfulCalculations).toBe(1);
    });

    test('should get snapshot', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const snapshot = calc.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset calculator', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      calc.calculate('add', 5, 3);
      calc.reset();
      expect(calc.getStats().totalCalculations).toBe(0);
    });

    test('should export metrics', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      expect(calc.exportMetrics()).toEqual({ version: '1.0.0' });
    });

    test('should generate report', () => {
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const report = calc.getReport();
      expect(report).toContain('Calculator Report');
    });
  });

  describe('CalculatorRegistry', () => {
    test('should create registry with config', () => {
      const config: RegistryConfig = {
        maxRegistrations: 10,
        enableLookupCache: true,
        defaultScope: 'default',
      };
      const registry = new CalculatorRegistry(config);
      expect(registry.config).toEqual(config);
    });

    test('should register calculator', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      expect(registry.register('calc1', calc)).toBe(true);
    });

    test('should unregister calculator', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      registry.register('calc1', calc);
      expect(registry.unregister('calc1')).toBe(true);
      expect(registry.has('calc1')).toBe(false);
    });

    test('should get registered calculator', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      registry.register('calc1', calc);
      expect(registry.get('calc1')).toBe(calc);
    });

    test('should get all registrations', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const calc1 = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const calc2 = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      registry.register('calc1', calc1);
      registry.register('calc2', calc2);
      expect(registry.getAll().size).toBe(2);
    });

    test('should check if calculator exists', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      registry.register('calc1', calc);
      expect(registry.has('calc1')).toBe(true);
      expect(registry.has('calc2')).toBe(false);
    });

    test('should get snapshot', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const snapshot = registry.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset registry', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      registry.register('calc1', calc);
      registry.reset();
      expect(registry.has('calc1')).toBe(false);
    });

    test('should export metrics', () => {
      const registry = new CalculatorRegistry({ maxRegistrations: 10, enableLookupCache: true, defaultScope: 'default' });
      expect(registry.exportMetrics()).toEqual({ version: '1.0.0' });
    });
  });

  describe('CalculatorExecutor', () => {
    test('should create executor with config', () => {
      const config: ExecutorConfig = {
        maxConcurrency: 5,
        enableRetry: true,
        retryAttempts: 3,
        executionTimeout: 5000,
      };
      const executor = new CalculatorExecutor(config);
      expect(executor.config).toEqual(config);
    });

    test('should execute calculation', () => {
      const executor = new CalculatorExecutor({ maxConcurrency: 5, enableRetry: true, retryAttempts: 3, executionTimeout: 5000 });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      const result = executor.execute(calc, 'add', 10, 5);
      expect(result).toBe(15);
    });

    test('should get results', () => {
      const executor = new CalculatorExecutor({ maxConcurrency: 5, enableRetry: true, retryAttempts: 3, executionTimeout: 5000 });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      executor.execute(calc, 'add', 10, 5);
      expect(executor.getResults().size).toBeGreaterThan(0);
    });

    test('should get stats', () => {
      const executor = new CalculatorExecutor({ maxConcurrency: 5, enableRetry: true, retryAttempts: 3, executionTimeout: 5000 });
      const stats = executor.getStats();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successfulExecutions');
    });

    test('should get snapshot', () => {
      const executor = new CalculatorExecutor({ maxConcurrency: 5, enableRetry: true, retryAttempts: 3, executionTimeout: 5000 });
      const snapshot = executor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset executor', () => {
      const executor = new CalculatorExecutor({ maxConcurrency: 5, enableRetry: true, retryAttempts: 3, executionTimeout: 5000 });
      const calc = new Calculator({ precision: 2, maxOperations: 10, enableValidation: true, timeout: 5000 });
      const addOp: Operation = { id: 'add', name: 'Addition', execute: (a, b) => a + b };
      calc.addOperation(addOp);
      executor.execute(calc, 'add', 10, 5);
      executor.reset();
      expect(executor.getStats().totalExecutions).toBe(0);
    });

    test('should export metrics', () => {
      const executor = new CalculatorExecutor({ maxConcurrency: 5, enableRetry: true, retryAttempts: 3, executionTimeout: 5000 });
      expect(executor.exportMetrics()).toEqual({ version: '1.0.0' });
    });
  });

  describe('CalculatorMonitor', () => {
    test('should create monitor with config', () => {
      const config: MonitorConfig = {
        enableRealTimeTracking: true,
        historySize: 100,
        alertThreshold: 1000,
        samplingRate: 1.0,
      };
      const monitor = new CalculatorMonitor(config);
      expect(monitor.config).toEqual(config);
    });

    test('should track events', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      monitor.track('calc1', 'add', 10);
      const metrics = monitor.getMetrics();
      expect(metrics.totalEvents).toBe(1);
    });

    test('should get history', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      monitor.track('calc1', 'add', 10);
      const history = monitor.getHistory();
      expect(history.length).toBe(1);
    });

    test('should get status', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      monitor.track('calc1', 'add', 10);
      const status = monitor.getStatus();
      expect(status.isMonitoring).toBe(true);
      expect(status.eventsTracked).toBe(1);
    });

    test('should get snapshot', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      const snapshot = monitor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset monitor', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      monitor.track('calc1', 'add', 10);
      monitor.reset();
      expect(monitor.getMetrics().totalEvents).toBe(0);
    });

    test('should export metrics', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      expect(monitor.exportMetrics()).toEqual({ version: '1.0.0' });
    });

    test('should generate report', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      const report = monitor.getReport();
      expect(report).toContain('Monitor Report');
    });

    test('should track multiple events', () => {
      const monitor = new CalculatorMonitor({ enableRealTimeTracking: true, historySize: 100, alertThreshold: 1000, samplingRate: 1.0 });
      monitor.track('calc1', 'add', 10);
      monitor.track('calc1', 'subtract', 5);
      monitor.track('calc2', 'multiply', 3);
      const metrics = monitor.getMetrics();
      expect(metrics.totalEvents).toBe(3);
      expect(metrics.successEvents).toBe(3);
    });
  });
});