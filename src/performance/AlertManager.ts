/**
 * AlertManager - Alert Manager
 * Supports threshold configuration and alert history.
 */

import type { MonitorSample } from './RealTimeMonitor';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface AlertThreshold {
  metric: 'fps' | 'memory' | 'responseTime' | 'callCount';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  value: number;
  level: AlertLevel;
  cooldown: number; // milliseconds
}

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface AlertConfig {
  enableFpsAlerts: boolean;
  enableMemoryAlerts: boolean;
  enableResponseTimeAlerts: boolean;
  fpsThreshold: number;
  memoryThreshold: number; // bytes
  responseTimeThreshold: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  enableFpsAlerts: true,
  enableMemoryAlerts: true,
  enableResponseTimeAlerts: true,
  fpsThreshold: 30,
  memoryThreshold: 100 * 1024 * 1024, // 100MB
  responseTimeThreshold: 2000, // 2 seconds
};

const STORAGE_KEY_PREFIX = 'doc-editor-perf-alerts-';

export class AlertManager {
  private config: AlertConfig;
  private thresholds: AlertThreshold[] = [];
  private alertHistory: Alert[] = [];
  private maxHistory: number = 500;
  private lastAlertTime: Map<string, number> = new Map();
  private storageKey: string;
  private onAlertCallbacks: Set<(alert: Alert) => void> = new Set();

  constructor(config?: Partial<AlertConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storageKey = `${STORAGE_KEY_PREFIX}history`;
    this.initializeDefaultThresholds();
    this.loadHistoryFromStorage();
  }

  /**
   * Initialize default thresholds
   */
  private initializeDefaultThresholds(): void {
    this.thresholds = [
      {
        metric: 'fps',
        operator: 'lt',
        value: 30,
        level: 'critical',
        cooldown: 60000,
      },
      {
        metric: 'fps',
        operator: 'lt',
        value: 50,
        level: 'warning',
        cooldown: 30000,
      },
      {
        metric: 'memory',
        operator: 'gt',
        value: 100 * 1024 * 1024,
        level: 'critical',
        cooldown: 60000,
      },
      {
        metric: 'memory',
        operator: 'gt',
        value: 50 * 1024 * 1024,
        level: 'warning',
        cooldown: 30000,
      },
      {
        metric: 'responseTime',
        operator: 'gt',
        value: 2000,
        level: 'critical',
        cooldown: 30000,
      },
      {
        metric: 'responseTime',
        operator: 'gt',
        value: 1000,
        level: 'warning',
        cooldown: 30000,
      },
    ];
  }

  /**
   * Add a custom threshold
   */
  addThreshold(threshold: AlertThreshold): void {
    this.thresholds.push(threshold);
  }

  /**
   * Remove a threshold by index
   */
  removeThreshold(index: number): void {
    if (index >= 0 && index < this.thresholds.length) {
      this.thresholds.splice(index, 1);
    }
  }

  /**
   * Get all thresholds
   */
  getThresholds(): AlertThreshold[] {
    return [...this.thresholds];
  }

  /**
   * Clear all thresholds
   */
  clearThresholds(): void {
    this.thresholds = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Check a sample against all thresholds
   */
  checkSample(sample: MonitorSample): Alert[] {
    const alerts: Alert[] = [];
    const now = Date.now();

    for (const threshold of this.thresholds) {
      if (this.shouldCheck(now, threshold)) {
        const alert = this.evaluateThreshold(sample, threshold);
        if (alert) {
          alerts.push(alert);
          this.lastAlertTime.set(this.getThresholdKey(threshold), now);
        }
      }
    }

    return alerts;
  }

  /**
   * Generate a unique key for a threshold
   */
  private getThresholdKey(threshold: AlertThreshold): string {
    return `${threshold.metric}-${threshold.operator}-${threshold.value}`;
  }

  /**
   * Check if threshold should be evaluated based on cooldown
   */
  private shouldCheck(now: number, threshold: AlertThreshold): boolean {
    const key = this.getThresholdKey(threshold);
    const lastTime = this.lastAlertTime.get(key);
    if (lastTime === undefined) {
      return true;
    }
    return now - lastTime >= threshold.cooldown;
  }

  /**
   * Evaluate a single threshold against a sample
   */
  private evaluateThreshold(sample: MonitorSample, threshold: AlertThreshold): Alert | null {
    let value: number;

    switch (threshold.metric) {
      case 'fps':
        value = sample.fps;
        break;
      case 'memory':
        value = sample.memoryUsage;
        break;
      case 'responseTime':
        value = sample.avgResponseTime;
        break;
      case 'callCount':
        value = sample.activeModules.length;
        break;
      default:
        return null;
    }

    let triggered = false;

    switch (threshold.operator) {
      case 'gt':
        triggered = value > threshold.value;
        break;
      case 'lt':
        triggered = value < threshold.value;
        break;
      case 'gte':
        triggered = value >= threshold.value;
        break;
      case 'lte':
        triggered = value <= threshold.value;
        break;
      case 'eq':
        triggered = value === threshold.value;
        break;
    }

    if (!triggered) {
      return null;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      level: threshold.level,
      message: this.formatAlertMessage(threshold, value),
      metric: threshold.metric,
      value,
      threshold: threshold.value,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.addToHistory(alert);
    this.notifyCallbacks(alert);

    return alert;
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(threshold: AlertThreshold, value: number): string {
    const operatorMap: Record<string, string> = {
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
      eq: '===',
    };
    const op = operatorMap[threshold.operator] ?? threshold.operator;

    switch (threshold.metric) {
      case 'fps':
        return `[${threshold.level.toUpperCase()}] FPS ${value} ${op} ${threshold.value}`;
      case 'memory':
        const memMB = (value / (1024 * 1024)).toFixed(2);
        const threshMB = (threshold.value / (1024 * 1024)).toFixed(2);
        return `[${threshold.level.toUpperCase()}] Memory ${memMB}MB ${op} ${threshMB}MB`;
      case 'responseTime':
        return `[${threshold.level.toUpperCase()}] Response time ${value.toFixed(2)}ms ${op} ${threshold.value}ms`;
      default:
        return `[${threshold.level.toUpperCase()}] ${threshold.metric} ${value} ${op} ${threshold.value}`;
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: Alert): void {
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistory);
    }
    this.saveHistoryToStorage();
  }

  /**
   * Get all alerts from history
   */
  getAlertHistory(): Alert[] {
    return [...this.alertHistory];
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: AlertLevel): Alert[] {
    return this.alertHistory.filter((a) => a.level === level);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.alertHistory.filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alertHistory.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveHistoryToStorage();
      return true;
    }
    return false;
  }

  /**
   * Acknowledge all alerts
   */
  acknowledgeAllAlerts(): void {
    this.alertHistory.forEach((a) => {
      a.acknowledged = true;
    });
    this.saveHistoryToStorage();
  }

  /**
   * Clear alert history
   */
  clearHistory(): void {
    this.alertHistory = [];
    this.lastAlertTime.clear();
    this.clearStorage();
  }

  /**
   * Register callback for new alerts
   */
  onAlert(callback: (alert: Alert) => void): () => void {
    this.onAlertCallbacks.add(callback);
    return () => {
      this.onAlertCallbacks.delete(callback);
    };
  }

  /**
   * Notify callbacks of new alert
   */
  private notifyCallbacks(alert: Alert): void {
    this.onAlertCallbacks.forEach((cb) => {
      try {
        cb(alert);
      } catch {
        // Ignore callback errors
      }
    });
  }

  /**
   * Get alert statistics
   */
  getStatistics(): {
    total: number;
    byLevel: Record<AlertLevel, number>;
    acknowledged: number;
    unacknowledged: number;
    last24h: number;
  } {
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const byLevel: Record<AlertLevel, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    let acknowledged = 0;
    let unacknowledged = 0;
    let last24h = 0;

    this.alertHistory.forEach((alert) => {
      byLevel[alert.level]++;
      if (alert.acknowledged) {
        acknowledged++;
      } else {
        unacknowledged++;
      }
      if (alert.timestamp >= dayAgo) {
        last24h++;
      }
    });

    return {
      total: this.alertHistory.length,
      byLevel,
      acknowledged,
      unacknowledged,
      last24h,
    };
  }

  /**
   * Save history to localStorage
   */
  private saveHistoryToStorage(): void {
    try {
      const data = this.alertHistory.slice(-this.maxHistory);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.alertHistory = JSON.parse(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clear history from localStorage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage errors
    }
  }
}

export const defaultAlertManager = new AlertManager();