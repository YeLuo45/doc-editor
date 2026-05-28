import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SelfHealingMonitor,
  createMonitor,
  calculateHealthLevel,
  severityFromScore,
} from '../selfHealing/SelfHealingMonitor';

describe('SelfHealingMonitor', () => {
  let monitor: SelfHealingMonitor;

  beforeEach(() => {
    monitor = createMonitor({ checkIntervalMs: 100 });
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('initialization', () => {
    it('should create monitor with healthy initial status', () => {
      const status = monitor.getStatus();
      expect(status.overall).toBe('healthy');
      expect(status.score).toBe(100);
      expect(status.activeIssues).toBe(0);
      expect(status.resolvedToday).toBe(0);
    });

    it('should not be running initially', () => {
      expect(monitor.isActive()).toBe(false);
    });

    it('should accept custom config', () => {
      const customMonitor = createMonitor({
        checkIntervalMs: 2000,
        healthScoreThresholds: { healthy: 80, degraded: 50 },
        maxIssuesTracked: 50,
      });
      const snap = customMonitor._snapshot();
      expect(snap.config.checkIntervalMs).toBe(2000);
      expect(snap.config.maxIssuesTracked).toBe(50);
      customMonitor.stop();
    });
  });

  describe('start/stop lifecycle', () => {
    it('should start and become active', () => {
      monitor.start();
      expect(monitor.isActive()).toBe(true);
    });

    it('should stop and become inactive', () => {
      monitor.start();
      monitor.stop();
      expect(monitor.isActive()).toBe(false);
    });

    it('should not start twice', () => {
      monitor.start();
      const id = monitor._snapshot().isRunning;
      monitor.start();
      expect(monitor._snapshot().isRunning).toBe(id);
    });

    it('should stop safely when not started', () => {
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('issue detection', () => {
    it('should detect and track new issues', () => {
      monitor.start();
      const issue = monitor.detectIssue({
        type: 'sync_failure',
        severity: 'high',
        description: 'Sync operation failed',
      });

      expect(issue.id).toBeDefined();
      expect(issue.detectedAt).toBeGreaterThan(0);
      expect(monitor.getActiveIssues()).toHaveLength(1);
    });

    it('should emit issueDetected event', () => {
      let detected = false;
      const unsub = monitor.onIssueDetected(() => { detected = true; });
      monitor.start();
      monitor.detectIssue({ type: 'test', severity: 'low', description: 'Test issue' });
      expect(detected).toBe(true);
      unsub();
    });

    it('should trigger repair for non-low severity issues when autoRepairEnabled', () => {
      let triggered = false;
      const unsub = monitor.onRepairTriggered(() => { triggered = true; });
      monitor.start();
      monitor.detectIssue({ type: 'sync_failure', severity: 'high', description: 'Test' });
      expect(triggered).toBe(true);
      unsub();
    });

    it('should NOT trigger repair for low severity issues', () => {
      let triggered = false;
      const unsub = monitor.onRepairTriggered(() => { triggered = true; });
      monitor.start();
      monitor.detectIssue({ type: 'minor', severity: 'low', description: 'Minor issue' });
      expect(triggered).toBe(false);
      unsub();
    });

    it('should not exceed maxIssuesTracked', () => {
      const smallMonitor = createMonitor({ maxIssuesTracked: 3 });
      smallMonitor.start();
      for (let i = 0; i < 5; i++) {
        smallMonitor.detectIssue({ type: 'issue', severity: 'medium', description: `Issue ${i}` });
      }
      expect(smallMonitor.getActiveIssues()).toHaveLength(3);
      smallMonitor.stop();
    });
  });

  describe('issue resolution', () => {
    it('should resolve an issue and update counts', () => {
      monitor.start();
      const issue = monitor.detectIssue({
        type: 'sync_failure',
        severity: 'high',
        description: 'Sync failed',
      });
      expect(monitor.getActiveIssues()).toHaveLength(1);

      monitor.resolveIssue(issue.id, true);
      expect(monitor.getActiveIssues()).toHaveLength(0);
    });

    it('should record resolvedToday on successful resolution', () => {
      monitor.start();
      const issue = monitor.detectIssue({
        type: 'sync_failure',
        severity: 'high',
        description: 'Sync failed',
      });
      monitor.resolveIssue(issue.id, true);
      expect(monitor.getStatus().resolvedToday).toBe(1);
    });

    it('should not increment resolvedToday on failed resolution', () => {
      monitor.start();
      const issue = monitor.detectIssue({
        type: 'sync_failure',
        severity: 'high',
        description: 'Sync failed',
      });
      monitor.resolveIssue(issue.id, false);
      expect(monitor.getStatus().resolvedToday).toBe(0);
    });

    it('should clear all resolved issues', () => {
      monitor.start();
      monitor.detectIssue({ type: 'a', severity: 'medium', description: 'Issue A' });
      monitor.detectIssue({ type: 'b', severity: 'medium', description: 'Issue B' });
      monitor.clearResolvedIssues();
      expect(monitor.getActiveIssues()).toHaveLength(0);
    });
  });

  describe('metrics recording', () => {
    it('should record and retrieve metrics', () => {
      monitor.recordMetric('sync_latency', 150, 100);
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('sync_latency');
      expect(metrics[0].value).toBe(150);
      expect(metrics[0].threshold).toBe(100);
    });

    it('should update existing metric', () => {
      monitor.recordMetric('sync_latency', 150, 100);
      monitor.recordMetric('sync_latency', 80, 100);
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(80);
    });
  });

  describe('health score calculation', () => {
    it('should calculate healthy level for score >= 70', () => {
      expect(calculateHealthLevel(100)).toBe('healthy');
      expect(calculateHealthLevel(70)).toBe('healthy');
    });

    it('should calculate degraded level for score 40-69', () => {
      expect(calculateHealthLevel(69)).toBe('degraded');
      expect(calculateHealthLevel(40)).toBe('degraded');
    });

    it('should calculate critical level for score < 40', () => {
      expect(calculateHealthLevel(39)).toBe('critical');
      expect(calculateHealthLevel(0)).toBe('critical');
    });
  });

  describe('severityFromScore', () => {
    it('should return correct severity levels', () => {
      expect(severityFromScore(90)).toBe('low');
      expect(severityFromScore(70)).toBe('medium');
      expect(severityFromScore(40)).toBe('high');
      expect(severityFromScore(10)).toBe('critical');
    });
  });

  describe('health change notifications', () => {
    it('should fire onHealthChange when issue detected', () => {
      const calls: Array<{ 0: import('../selfHealing/types').HealthStatus; 1: import('../selfHealing/types').HealthStatus }> = [];
      const unsub = monitor.onHealthChange((status, _prev) => {
        calls.push([status, _prev]);
      });
      monitor.start();
      monitor.detectIssue({ type: 'test', severity: 'medium', description: 'Test' });
      expect(calls.length).toBeGreaterThan(0);
      unsub();
    });
  });
});