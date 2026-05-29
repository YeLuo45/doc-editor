/**
 * iteration8.test.ts - V38 Iteration 8 Tests
 * Tests for Builder, Packager, Deployer, and Monitor modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Builder } from '../iteration8/Builder';
import { Packager } from '../iteration8/Packager';
import { Deployer } from '../iteration8/Deployer';
import { Monitor } from '../iteration8/Monitor';

// ==================== BUILDER TESTS ====================

describe('Builder', () => {
  let builder: Builder;

  beforeEach(() => {
    builder = new Builder();
  });

  it('should create a new builder instance', () => {
    expect(builder).toBeDefined();
  });

  it('should build a target and create artifact', () => {
    const target = {
      name: 'test.js',
      sources: ['src/a.ts', 'src/b.ts'],
      outputPath: '/dist/test.js',
      dependencies: [],
      options: {},
    };
    const artifact = builder.build(target);
    expect(artifact).toBeDefined();
    expect(artifact?.name).toBe('test.js');
    expect(['script', 'resource']).toContain(artifact?.type);
  });

  it('should infer binary type for exe files', () => {
    const target = {
      name: 'app.exe',
      sources: ['src/main.ts'],
      outputPath: '/dist/app.exe',
      dependencies: [],
      options: {},
    };
    const artifact = builder.build(target);
    expect(artifact?.type).toBe('binary');
  });

  it('should assemble multiple artifacts', () => {
    const target1 = { name: 'a.js', sources: [], outputPath: '/a.js', dependencies: [], options: {} };
    const target2 = { name: 'b.js', sources: [], outputPath: '/b.js', dependencies: [], options: {} };
    
    const art1 = builder.build(target1);
    const art2 = builder.build(target2);
    
    expect(art1).toBeDefined();
    expect(art2).toBeDefined();
    
    const assembled = builder.assemble([art1!.id, art2!.id], 'combined.js');
    expect(assembled).toBeDefined();
    expect(assembled?.name).toBe('combined.js');
    expect(assembled?.type).toBe('module');
  });

  it('should get all built artifacts', () => {
    builder.build({ name: 'a.js', sources: [], outputPath: '/a.js', dependencies: [], options: {} });
    builder.build({ name: 'b.js', sources: [], outputPath: '/b.js', dependencies: [], options: {} });
    
    const built = builder.getBuilt();
    expect(built.length).toBeGreaterThanOrEqual(2);
  });

  it('should get artifact by id', () => {
    const target = { name: 'test.js', sources: [], outputPath: '/test.js', dependencies: [], options: {} };
    const artifact = builder.build(target);
    
    expect(artifact).toBeDefined();
    const found = builder.getArtifact(artifact!.id);
    expect(found?.id).toBe(artifact?.id);
  });

  it('should track build metrics', () => {
    builder.build({ name: 'a.js', sources: [], outputPath: '/a.js', dependencies: [], options: {} });
    builder.build({ name: 'b.js', sources: [], outputPath: '/b.js', dependencies: [], options: {} });
    
    const snap = builder.getSnapshot();
    expect(snap.metrics.totalBuilds).toBe(2);
  });

  it('should reset all state', () => {
    builder.build({ name: 'test.js', sources: [], outputPath: '/test.js', dependencies: [], options: {} });
    builder.reset();
    
    const snap = builder.getSnapshot();
    expect(snap.metrics.totalBuilds).toBe(0);
  });

  it('should generate report', () => {
    const report = builder.getReport();
    expect(report).toContain('Builder Report');
  });

  it('should export metrics', () => {
    const metrics = builder.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalBuilds).toBe('number');
  });
});

// ==================== PACKAGER TESTS ====================

describe('Packager', () => {
  let packager: Packager;

  beforeEach(() => {
    packager = new Packager();
  });

  it('should create a new packager instance', () => {
    expect(packager).toBeDefined();
  });

  it('should pack modules into a package', () => {
    const pkg = packager.pack(['mod1', 'mod2'], 'test-pkg', '1.0.0');
    expect(pkg).toBeDefined();
    expect(pkg?.name).toBe('test-pkg');
    expect(pkg?.version).toBe('1.0.0');
    expect(pkg?.modules).toContain('mod1');
  });

  it('should bundle modules with options', () => {
    const options = {
      format: 'esm' as const,
      minify: true,
      sourceMap: true,
      treeShake: true,
      externals: [],
    };
    const bundle = packager.bundle(['mod1', 'mod2', 'mod3'], 'my-bundle', options);
    expect(bundle).toBeDefined();
    expect(bundle?.metadata.format).toBe('esm');
    expect(bundle?.metadata.minify).toBe(true);
  });

  it('should get all packages', () => {
    packager.pack(['mod1'], 'pkg1', '1.0.0');
    packager.pack(['mod2'], 'pkg2', '1.0.0');
    
    const packages = packager.getPackages();
    expect(packages.length).toBeGreaterThanOrEqual(2);
  });

  it('should get package by id', () => {
    const pkg = packager.pack(['mod1'], 'test', '1.0.0');
    expect(pkg).toBeDefined();
    
    const found = packager.getPackage(pkg!.id);
    expect(found?.name).toBe('test');
  });

  it('should get bundles', () => {
    packager.bundle(['mod1'], 'bundle1', {
      format: 'cjs', minify: false, sourceMap: false, treeShake: false, externals: []
    });
    
    const bundles = packager.getBundles();
    expect(bundles.length).toBeGreaterThanOrEqual(1);
  });

  it('should track pack metrics', () => {
    packager.pack(['mod1'], 'pkg1', '1.0.0');
    packager.pack(['mod2'], 'pkg2', '1.0.0');
    
    const snap = packager.getSnapshot();
    expect(snap.metrics.totalPacks).toBe(2);
  });

  it('should reset all state', () => {
    packager.pack(['mod1'], 'test', '1.0.0');
    packager.reset();
    
    const snap = packager.getSnapshot();
    expect(snap.metrics.totalPacks).toBe(0);
  });

  it('should generate report', () => {
    const report = packager.getReport();
    expect(report).toContain('Packager Report');
  });

  it('should export metrics', () => {
    const metrics = packager.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalPacks).toBe('number');
  });
});

// ==================== DEPLOYER TESTS ====================

describe('Deployer', () => {
  let deployer: Deployer;

  beforeEach(() => {
    deployer = new Deployer();
  });

  it('should create a new deployer instance', () => {
    expect(deployer).toBeDefined();
  });

  it('should deploy artifacts to target', () => {
    const target = { name: 'prod', url: 'https://example.com', region: 'us-east' };
    const deployment = deployer.deploy('my-app', '1.0.0', ['artifact1'], target);
    expect(deployment).toBeDefined();
    expect(deployment?.name).toBe('my-app');
    expect(deployment?.version).toBe('1.0.0');
  });

  it('should rollback a deployment', () => {
    const target = { name: 'prod', url: 'https://example.com' };
    const original = deployer.deploy('my-app', '1.0.0', ['artifact1'], target);
    expect(original).toBeDefined();
    
    const rollback = deployer.rollback(original!.id);
    expect(rollback).toBeDefined();
    expect(rollback?.status).toBe('rolled_back');
  });

  it('should get deployment status', () => {
    const target = { name: 'prod', url: 'https://example.com' };
    const deployment = deployer.deploy('my-app', '1.0.0', ['artifact1'], target);
    
    const status = deployer.getStatus(deployment!.id);
    expect(status).toBeDefined();
    expect(status?.name).toBe('my-app');
  });

  it('should get all deployments', () => {
    const target = { name: 'prod', url: 'https://example.com' };
    deployer.deploy('app1', '1.0.0', ['a1'], target);
    deployer.deploy('app2', '1.0.0', ['a2'], target);
    
    const deployments = deployer.getDeployments();
    expect(deployments.length).toBeGreaterThanOrEqual(2);
  });

  it('should get active deployments', () => {
    const target = { name: 'prod', url: 'https://example.com' };
    deployer.deploy('app1', '1.0.0', ['a1'], target);
    
    const active = deployer.getActiveDeployments();
    expect(Array.isArray(active)).toBe(true);
  });

  it('should track deployment metrics', () => {
    const target = { name: 'prod', url: 'https://example.com' };
    deployer.deploy('app1', '1.0.0', ['a1'], target);
    
    const snap = deployer.getSnapshot();
    expect(snap.metrics.totalDeployments).toBeGreaterThanOrEqual(1);
  });

  it('should reset all state', () => {
    const target = { name: 'prod', url: 'https://example.com' };
    deployer.deploy('app1', '1.0.0', ['a1'], target);
    deployer.reset();
    
    const snap = deployer.getSnapshot();
    expect(snap.metrics.totalDeployments).toBe(0);
  });

  it('should generate report', () => {
    const report = deployer.getReport();
    expect(report).toContain('Deployer Report');
  });

  it('should export metrics', () => {
    const metrics = deployer.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalDeployments).toBe('number');
  });
});

// ==================== MONITOR TESTS ====================

describe('Monitor', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = new Monitor();
  });

  it('should create a new monitor instance', () => {
    expect(monitor).toBeDefined();
  });

  it('should start and stop monitoring', () => {
    monitor.monitor();
    let snap = monitor.getSnapshot();
    expect(snap.status.isMonitoring).toBe(true);
    
    monitor.stop();
    snap = monitor.getSnapshot();
    expect(snap.status.isMonitoring).toBe(false);
  });

  it('should create alerts', () => {
    const alert = monitor.alert('warning', 'Test warning', 'test-source');
    expect(alert).toBeDefined();
    expect(alert.level).toBe('warning');
    expect(alert.message).toBe('Test warning');
  });

  it('should record metrics', () => {
    monitor.recordMetric('requests', 10, 'count');
    monitor.recordMetric('cpu', 45.5, 'percent');
    
    const history = monitor.getMetricHistory('requests');
    expect(history.length).toBe(1);
  });

  it('should get alerts by level', () => {
    monitor.alert('info', 'Info msg', 'src');
    monitor.alert('error', 'Error msg', 'src');
    monitor.alert('critical', 'Critical msg', 'src');
    
    const errors = monitor.getAlertsByLevel('error');
    expect(errors.length).toBe(1);
    expect(errors[0].level).toBe('error');
  });

  it('should acknowledge alerts', () => {
    const alert = monitor.alert('warning', 'Test', 'src');
    const ack = monitor.acknowledgeAlert(alert.id);
    expect(ack).toBe(true);
    
    const unacked = monitor.getUnacknowledgedAlerts();
    expect(unacked.some(a => a.id === alert.id)).toBe(false);
  });

  it('should get metrics summary', () => {
    monitor.monitor();
    monitor.recordMetric('requests', 100, 'count');
    monitor.recordMetric('errors', 5, 'count');
    
    const metrics = monitor.getMetrics();
    expect(metrics.requests).toBe(100);
    expect(metrics.errors).toBe(5);
  });

  it('should track monitoring status', () => {
    monitor.monitor();
    
    const snap = monitor.getSnapshot();
    expect(snap.status.isMonitoring).toBe(true);
    expect(snap.status.lastUpdate).toBeGreaterThan(0);
  });

  it('should reset all state', () => {
    monitor.monitor();
    monitor.alert('warning', 'Test', 'src');
    monitor.recordMetric('requests', 10, 'count');
    monitor.reset();
    
    const snap = monitor.getSnapshot();
    expect(snap.status.isMonitoring).toBe(false);
    expect(snap.alerts).toEqual({});
  });

  it('should generate report', () => {
    monitor.monitor();
    const report = monitor.getReport();
    expect(report).toContain('Monitor Report');
  });

  it('should export metrics', () => {
    monitor.monitor();
    monitor.recordMetric('requests', 50, 'count');
    
    const metrics = monitor.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.requests).toBe('number');
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Iteration8 Integration', () => {
  let builder: Builder;
  let packager: Packager;
  let deployer: Deployer;
  let monitor: Monitor;

  beforeEach(() => {
    builder = new Builder();
    packager = new Packager();
    deployer = new Deployer();
    monitor = new Monitor();
  });

  it('should build, pack, deploy and monitor a complete workflow', () => {
    // Build
    const target = { name: 'app.js', sources: ['src/main.ts'], outputPath: '/dist/app.js', dependencies: [], options: {} };
    const artifact = builder.build(target);
    expect(artifact).toBeDefined();
    
    // Pack
    const pkg = packager.pack([artifact!.id], 'my-app', '1.0.0');
    expect(pkg).toBeDefined();
    
    // Deploy
    const target2 = { name: 'prod', url: 'https://prod.example.com', region: 'us-west-2' };
    const deployment = deployer.deploy('my-app', '1.0.0', [artifact!.id], target2);
    expect(deployment).toBeDefined();
    
    // Monitor
    monitor.monitor();
    monitor.recordMetric('deployments', 1, 'count');
    
    // Wait a bit for uptime to accumulate
    const start = Date.now();
    while (Date.now() - start < 10) { /* spin */ }
    
    const metrics = monitor.getMetrics();
    expect(metrics.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should have all modules with required methods', () => {
    expect(typeof builder.getSnapshot).toBe('function');
    expect(typeof builder.reset).toBe('function');
    expect(typeof builder.getReport).toBe('function');
    expect(typeof builder.exportMetrics).toBe('function');
    
    expect(typeof packager.getSnapshot).toBe('function');
    expect(typeof packager.reset).toBe('function');
    expect(typeof packager.getReport).toBe('function');
    expect(typeof packager.exportMetrics).toBe('function');
    
    expect(typeof deployer.getSnapshot).toBe('function');
    expect(typeof deployer.reset).toBe('function');
    expect(typeof deployer.getReport).toBe('function');
    expect(typeof deployer.exportMetrics).toBe('function');
    
    expect(typeof monitor.getSnapshot).toBe('function');
    expect(typeof monitor.reset).toBe('function');
    expect(typeof monitor.getReport).toBe('function');
    expect(typeof monitor.exportMetrics).toBe('function');
  });

  it('should export metrics from all modules', () => {
    const builderMetrics = builder.exportMetrics();
    const packagerMetrics = packager.exportMetrics();
    const deployerMetrics = deployer.exportMetrics();
    const monitorMetrics = monitor.exportMetrics();
    
    expect(Object.keys(builderMetrics).length).toBeGreaterThan(0);
    expect(Object.keys(packagerMetrics).length).toBeGreaterThan(0);
    expect(Object.keys(deployerMetrics).length).toBeGreaterThan(0);
    expect(Object.keys(monitorMetrics).length).toBeGreaterThan(0);
  });
});