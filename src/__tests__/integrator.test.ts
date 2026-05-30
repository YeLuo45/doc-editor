/**
 * V137 Integrator Tests
 */

import { Integrator, IntegratorConfig, IntegratorStats, IntegrationResult } from '../integrator/Integrator';
import { IntegratorRegistry, RegistryConfig, RegistryStats } from '../integrator/IntegratorRegistry';
import { IntegratorExecutor, ExecutorConfig, ExecutionResult, ExecutorStats } from '../integrator/IntegratorExecutor';
import { IntegratorMonitor, MonitorConfig, MonitorMetric, MonitorStats, MonitorStatus } from '../integrator/IntegratorMonitor';

describe('V137 Integrator Module Tests', () => {
  // ==================== Integrator Tests ====================
  describe('Integrator', () => {
    let config: IntegratorConfig;

    beforeEach(() => {
      config = {
        id: 'test-integrator-1',
        name: 'Test Integrator',
        version: '1.0.0',
        enabled: true,
        timeout: 5000,
        retries: 3,
        priority: 1,
      };
    });

    test('should create Integrator with config', () => {
      const integrator = new Integrator(config);
      expect(integrator.config).toEqual(config);
    });

    test('should integrate data successfully', async () => {
      const integrator = new Integrator(config);
      const result = await integrator.integrate({ data: 'test' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should fail integration when disabled', async () => {
      const disabledConfig = { ...config, enabled: false };
      const integrator = new Integrator(disabledConfig);
      const result = await integrator.integrate({ data: 'test' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });

    test('should getIntegrator by id', () => {
      const integrator = new Integrator(config);
      expect(integrator.getIntegrator('test-integrator-1')).toBe(integrator);
      expect(integrator.getIntegrator('non-existent')).toBeNull();
    });

    test('should track stats after integration', async () => {
      const integrator = new Integrator(config);
      await integrator.integrate({ data: 'test' });
      const stats = integrator.getStats();
      expect(stats.totalIntegrations).toBe(1);
      expect(stats.successfulIntegrations).toBe(1);
      expect(stats.failedIntegrations).toBe(0);
    });

    test('should getSnapshot return metrics', () => {
      const integrator = new Integrator(config);
      const snapshot = integrator.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot.metrics).toHaveProperty('totalIntegrations');
    });

    test('should reset stats', async () => {
      const integrator = new Integrator(config);
      await integrator.integrate({ data: 'test' });
      integrator.reset();
      const stats = integrator.getStats();
      expect(stats.totalIntegrations).toBe(0);
      expect(stats.successfulIntegrations).toBe(0);
    });

    test('should generate getReport', () => {
      const integrator = new Integrator(config);
      const report = integrator.getReport();
      expect(report).toContain('Integrator Report');
      expect(report).toContain('Test Integrator');
      expect(report).toContain('ENABLED');
    });

    test('should exportMetrics with version', () => {
      const integrator = new Integrator(config);
      const metrics = integrator.exportMetrics();
      expect(metrics.version).toBe('1.0.0');
      expect(metrics.config).toEqual(config);
      expect(metrics.metrics).toBeDefined();
    });
  });

  // ==================== IntegratorRegistry Tests ====================
  describe('IntegratorRegistry', () => {
    let registry: IntegratorRegistry;

    beforeEach(() => {
      registry = new IntegratorRegistry({ name: 'TestRegistry', maxIntegrators: 10 });
    });

    test('should register integrator', () => {
      const config: IntegratorConfig = {
        id: 'reg-1', name: 'Reg Integrator', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      };
      expect(registry.register(config)).toBe(true);
      expect(registry.has('reg-1')).toBe(true);
    });

    test('should not register duplicate integrator', () => {
      const config: IntegratorConfig = {
        id: 'reg-dup', name: 'Dup', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      };
      registry.register(config);
      expect(registry.register(config)).toBe(false);
    });

    test('should unregister integrator', () => {
      const config: IntegratorConfig = {
        id: 'reg-2', name: 'Reg 2', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      };
      registry.register(config);
      expect(registry.unregister('reg-2')).toBe(true);
      expect(registry.has('reg-2')).toBe(false);
    });

    test('should get integrator by id', () => {
      const config: IntegratorConfig = {
        id: 'reg-3', name: 'Reg 3', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      };
      registry.register(config);
      const integrator = registry.get('reg-3');
      expect(integrator).toBeDefined();
      expect(integrator?.config.id).toBe('reg-3');
    });

    test('should getAll integrators', () => {
      const config1: IntegratorConfig = {
        id: 'reg-4', name: 'Reg 4', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      };
      const config2: IntegratorConfig = {
        id: 'reg-5', name: 'Reg 5', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      };
      registry.register(config1);
      registry.register(config2);
      expect(registry.getAll().length).toBe(2);
    });

    test('should getSnapshot return metrics', () => {
      const snapshot = registry.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset registry', () => {
      registry.reset();
      const stats = registry.getStats();
      expect(stats.totalRegistrations).toBeGreaterThanOrEqual(0);
    });

    test('should generate getReport', () => {
      const report = registry.getReport();
      expect(report).toContain('Registry Report');
      expect(report).toContain('TestRegistry');
    });

    test('should exportMetrics with version', () => {
      const metrics = registry.exportMetrics();
      expect(metrics.version).toBe('1.0.0');
    });
  });

  // ==================== IntegratorExecutor Tests ====================
  describe('IntegratorExecutor', () => {
    let registry: IntegratorRegistry;
    let executor: IntegratorExecutor;

    beforeEach(() => {
      registry = new IntegratorRegistry();
      registry.register({
        id: 'exec-1', name: 'Exec 1', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      });
      executor = new IntegratorExecutor(registry, { name: 'TestExecutor' });
    });

    test('should execute integration', async () => {
      const result = await executor.execute('exec-1', { data: 'test' });
      expect(result).toBeDefined();
      expect(result?.integratorId).toBe('exec-1');
      expect(result?.result.success).toBe(true);
    });

    test('should return null for non-existent integrator', async () => {
      const result = await executor.execute('non-existent', { data: 'test' });
      expect(result).toBeNull();
    });

    test('should run across all integrators', async () => {
      const results = await executor.run({ data: 'test' });
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test('should getResults', async () => {
      await executor.execute('exec-1', { data: 'test' });
      const results = executor.getResults();
      expect(results.length).toBe(1);
    });

    test('should track executor stats', async () => {
      await executor.execute('exec-1', { data: 'test' });
      const stats = executor.getStats();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
    });

    test('should getSnapshot return metrics', () => {
      const snapshot = executor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset executor', async () => {
      await executor.execute('exec-1', { data: 'test' });
      executor.reset();
      const stats = executor.getStats();
      expect(stats.totalExecutions).toBe(0);
    });

    test('should generate getReport', () => {
      const report = executor.getReport();
      expect(report).toContain('Executor Report');
      expect(report).toContain('TestExecutor');
    });

    test('should exportMetrics with version', () => {
      const metrics = executor.exportMetrics();
      expect(metrics.version).toBe('1.0.0');
    });
  });

  // ==================== IntegratorMonitor Tests ====================
  describe('IntegratorMonitor', () => {
    let registry: IntegratorRegistry;
    let monitor: IntegratorMonitor;

    beforeEach(() => {
      registry = new IntegratorRegistry();
      registry.register({
        id: 'mon-1', name: 'Monitor 1', version: '1.0.0',
        enabled: true, timeout: 5000, retries: 3, priority: 1,
      });
      monitor = new IntegratorMonitor(registry, { name: 'TestMonitor' });
    });

    test('should track metrics', () => {
      const metric: IntegrationResult = {
        success: true,
        data: {},
        timestamp: Date.now(),
        duration: 100,
      };
      monitor.track('mon-1', metric);
      const metrics = monitor.getMetrics('mon-1');
      expect(metrics.length).toBe(1);
    });

    test('should getHistory', () => {
      const metric: IntegrationResult = {
        success: true,
        data: {},
        timestamp: Date.now(),
        duration: 100,
      };
      monitor.track('mon-1', metric);
      const history = monitor.getHistory();
      expect(history.length).toBe(1);
    });

    test('should getStatus', () => {
      const status = monitor.getStatus();
      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('degraded');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('total');
    });

    test('should getSnapshot return metrics', () => {
      const snapshot = monitor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
    });

    test('should reset monitor', () => {
      const metric: IntegrationResult = {
        success: true,
        data: {},
        timestamp: Date.now(),
        duration: 100,
      };
      monitor.track('mon-1', metric);
      monitor.reset();
      const history = monitor.getHistory();
      expect(history.length).toBe(0);
    });

    test('should generate getReport', () => {
      const report = monitor.getReport();
      expect(report).toContain('Monitor Report');
      expect(report).toContain('TestMonitor');
    });

    test('should exportMetrics with version', () => {
      const metrics = monitor.exportMetrics();
      expect(metrics.version).toBe('1.0.0');
    });
  });
});