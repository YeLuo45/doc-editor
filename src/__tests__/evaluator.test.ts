/**
 * V133 Evaluator Test Suite
 * Tests for Evaluator, EvaluatorRegistry, EvaluatorExecutor, EvaluatorMonitor
 */

import {
  Evaluator,
  EvaluatorRegistry,
  EvaluatorExecutor,
  EvaluatorMonitor,
} from "../evaluator";

describe("Evaluator", () => {
  let evaluator: Evaluator;

  beforeEach(() => {
    evaluator = new Evaluator({
      id: "test-eval-1",
      name: "TestEvaluator",
      version: "1.0.0",
      enabled: true,
      timeout: 5000,
      strict: true,
    });
  });

  test("should create evaluator with config", () => {
    expect(evaluator.config.id).toBe("test-eval-1");
    expect(evaluator.config.name).toBe("TestEvaluator");
    expect(evaluator.config.enabled).toBe(true);
  });

  test("should evaluate value and return result", () => {
    const result = evaluator.evaluate({ value: 42 });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("passed");
    expect(result).toHaveProperty("timestamp");
  });

  test("should add and remove criterion", () => {
    const criterion = {
      id: "crit-1",
      name: "TestCriterion",
      weight: 1,
      description: "Test",
      validator: (v: unknown) => typeof v === "object" && v !== null,
    };
    expect(evaluator.addCriterion(criterion)).toBe(true);
    expect(evaluator.removeCriterion("crit-1")).toBe(true);
    expect(evaluator.removeCriterion("non-existent")).toBe(false);
  });

  test("should not add duplicate criterion", () => {
    const criterion = {
      id: "crit-dup",
      name: "Duplicate",
      weight: 1,
      description: "Test",
      validator: () => true,
    };
    evaluator.addCriterion(criterion);
    expect(evaluator.addCriterion(criterion)).toBe(false);
  });

  test("should return evaluator stats", () => {
    evaluator.evaluate({});
    const stats = evaluator.getStats();
    expect(stats.totalEvaluations).toBe(1);
    expect(stats).toHaveProperty("averageScore");
  });

  test("should get evaluator snapshot", () => {
    const snapshot = evaluator.getSnapshot();
    expect(snapshot).toHaveProperty("metrics");
    expect(snapshot.metrics).toHaveProperty("totalEvaluations");
  });

  test("should reset evaluator", () => {
    evaluator.evaluate({});
    evaluator.reset();
    const stats = evaluator.getStats();
    expect(stats.totalEvaluations).toBe(0);
  });

  test("should generate report", () => {
    const report = evaluator.getReport();
    expect(report).toContain("TestEvaluator");
    expect(report).toContain("Total Evaluations");
  });

  test("should export metrics with version", () => {
    const metrics = evaluator.exportMetrics();
    expect(metrics.version).toBe("1.33.0");
  });

  test("should return evaluator instance from getEvaluator", () => {
    const evalInstance = evaluator.getEvaluator();
    expect(evalInstance).toBe(evaluator);
  });
});

describe("EvaluatorRegistry", () => {
  let registry: EvaluatorRegistry;
  let evaluator: Evaluator;

  beforeEach(() => {
    registry = new EvaluatorRegistry({
      name: "TestRegistry",
      version: "1.0.0",
      autoRegister: true,
      maxEvaluators: 10,
    });
    evaluator = new Evaluator({
      id: "reg-eval-1",
      name: "RegistryEvaluator",
      version: "1.0.0",
      enabled: true,
      timeout: 5000,
      strict: false,
    });
  });

  test("should register evaluator", () => {
    expect(registry.register(evaluator)).toBe(true);
    expect(registry.has("reg-eval-1")).toBe(true);
  });

  test("should unregister evaluator", () => {
    registry.register(evaluator);
    expect(registry.unregister("reg-eval-1")).toBe(true);
    expect(registry.has("reg-eval-1")).toBe(false);
  });

  test("should not register duplicate", () => {
    registry.register(evaluator);
    expect(registry.register(evaluator)).toBe(false);
  });

  test("should get evaluator by id", () => {
    registry.register(evaluator);
    const found = registry.get("reg-eval-1");
    expect(found?.config.id).toBe("reg-eval-1");
  });

  test("should return undefined for non-existent evaluator", () => {
    const found = registry.get("non-existent");
    expect(found).toBeUndefined();
  });

  test("should get all evaluators", () => {
    registry.register(evaluator);
    const all = registry.getAll();
    expect(all.length).toBe(1);
    expect(all[0].config.id).toBe("reg-eval-1");
  });

  test("should return registry stats", () => {
    registry.register(evaluator);
    const stats = registry.getStats();
    expect(stats.totalRegistred).toBe(1);
    expect(stats.activeCount).toBe(1);
  });

  test("should get snapshot", () => {
    registry.register(evaluator);
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.totalRegistred).toBe(1);
  });

  test("should reset registry", () => {
    registry.register(evaluator);
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  test("should generate registry report", () => {
    const report = registry.getReport();
    expect(report).toContain("TestRegistry");
    expect(report).toContain("Total Registered");
  });

  test("should export metrics", () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe("1.33.0");
  });

  test("should enforce max evaluators limit", () => {
    const smallRegistry = new EvaluatorRegistry({
      name: "Small",
      version: "1.0.0",
      autoRegister: false,
      maxEvaluators: 1,
    });
    smallRegistry.register(evaluator);
    const anotherEvaluator = new Evaluator({
      id: "eval-2",
      name: "Another",
      version: "1.0.0",
      enabled: true,
      timeout: 5000,
      strict: false,
    });
    expect(smallRegistry.register(anotherEvaluator)).toBe(false);
  });

  test("should find evaluators by name", () => {
    registry.register(evaluator);
    const found = registry.findByName("RegistryEvaluator");
    expect(found.length).toBe(1);
  });

  test("should return evaluator ids", () => {
    registry.register(evaluator);
    const ids = registry.getEvaluatorIds();
    expect(ids).toContain("reg-eval-1");
  });
});

describe("EvaluatorExecutor", () => {
  let registry: EvaluatorRegistry;
  let executor: EvaluatorExecutor;
  let evaluator: Evaluator;

  beforeEach(() => {
    registry = new EvaluatorRegistry({
      name: "ExecRegistry",
      version: "1.0.0",
      autoRegister: true,
      maxEvaluators: 10,
    });
    evaluator = new Evaluator({
      id: "exec-eval-1",
      name: "ExecEvaluator",
      version: "1.0.0",
      enabled: true,
      timeout: 5000,
      strict: true,
    });
    evaluator.addCriterion({
      id: "crit-1",
      name: "Test",
      weight: 1,
      description: "Test criterion",
      validator: (v: unknown) => v !== null,
    });
    registry.register(evaluator);
    executor = new EvaluatorExecutor(
      {
        name: "TestExecutor",
        version: "1.0.0",
        parallel: false,
        failFast: false,
        timeout: 5000,
      },
      registry
    );
  });

  test("should execute on registered evaluators", () => {
    const results = executor.execute({ value: "test" });
    expect(results.length).toBe(1);
    expect(results[0]).toHaveProperty("evaluatorId");
    expect(results[0]).toHaveProperty("success");
  });

  test("should run method works same as execute", () => {
    const execResults = executor.run({ value: "test" });
    const executeResults = executor.execute({ value: "test" });
    expect(execResults.length).toBe(executeResults.length);
  });

  test("should return results", () => {
    executor.execute({ value: "test" });
    const results = executor.getResults();
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  test("should return executor stats", () => {
    executor.execute({ value: "test" });
    const stats = executor.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats).toHaveProperty("averageDuration");
  });

  test("should get snapshot", () => {
    executor.execute({ value: "test" });
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics.totalRuns).toBe(1);
  });

  test("should reset executor", () => {
    executor.execute({ value: "test" });
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalRuns).toBe(0);
  });

  test("should generate executor report", () => {
    executor.execute({ value: "test" });
    const report = executor.getReport();
    expect(report).toContain("TestExecutor");
    expect(report).toContain("Total Runs");
  });

  test("should export metrics", () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe("1.33.0");
  });

  test("should handle failFast mode", () => {
    const failFastExecutor = new EvaluatorExecutor(
      {
        name: "FailFast",
        version: "1.0.0",
        parallel: false,
        failFast: true,
        timeout: 5000,
      },
      registry
    );
    failFastExecutor.execute({ value: "test" });
    expect(failFastExecutor.getStats().totalRuns).toBeGreaterThanOrEqual(1);
  });
});

describe("EvaluatorMonitor", () => {
  let monitor: EvaluatorMonitor;

  beforeEach(() => {
    monitor = new EvaluatorMonitor({
      name: "TestMonitor",
      version: "1.0.0",
      retentionPeriod: 60000,
      samplingRate: 1,
      alertThreshold: 0.5,
    });
  });

  test("should track evaluation result", () => {
    monitor.track({
      id: "track-1",
      score: 0.8,
      passed: true,
      details: {},
      timestamp: Date.now(),
    });
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
    expect(metrics.successfulTracked).toBe(1);
  });

  test("should calculate average score correctly", () => {
    monitor.track({ id: "1", score: 0.5, passed: true, details: {}, timestamp: Date.now() });
    monitor.track({ id: "2", score: 1.0, passed: true, details: {}, timestamp: Date.now() });
    const metrics = monitor.getMetrics();
    expect(metrics.averageScore).toBe(0.75);
  });

  test("should track peak and lowest scores", () => {
    monitor.track({ id: "1", score: 0.3, passed: false, details: {}, timestamp: Date.now() });
    monitor.track({ id: "2", score: 0.9, passed: true, details: {}, timestamp: Date.now() });
    const metrics = monitor.getMetrics();
    expect(metrics.peakScore).toBe(0.9);
    expect(metrics.lowestScore).toBe(0.3);
  });

  test("should get metrics", () => {
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveProperty("totalTracked");
    expect(metrics).toHaveProperty("averageScore");
  });

  test("should get history", () => {
    monitor.track({ id: "1", score: 0.5, passed: true, details: {}, timestamp: Date.now() });
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  test("should return monitor status", () => {
    const status = monitor.getStatus();
    expect(status.isActive).toBe(true);
    expect(status).toHaveProperty("uptime");
  });

  test("should get snapshot", () => {
    monitor.track({ id: "1", score: 0.5, passed: true, details: {}, timestamp: Date.now() });
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalTracked).toBe(1);
  });

  test("should reset monitor", () => {
    monitor.track({ id: "1", score: 0.5, passed: true, details: {}, timestamp: Date.now() });
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
  });

  test("should generate monitor report", () => {
    monitor.track({ id: "1", score: 0.5, passed: true, details: {}, timestamp: Date.now() });
    const report = monitor.getReport();
    expect(report).toContain("TestMonitor");
    expect(report).toContain("Total Tracked");
  });

  test("should export metrics with version", () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe("1.33.0");
  });

  test("should track failed evaluations", () => {
    monitor.track({ id: "1", score: 0.2, passed: false, details: {}, timestamp: Date.now() });
    const metrics = monitor.getMetrics();
    expect(metrics.failedTracked).toBe(1);
    expect(metrics.successfulTracked).toBe(0);
  });
});