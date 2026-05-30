/**
 * router.test.ts - V117 Router Module Tests
 */

import { Router, RouterConfig, Route, RouteStats } from '../router/Router';
import { RouterRegistry, RegistryConfig, RouterInstance } from '../router/RouterRegistry';
import { RouterExecutor, ExecutorConfig, ExecutionResult, ExecutorStats } from '../router/RouterExecutor';
import { RouterMonitor, MonitorConfig, MetricPoint, MonitorMetrics, MonitorStatus } from '../router/RouterMonitor';

describe('V117 Router Module Tests', () => {
  // Router Tests
  describe('Router', () => {
    let router: Router;
    const config: RouterConfig = { name: 'test', enabled: true, timeout: 1000, retryCount: 3 };

    beforeEach(() => {
      router = new Router(config);
    });

    test('should create router with config', () => {
      expect(router.config).toEqual(config);
    });

    test('should add route successfully', () => {
      const route: Route = { id: 'r1', path: '/api/test', handler: 'testHandler', priority: 1 };
      expect(router.add(route)).toBe(true);
      expect(router.getRoute('r1')).toEqual(route);
    });

    test('should reject duplicate route id', () => {
      const route: Route = { id: 'r1', path: '/api/test', handler: 'testHandler', priority: 1 };
      router.add(route);
      expect(router.add(route)).toBe(false);
    });

    test('should reject route without id or path', () => {
      expect(router.add({ id: '', path: '/api', handler: 'h', priority: 1 })).toBe(false);
      expect(router.add({ id: 'r1', path: '', handler: 'h', priority: 1 })).toBe(false);
    });

    test('should remove route by id', () => {
      router.add({ id: 'r1', path: '/api', handler: 'h', priority: 1 });
      expect(router.remove('r1')).toBe(true);
      expect(router.getRoute('r1')).toBeUndefined();
    });

    test('should get all routes', () => {
      router.add({ id: 'r1', path: '/api/1', handler: 'h1', priority: 1 });
      router.add({ id: 'r2', path: '/api/2', handler: 'h2', priority: 2 });
      const routes = router.getAllRoutes();
      expect(routes.length).toBe(2);
    });

    test('should route path to matching route', () => {
      router.add({ id: 'r1', path: '/api/users/:id', handler: 'userHandler', priority: 1 });
      const matched = router.route('/api/users/123');
      expect(matched).toBeDefined();
      expect(matched?.id).toBe('r1');
    });

    test('should route by priority order', () => {
      router.add({ id: 'r1', path: '/api/*', handler: 'wildcard', priority: 1 });
      router.add({ id: 'r2', path: '/api/users', handler: 'specific', priority: 10 });
      const matched = router.route('/api/users');
      expect(matched?.id).toBe('r2');
    });

    test('should get stats', () => {
      const stats = router.getStats();
      expect(stats).toHaveProperty('totalRoutes');
      expect(stats).toHaveProperty('activeRoutes');
      expect(stats).toHaveProperty('requestsProcessed');
    });

    test('should get snapshot', () => {
      const snapshot = router.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('routeCount');
      expect(snapshot).toHaveProperty('uptime');
    });

    test('should reset router state', () => {
      router.add({ id: 'r1', path: '/api', handler: 'h', priority: 1 });
      router.recordResponseTime(50);
      router.reset();
      expect(router.getAllRoutes().length).toBe(0);
    });

    test('should generate report', () => {
      const report = router.getReport();
      expect(report).toContain('Router Report');
      expect(report).toContain('Total Routes');
    });

    test('should export metrics with version', () => {
      const metrics = router.exportMetrics();
      expect(metrics.version).toBe('V117');
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('stats');
    });
  });

  // RouterRegistry Tests
  describe('RouterRegistry', () => {
    let registry: RouterRegistry;
    const config: RegistryConfig = { name: 'test-reg', maxRouters: 5, autoCleanup: true };

    beforeEach(() => {
      registry = new RouterRegistry(config);
    });

    test('should create registry with config', () => {
      expect(registry.config).toEqual(config);
    });

    test('should register router instance', () => {
      const instance: RouterInstance = { id: 'router1', name: 'Router 1', type: 'http', enabled: true };
      expect(registry.register(instance)).toBe(true);
      expect(registry.has('router1')).toBe(true);
    });

    test('should unregister router instance', () => {
      registry.register({ id: 'router1', name: 'R1', type: 'http', enabled: true });
      expect(registry.unregister('router1')).toBe(true);
      expect(registry.has('router1')).toBe(false);
    });

    test('should get router by id', () => {
      registry.register({ id: 'router1', name: 'Router 1', type: 'http', enabled: true });
      const found = registry.get('router1');
      expect(found?.id).toBe('router1');
    });

    test('should get all routers', () => {
      registry.register({ id: 'r1', name: 'R1', type: 'http', enabled: true });
      registry.register({ id: 'r2', name: 'R2', type: 'ws', enabled: true });
      const all = registry.getAll();
      expect(all.length).toBe(2);
    });

    test('should get routers by type', () => {
      registry.register({ id: 'r1', name: 'R1', type: 'http', enabled: true });
      registry.register({ id: 'r2', name: 'R2', type: 'ws', enabled: true });
      const httpRouters = registry.getByType('http');
      expect(httpRouters.length).toBe(1);
    });

    test('should enforce max routers limit', () => {
      const smallRegistry = new RouterRegistry({ name: 'small', maxRouters: 2, autoCleanup: false });
      smallRegistry.register({ id: 'r1', name: 'R1', type: 'http', enabled: true });
      smallRegistry.register({ id: 'r2', name: 'R2', type: 'http', enabled: true });
      expect(smallRegistry.register({ id: 'r3', name: 'R3', type: 'http', enabled: true })).toBe(false);
    });

    test('should auto cleanup oldest router', () => {
      const smallRegistry = new RouterRegistry({ name: 'small', maxRouters: 2, autoCleanup: true });
      smallRegistry.register({ id: 'r1', name: 'R1', type: 'http', enabled: true });
      smallRegistry.register({ id: 'r2', name: 'R2', type: 'http', enabled: true });
      smallRegistry.register({ id: 'r3', name: 'R3', type: 'http', enabled: true });
      expect(smallRegistry.getAll().length).toBe(2);
      expect(smallRegistry.has('r1')).toBe(false);
    });

    test('should get snapshot', () => {
      const snapshot = registry.getSnapshot();
      expect(snapshot).toHaveProperty('routers');
      expect(snapshot).toHaveProperty('stats');
    });

    test('should reset registry', () => {
      registry.register({ id: 'r1', name: 'R1', type: 'http', enabled: true });
      registry.reset();
      expect(registry.getAll().length).toBe(0);
    });

    test('should generate report', () => {
      const report = registry.getReport();
      expect(report).toContain('Router Registry Report');
    });

    test('should export metrics', () => {
      const metrics = registry.exportMetrics();
      expect(metrics.version).toBe('V117');
    });
  });

  // RouterExecutor Tests
  describe('RouterExecutor', () => {
    let executor: RouterExecutor;
    const config: ExecutorConfig = { name: 'test-exec', maxConcurrency: 3, timeout: 1000, enableRetry: true };

    beforeEach(() => {
      executor = new RouterExecutor(config);
    });

    test('should create executor with config', () => {
      expect(executor.config).toEqual(config);
    });

    test('should execute route successfully', async () => {
      const result = await executor.execute('route1', { param: 'value' });
      expect(result.success).toBe(true);
      expect(result.routeId).toBe('route1');
    });

    test('should track execution results', async () => {
      await executor.execute('route1', {});
      await executor.execute('route2', {});
      const results = executor.getResults();
      expect(results.length).toBe(2);
    });

    test('should get results with limit', async () => {
      await executor.execute('route1', {});
      await executor.execute('route2', {});
      await executor.execute('route3', {});
      const results = executor.getResults(2);
      expect(results.length).toBe(2);
    });

    test('should get stats', () => {
      const stats = executor.getStats();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successRate');
    });

    test('should get snapshot', () => {
      const snapshot = executor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('activeCount');
    });

    test('should reset executor', async () => {
      await executor.execute('route1', {});
      executor.reset();
      expect(executor.getResults().length).toBe(0);
    });

    test('should generate report', () => {
      const report = executor.getReport();
      expect(report).toContain('Router Executor Report');
    });

    test('should export metrics', () => {
      const metrics = executor.exportMetrics();
      expect(metrics.version).toBe('V117');
    });
  });

  // RouterMonitor Tests
  describe('RouterMonitor', () => {
    let monitor: RouterMonitor;
    const config: MonitorConfig = { name: 'test-mon', retentionPeriod: 60000, sampleInterval: 1000, enableAlerts: true };

    beforeEach(() => {
      monitor = new RouterMonitor(config);
    });

    test('should create monitor with config', () => {
      expect(monitor.config).toEqual(config);
    });

    test('should track metrics', () => {
      monitor.track('latency', 100);
      monitor.track('latency', 200);
      const history = monitor.getHistory();
      expect(history.length).toBe(2);
    });

    test('should record requests', () => {
      monitor.recordRequest(true, 50);
      monitor.recordRequest(true, 100);
      monitor.recordRequest(false, 200);
      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
    });

    test('should get metrics with latency percentiles', () => {
      monitor.recordRequest(true, 10);
      monitor.recordRequest(true, 20);
      monitor.recordRequest(true, 30);
      monitor.recordRequest(true, 40);
      monitor.recordRequest(true, 50);
      const metrics = monitor.getMetrics();
      expect(metrics.avgLatency).toBeGreaterThan(0);
      expect(metrics.p95Latency).toBeGreaterThan(0);
    });

    test('should get status', () => {
      const status = monitor.getStatus();
      expect(['healthy', 'degraded', 'down']).toContain(status);
    });

    test('should get history with limit', () => {
      monitor.track('metric1', 100);
      monitor.track('metric2', 200);
      const history = monitor.getHistory(1);
      expect(history.length).toBe(1);
    });

    test('should get snapshot', () => {
      monitor.recordRequest(true, 50);
      const snapshot = monitor.getSnapshot();
      expect(snapshot).toHaveProperty('metrics');
      expect(snapshot).toHaveProperty('status');
    });

    test('should reset monitor', () => {
      monitor.recordRequest(true, 50);
      monitor.reset();
      expect(monitor.getMetrics().totalRequests).toBe(0);
    });

    test('should generate report', () => {
      const report = monitor.getReport();
      expect(report).toContain('Router Monitor Report');
    });

    test('should export metrics', () => {
      const metrics = monitor.exportMetrics();
      expect(metrics.version).toBe('V117');
    });
  });
});