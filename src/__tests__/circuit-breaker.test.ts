/**
 * Circuit Breaker Test Suite - V101
 * Comprehensive tests for all circuit breaker components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  type CircuitBreakerConfig,
  FailureDetector,
  type FailureDetectorConfig,
  RecoveryStrategy,
  type RecoveryStrategyConfig,
  CircuitMonitor,
  type CircuitMonitorConfig,
} from '../circuit-breaker';

// ============================================
// CircuitBreaker Tests
// ============================================

describe('CircuitBreaker', () => {
  const defaultConfig: CircuitBreakerConfig = {
    name: 'test-circuit',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 1000,
    halfOpenMaxAttempts: 2,
  };

  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(defaultConfig);
  });

  it('should initialize with closed state', () => {
    expect(circuitBreaker.getStatus()).toBe('closed');
    expect(circuitBreaker.isOpen()).toBe(false);
    expect(circuitBreaker.isClosed()).toBe(true);
  });

  it('should track successes', () => {
    circuitBreaker.success();
    const stats = circuitBreaker.getStats();
    expect(stats.successes).toBe(1);
    expect(stats.failures).toBe(0);
  });

  it('should track failures', () => {
    circuitBreaker.failure();
    const stats = circuitBreaker.getStats();
    expect(stats.failures).toBe(1);
  });

  it('should open circuit after reaching failure threshold', () => {
    circuitBreaker.failure();
    circuitBreaker.failure();
    circuitBreaker.failure();
    expect(circuitBreaker.getStatus()).toBe('open');
  });

  it('should close circuit after successful recovery', () => {
    circuitBreaker.failure();
    circuitBreaker.failure();
    circuitBreaker.failure();
    expect(circuitBreaker.getStatus()).toBe('open');
    
    circuitBreaker.halfOpen();
    expect(circuitBreaker.getStatus()).toBe('half-open');
    
    circuitBreaker.success();
    circuitBreaker.success();
    expect(circuitBreaker.getStatus()).toBe('closed');
  });

  it('should reject requests when open', () => {
    circuitBreaker.failure();
    circuitBreaker.failure();
    circuitBreaker.failure();
    circuitBreaker.reject();
    const stats = circuitBreaker.getStats();
    expect(stats.rejections).toBe(1);
  });

  it('should reset all counters', () => {
    circuitBreaker.failure();
    circuitBreaker.failure();
    circuitBreaker.success();
    circuitBreaker.reset();
    const stats = circuitBreaker.getStats();
    expect(stats.failures).toBe(0);
    expect(stats.successes).toBe(0);
    expect(stats.state).toBe('closed');
  });

  it('should export metrics with version', () => {
    const metrics = circuitBreaker.exportMetrics();
    expect(metrics.version).toBe('V101');
  });

  it('should provide snapshot with metrics', () => {
    const snapshot = circuitBreaker.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.state).toBe('closed');
  });

  it('should generate human-readable report', () => {
    const report = circuitBreaker.getReport();
    expect(report).toContain('CircuitBreaker Report');
    expect(report).toContain('test-circuit');
  });
});

// ============================================
// FailureDetector Tests
// ============================================

describe('FailureDetector', () => {
  const defaultConfig: FailureDetectorConfig = {
    name: 'test-detector',
    failureThreshold: 3,
    windowSize: 5000,
    detectionInterval: 1000,
    minRequestVolume: 5,
  };

  let detector: FailureDetector;

  beforeEach(() => {
    detector = new FailureDetector(defaultConfig);
  });

  it('should initialize with zero failures', () => {
    expect(detector.getFailureCount()).toBe(0);
    expect(detector.isOpen()).toBe(false);
  });

  it('should record successful requests', () => {
    detector.recordRequest(true);
    expect(detector.getRequestCount()).toBe(1);
  });

  it('should record failed requests', () => {
    detector.recordRequest(false);
    expect(detector.getFailureCount()).toBe(1);
    expect(detector.getRecentFailureCount()).toBe(1);
  });

  it('should detect when threshold is reached', () => {
    // Need to meet minRequestVolume (5) and failureThreshold (3)
    detector.recordRequest(true);
    detector.recordRequest(true);
    detector.recordRequest(false);
    detector.recordRequest(false);
    detector.recordRequest(false);
    const result = detector.detect();
    expect(result.shouldOpen).toBe(true);
  });

  it('should not open below minimum request volume', () => {
    for (let i = 0; i < 2; i++) {
      detector.recordRequest(false);
    }
    const result = detector.detect();
    expect(result.shouldOpen).toBe(false);
  });

  it('should get configured threshold', () => {
    expect(detector.getThreshold()).toBe(3);
  });

  it('should set open state', () => {
    detector.setOpen(true);
    expect(detector.isOpen()).toBe(true);
  });

  it('should calculate failure rate', () => {
    detector.recordRequest(false);
    detector.recordRequest(false);
    detector.recordRequest(true);
    expect(detector.getFailureRate()).toBeCloseTo(0.666, 1);
  });

  it('should reset all counters', () => {
    detector.recordRequest(false);
    detector.recordRequest(true);
    detector.reset();
    expect(detector.getFailureCount()).toBe(0);
    expect(detector.getRequestCount()).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = detector.exportMetrics();
    expect(metrics.version).toBe('V101');
  });

  it('should provide snapshot with metrics', () => {
    const snapshot = detector.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should generate human-readable report', () => {
    const report = detector.getReport();
    expect(report).toContain('FailureDetector Report');
  });
});

// ============================================
// RecoveryStrategy Tests
// ============================================

describe('RecoveryStrategy', () => {
  const defaultConfig: RecoveryStrategyConfig = {
    name: 'test-recovery',
    initialDelay: 100,
    maxDelay: 5000,
    multiplier: 2,
    maxAttempts: 5,
    jitter: 0.1,
  };

  let strategy: RecoveryStrategy;

  beforeEach(() => {
    strategy = new RecoveryStrategy(defaultConfig);
  });

  it('should initialize with initial delay', () => {
    expect(strategy.getDelay()).toBe(100);
    expect(strategy.getCurrentAttempt()).toBe(0);
  });

  it('should return next attempt number', () => {
    expect(strategy.nextAttempt()).toBe(1);
  });

  it('should record successful attempt and reset', () => {
    strategy.recordAttempt(true);
    expect(strategy.getCurrentAttempt()).toBe(0);
    expect(strategy.isRecovered()).toBe(true);
  });

  it('should record failed attempt and increment delay', () => {
    const initialDelay = strategy.getDelay();
    strategy.recordAttempt(false);
    expect(strategy.getCurrentAttempt()).toBe(1);
    expect(strategy.getDelay()).toBeGreaterThan(initialDelay);
  });

  it('should respect max attempts', () => {
    for (let i = 0; i < 5; i++) {
      strategy.recordAttempt(false);
    }
    expect(strategy.hasAttemptsRemaining()).toBe(false);
  });

  it('should get max attempts from config', () => {
    expect(strategy.getMaxAttempts()).toBe(5);
  });

  it('should return zero delay when max attempts exceeded', () => {
    for (let i = 0; i < 6; i++) {
      strategy.recordAttempt(false);
    }
    const result = strategy.recover();
    expect(result.delay).toBe(0);
  });

  it('should get recovery history', () => {
    strategy.recordAttempt(false);
    strategy.recordAttempt(true);
    const history = strategy.getHistory();
    expect(history.length).toBe(2);
  });

  it('should calculate success rate', () => {
    strategy.recordAttempt(false);
    strategy.recordAttempt(true);
    expect(strategy.getSuccessRate()).toBe(0.5);
  });

  it('should reset all state', () => {
    strategy.recordAttempt(false);
    strategy.recordAttempt(false);
    strategy.reset();
    expect(strategy.getCurrentAttempt()).toBe(0);
    expect(strategy.getDelay()).toBe(100);
    expect(strategy.getHistory().length).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = strategy.exportMetrics();
    expect(metrics.version).toBe('V101');
  });

  it('should provide snapshot with metrics', () => {
    const snapshot = strategy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should generate human-readable report', () => {
    const report = strategy.getReport();
    expect(report).toContain('RecoveryStrategy Report');
  });
});

// ============================================
// CircuitMonitor Tests
// ============================================

describe('CircuitMonitor', () => {
  const defaultConfig: CircuitMonitorConfig = {
    name: 'test-monitor',
    historySize: 100,
    samplingInterval: 1000,
    enableLogging: false,
  };

  let monitor: CircuitMonitor;

  beforeEach(() => {
    monitor = new CircuitMonitor(defaultConfig);
  });

  it('should track request events', () => {
    monitor.trackRequest(true);
    monitor.trackRequest(false);
    const metrics = monitor.getMetrics();
    expect(metrics.totalRequests).toBe(2);
  });

  it('should track state changes', () => {
    monitor.trackStateChange('open');
    const metrics = monitor.getMetrics();
    expect(metrics.stateChanges).toBe(1);
    expect(metrics.currentState).toBe('open');
  });

  it('should track reset events', () => {
    monitor.trackReset();
    const history = monitor.getHistory();
    expect(history.some(e => e.type === 'reset')).toBe(true);
  });

  it('should get event history', () => {
    monitor.trackRequest(true);
    monitor.trackRequest(false);
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  it('should limit history size', () => {
    const limitedConfig: CircuitMonitorConfig = {
      ...defaultConfig,
      historySize: 5,
    };
    const limitedMonitor = new CircuitMonitor(limitedConfig);
    for (let i = 0; i < 10; i++) {
      limitedMonitor.trackRequest(true);
    }
    expect(limitedMonitor.getHistory().length).toBe(5);
  });

  it('should calculate success rate', () => {
    monitor.trackRequest(true);
    monitor.trackRequest(true);
    monitor.trackRequest(false);
    expect(monitor.getSuccessRate()).toBeCloseTo(0.666, 1);
  });

  it('should calculate error rate', () => {
    monitor.trackRequest(true);
    monitor.trackRequest(false);
    expect(monitor.getErrorRate()).toBe(0.5);
  });

  it('should calculate uptime', () => {
    const uptime = monitor.getUptime();
    expect(uptime).toBeGreaterThanOrEqual(0);
  });

  it('should get current status', () => {
    monitor.trackStateChange('half-open');
    const status = monitor.getStatus();
    expect(status.currentState).toBe('half-open');
    expect(status.isHealthy).toBe(false);
  });

  it('should reset all metrics', () => {
    monitor.trackRequest(true);
    monitor.trackRequest(false);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalRequests).toBe(0);
    expect(metrics.successfulRequests).toBe(0);
    expect(metrics.failedRequests).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V101');
  });

  it('should provide snapshot with metrics', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalRequests).toBe(0);
  });

  it('should generate human-readable report', () => {
    const report = monitor.getReport();
    expect(report).toContain('CircuitMonitor Report');
    expect(report).toContain('test-monitor');
  });
});
