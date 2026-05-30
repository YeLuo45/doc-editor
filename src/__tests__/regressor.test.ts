/**
 * V143 Regressor Test Suite
 * Comprehensive tests for Regressor, RegressorRegistry, RegressorExecutor, and RegressorMonitor
 */

import { Regressor, RegressorConfig, Predictor, RegressionResult, RegressorStats } from '../regressor/Regressor';
import { RegressorRegistry, RegistryConfig, RegistryEntry } from '../regressor/RegressorRegistry';
import { RegressorExecutor, ExecutorConfig, ExecutionResult, ExecutionTask } from '../regressor/RegressorExecutor';
import { RegressorMonitor, MonitorConfig, MonitorMetrics, HealthStatus } from '../regressor/RegressorMonitor';

describe('V143 Regressor Tests', () => {
  // ========== Regressor Tests ==========
  describe('Regressor', () => {
    let config: RegressorConfig;
    let regressor: Regressor;

    beforeEach(() => {
      config = {
        name: 'TestRegressor',
        version: '1.4.3',
        tolerance: 0.05,
        maxIterations: 100,
        convergenceThreshold: 0.001,
        enableValidation: true,
      };
      regressor = new Regressor(config);
    });

    test('should create Regressor with correct config', () => {
      expect(regressor.config).toEqual(config);
      expect(regressor.config.name).toBe('TestRegressor');
      expect(regressor.config.tolerance).toBe(0.05);
    });

    test('should add predictor and return id', () => {
      const predictor: Omit<Predictor, 'id'> = {
        name: 'TestPredictor',
        weight: 1.0,
        coefficient: 0.5,
      };
      const id = regressor.addPredictor(predictor);
      expect(typeof id).toBe('string');
      expect(id.startsWith('pred_')).toBe(true);
    });

    test('should remove existing predictor', () => {
      const id = regressor.addPredictor({ name: 'TestPredictor', weight: 1.0, coefficient: 0.5 });
      expect(regressor.removePredictor(id)).toBe(true);
      expect(regressor.getRegressor(id)).toBeUndefined();
    });

    test('should return false when removing non-existent predictor', () => {
      expect(regressor.removePredictor('nonexistent')).toBe(false);
    });

    test('should get predictor by id', () => {
      const id = regressor.addPredictor({ name: 'TestPredictor', weight: 1.0, coefficient: 0.5 });
      const predictor = regressor.getRegressor(id);
      expect(predictor).toBeDefined();
      expect(predictor?.name).toBe('TestPredictor');
    });

    test('should return undefined for non-existent predictor', () => {
      expect(regressor.getRegressor('nonexistent')).toBeUndefined();
    });

    test('should perform regression and return results', () => {
      regressor.addPredictor({ name: 'Pred1', weight: 1.0, coefficient: 0.5 });
      regressor.addPredictor({ name: 'Pred2', weight: 0.8, coefficient: 0.3 });
      const results = regressor.regress([1, 2, 3]);
      expect(results.length).toBe(2);
      expect(results[0].predictorId).toBeDefined();
      expect(typeof results[0].value).toBe('number');
      expect(typeof results[0].residual).toBe('number');
    });

    test('should throw error when regressing without predictors', () => {
      expect(() => regressor.regress([1, 2, 3])).toThrow('No predictors available for regression');
    });

    test('should calculate stats after regression', () => {
      regressor.addPredictor({ name: 'Pred1', weight: 1.0, coefficient: 0.5 });
      regressor.regress([1, 2, 3]);
      const stats = regressor.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats!.rSquared).toBe('number');
      expect(typeof stats!.standardError).toBe('number');
    });

    test('should return null stats before regression', () => {
      expect(regressor.getStats()).toBeNull();
    });

    test('should return correct snapshot', () => {
      const snapshot = regressor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('iteration');
      expect(snapshot).toHaveProperty('converged');
    });

    test('should reset all state', () => {
      regressor.addPredictor({ name: 'Pred1', weight: 1.0, coefficient: 0.5 });
      regressor.regress([1, 2, 3]);
      regressor.reset();
      expect(regressor.getStats()).toBeNull();
      const snapshot = regressor.getSnapshot();
      expect(snapshot.iteration).toBe(0);
    });

    test('should generate report string', () => {
      const report = regressor.getReport();
      expect(report).toContain('=== Regressor Report ===');
      expect(report).toContain('TestRegressor');
    });

    test('should export metrics with version', () => {
      const metrics = regressor.exportMetrics();
      expect(metrics.version).toBe('1.4.3');
      expect(metrics.config).toEqual(config);
    });
  });

  // ========== RegressorRegistry Tests ==========
  describe('RegressorRegistry', () => {
    let registry: RegressorRegistry;
    let regressor: Regressor;

    beforeEach(() => {
      const config: RegressorConfig = {
        name: 'TestRegressor',
        version: '1.4.3',
        tolerance: 0.05,
        maxIterations: 100,
        convergenceThreshold: 0.001,
        enableValidation: true,
      };
      regressor = new Regressor(config);
      registry = new RegressorRegistry();
    });

    test('should register regressor and return id', () => {
      const id = registry.register('TestRegressors', regressor);
      expect(typeof id).toBe('string');
      expect(id.startsWith('reg_')).toBe(true);
    });

    test('should unregister existing regressor', () => {
      const id = registry.register('TestRegressors', regressor);
      expect(registry.unregister(id)).toBe(true);
      expect(registry.has(id)).toBe(false);
    });

    test('should get regressor by id', () => {
      const id = registry.register('TestRegressors', regressor);
      const retrieved = registry.get(id);
      expect(retrieved).toBe(regressor);
    });

    test('should return all registered regressors', () => {
      registry.register('Test1', regressor);
      registry.register('Test2', new Regressor({ name: 'R2', version: '1.4.3', tolerance: 0.1, maxIterations: 50, convergenceThreshold: 0.01, enableValidation: false }));
      const all = registry.getAll();
      expect(all.length).toBe(2);
    });

    test('should check if regressor exists', () => {
      const id = registry.register('TestRegressors', regressor);
      expect(registry.has(id)).toBe(true);
      expect(registry.has('nonexistent')).toBe(false);
    });

    test('should find regressors by name', () => {
      const id1 = registry.register('Named', regressor);
      const r2 = new Regressor({ name: 'Named', version: '1.4.3', tolerance: 0.1, maxIterations: 50, convergenceThreshold: 0.01, enableValidation: false });
      registry.register('Named', r2);
      const found = registry.findByName('Named');
      expect(found.length).toBe(2);
    });

    test('should track access count', () => {
      const id = registry.register('TestRegressors', regressor);
      registry.get(id);
      const entry = registry.getEntry(id);
      expect(entry?.accessCount).toBe(1); // 0 at register, +1 for get call
    });

    test('should get correct count', () => {
      expect(registry.getCount()).toBe(0);
      registry.register('Test1', regressor);
      expect(registry.getCount()).toBe(1);
    });

    test('should clear all entries', () => {
      registry.register('Test1', regressor);
      registry.clear();
      expect(registry.getCount()).toBe(0);
    });

    test('should export metrics', () => {
      const metrics = registry.exportMetrics();
      expect(metrics.version).toBe('1.4.3');
      expect(metrics.count).toBe(0);
    });
  });

  // ========== RegressorExecutor Tests ==========
  describe('RegressorExecutor', () => {
    let registry: RegressorRegistry;
    let executor: RegressorExecutor;
    let regressor: Regressor;

    beforeEach(() => {
      const config: RegressorConfig = {
        name: 'TestRegressor',
        version: '1.4.3',
        tolerance: 0.05,
        maxIterations: 100,
        convergenceThreshold: 0.001,
        enableValidation: true,
      };
      regressor = new Regressor(config);
      registry = new RegressorRegistry();
      registry.register('Test', regressor);
      executor = new RegressorExecutor(registry);
    });

    test('should execute and return results', () => {
      const result = executor.execute('unknown', [1, 2, 3]);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Regressor not found');
    });

    test('should execute with valid regressor', () => {
      const id = registry.register('Test2', regressor);
      regressor.addPredictor({ name: 'Pred1', weight: 1.0, coefficient: 0.5 });
      const result = executor.execute(id, [1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
    });

    test('should run multiple tasks', () => {
      const id = registry.register('Test3', regressor);
      regressor.addPredictor({ name: 'Pred1', weight: 1.0, coefficient: 0.5 });
      const tasks = [
        { regressorId: id, inputData: [1, 2, 3] },
      ];
      const results = executor.run(tasks);
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
    });

    test('should get all results', () => {
      executor.execute(registry.getAll()[0] || '', [1]);
      const allResults = executor.getResults();
      expect(Array.isArray(allResults)).toBe(true);
    });

    test('should get stats', () => {
      const stats = executor.getStats();
      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('successfulTasks');
      expect(stats).toHaveProperty('failedTasks');
    });

    test('should clear results', () => {
      executor.execute(registry.getAll()[0] || '', [1]);
      executor.clearResults();
      expect(executor.getResults()?.length).toBe(0);
    });

    test('should export metrics', () => {
      const metrics = executor.exportMetrics();
      expect(metrics.version).toBe('1.4.3');
      expect(metrics.config).toBeDefined();
    });
  });

  // ========== RegressorMonitor Tests ==========
  describe('RegressorMonitor', () => {
    let monitor: RegressorMonitor;
    let registry: RegressorRegistry;
    let executor: RegressorExecutor;
    let regressor: Regressor;

    beforeEach(() => {
      monitor = new RegressorMonitor();
      const config: RegressorConfig = {
        name: 'TestRegressor',
        version: '1.4.3',
        tolerance: 0.05,
        maxIterations: 100,
        convergenceThreshold: 0.001,
        enableValidation: true,
      };
      regressor = new Regressor(config);
      registry = new RegressorRegistry();
      registry.register('Test', regressor);
      executor = new RegressorExecutor(registry);
    });

    test('should track execution result', () => {
      const result: ExecutionResult = {
        taskId: 'task_1',
        regressorId: 'reg_1',
        results: [],
        executionTime: 100,
        success: true,
      };
      monitor.track(result);
      const metrics = monitor.getMetrics();
      expect(metrics.executionCount).toBe(1);
    });

    test('should get history', () => {
      monitor.track({ taskId: 'task_1', regressorId: 'reg_1', results: [], executionTime: 100, success: true });
      monitor.track({ taskId: 'task_2', regressorId: 'reg_1', results: [], executionTime: 200, success: false });
      const history = monitor.getHistory();
      expect(history.length).toBe(2);
    });

    test('should get history with limit', () => {
      for (let i = 0; i < 5; i++) {
        monitor.track({ taskId: `task_${i}`, regressorId: 'reg_1', results: [], executionTime: 100, success: true });
      }
      const history = monitor.getHistory(2);
      expect(history.length).toBe(2);
    });

    test('should calculate metrics correctly', () => {
      monitor.track({ taskId: 'task_1', regressorId: 'reg_1', results: [], executionTime: 100, success: true });
      monitor.track({ taskId: 'task_2', regressorId: 'reg_1', results: [], executionTime: 200, success: true });
      const metrics = monitor.getMetrics();
      expect(metrics.executionCount).toBe(2);
      expect(metrics.successCount).toBe(2);
      expect(metrics.averageLatency).toBe(150);
    });

    test('should get health status', () => {
      regressor.addPredictor({ name: 'Pred1', weight: 1.0, coefficient: 0.5 });
      regressor.regress([1, 2, 3]);
      const status = monitor.getStatus(registry, executor);
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('score');
      expect(status).toHaveProperty('issues');
    });

    test('should register alert callback', () => {
      const callback = vi.fn();
      monitor.onAlert(callback);
      expect(monitor).toBeDefined();
    });

    test('should reset monitor state', () => {
      monitor.track({ taskId: 'task_1', regressorId: 'reg_1', results: [], executionTime: 100, success: true });
      monitor.reset();
      const history = monitor.getHistory();
      expect(history.length).toBe(0);
    });

    test('should export metrics', () => {
      const metrics = monitor.exportMetrics();
      expect(metrics.version).toBe('1.4.3');
      expect(metrics.historyCount).toBe(0);
    });

    test('should generate report', () => {
      const report = monitor.getReport();
      expect(report).toContain('=== RegressorMonitor Report ===');
    });
  });
});