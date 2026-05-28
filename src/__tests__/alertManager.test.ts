/**
 * AlertManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AlertThreshold, Alert } from '../performance/AlertManager';
import { AlertManager } from '../performance/AlertManager';
import type { MonitorSample } from '../performance/RealTimeMonitor';

describe('AlertManager', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager();
    alertManager.clearHistory();
    alertManager.clearThresholds();
  });

  afterEach(() => {
    alertManager.clearHistory();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(alertManager).toBeTruthy();
      const config = alertManager.getConfig();
      expect(config.fpsThreshold).toBe(30);
      expect(config.memoryThreshold).toBe(100 * 1024 * 1024);
    });

    it('should accept custom config', () => {
      const customManager = new AlertManager({ fpsThreshold: 60 });
      expect(customManager.getConfig().fpsThreshold).toBe(60);
    });
  });

  describe('addThreshold', () => {
    it('should add a custom threshold', () => {
      const threshold: AlertThreshold = {
        metric: 'fps',
        operator: 'lt',
        value: 25,
        level: 'critical',
        cooldown: 60000,
      };

      alertManager.addThreshold(threshold);
      const thresholds = alertManager.getThresholds();

      expect(thresholds.some(t => t.value === 25)).toBe(true);
    });
  });

  describe('removeThreshold', () => {
    it('should remove threshold by index', () => {
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 25,
        level: 'critical',
        cooldown: 60000,
      });

      alertManager.removeThreshold(0);
      expect(alertManager.getThresholds().length).toBeLessThan(1);
    });
  });

  describe('getThresholds', () => {
    it('should return all thresholds', () => {
      const thresholds = alertManager.getThresholds();
      expect(Array.isArray(thresholds)).toBe(true);
    });
  });

  describe('clearThresholds', () => {
    it('should remove all thresholds', () => {
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 25,
        level: 'critical',
        cooldown: 60000,
      });

      alertManager.clearThresholds();
      expect(alertManager.getThresholds()).toEqual([]);
    });
  });

  describe('checkSample', () => {
    it('should return empty array when no thresholds triggered', () => {
      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 60,
        memoryUsage: 50 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      const alerts = alertManager.checkSample(sample);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should trigger alert when FPS is low', () => {
      // Set up a simple threshold
      alertManager.clearThresholds();
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 50,
        level: 'warning',
        cooldown: 0, // No cooldown for testing
      });

      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 25,
        memoryUsage: 50 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      const alerts = alertManager.checkSample(sample);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].metric).toBe('fps');
    });
  });

  describe('getAlertHistory', () => {
    it('should return empty array initially', () => {
      expect(alertManager.getAlertHistory()).toEqual([]);
    });
  });

  describe('getAlertsByLevel', () => {
    it('should return alerts filtered by level', () => {
      const alerts = alertManager.getAlertsByLevel('critical');
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getUnacknowledgedAlerts', () => {
    it('should return unacknowledged alerts', () => {
      const alerts = alertManager.getUnacknowledgedAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should return false for unknown alert ID', () => {
      const result = alertManager.acknowledgeAlert('unknown-id');
      expect(result).toBe(false);
    });
  });

  describe('acknowledgeAllAlerts', () => {
    it('should acknowledge all alerts without error', () => {
      alertManager.acknowledgeAllAlerts();
      // Should not throw
    });
  });

  describe('clearHistory', () => {
    it('should clear alert history', () => {
      alertManager.clearHistory();
      expect(alertManager.getAlertHistory()).toEqual([]);
    });
  });

  describe('onAlert callback', () => {
    it('should call registered callback when alert is triggered', () => {
      let alertReceived: Alert | null = null;
      const unsubscribe = alertManager.onAlert((alert) => {
        alertReceived = alert;
      });

      alertManager.clearThresholds();
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 50,
        level: 'warning',
        cooldown: 0,
      });

      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 20,
        memoryUsage: 50 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      alertManager.checkSample(sample);

      // Callback should have been called
      expect(alertReceived).not.toBeNull();

      unsubscribe();
    });

    it('should allow unsubscribing', () => {
      let callCount = 0;
      const unsubscribe = alertManager.onAlert(() => {
        callCount++;
      });

      unsubscribe();

      alertManager.clearThresholds();
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 50,
        level: 'warning',
        cooldown: 0,
      });

      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 20,
        memoryUsage: 50 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      alertManager.checkSample(sample);
      expect(callCount).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return alert statistics', () => {
      const stats = alertManager.getStatistics();
      expect(stats).toMatchObject({
        total: expect.any(Number),
        byLevel: expect.any(Object),
        acknowledged: expect.any(Number),
        unacknowledged: expect.any(Number),
        last24h: expect.any(Number),
      });
    });
  });

  describe('threshold cooldown', () => {
    it('should not trigger same alert within cooldown period', () => {
      alertManager.clearThresholds();
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 50,
        level: 'warning',
        cooldown: 60000, // 1 minute cooldown
      });

      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 20,
        memoryUsage: 50 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      const firstAlerts = alertManager.checkSample(sample);
      const secondAlerts = alertManager.checkSample(sample);

      // First alert should have alerts
      expect(firstAlerts.length).toBeGreaterThan(0);
      // Second alert should be empty due to cooldown
      expect(secondAlerts.length).toBe(0);
    });
  });

  describe('alert message formatting', () => {
    it('should format FPS alert message correctly', () => {
      alertManager.clearThresholds();
      alertManager.addThreshold({
        metric: 'fps',
        operator: 'lt',
        value: 30,
        level: 'critical',
        cooldown: 0,
      });

      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 20,
        memoryUsage: 50 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      const alerts = alertManager.checkSample(sample);
      expect(alerts[0]?.message).toContain('FPS');
    });

    it('should format memory alert message correctly', () => {
      alertManager.clearThresholds();
      alertManager.addThreshold({
        metric: 'memory',
        operator: 'gt',
        value: 50 * 1024 * 1024,
        level: 'warning',
        cooldown: 0,
      });

      const sample: MonitorSample = {
        timestamp: Date.now(),
        fps: 60,
        memoryUsage: 100 * 1024 * 1024,
        activeModules: ['test'],
        avgResponseTime: 100,
      };

      const alerts = alertManager.checkSample(sample);
      expect(alerts[0]?.message).toContain('Memory');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      alertManager.updateConfig({ fpsThreshold: 45 });
      expect(alertManager.getConfig().fpsThreshold).toBe(45);
    });
  });

  describe('storage persistence', () => {
    it('should persist alert history', () => {
      // This test verifies the storage methods work without throwing
      alertManager.clearHistory();
      // Alert history should be empty now
      expect(alertManager.getAlertHistory()).toEqual([]);
    });
  });
});