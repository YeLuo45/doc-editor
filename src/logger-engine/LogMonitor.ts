/**
 * LogMonitor.ts - V87 Log Monitor
 * Handles log monitoring with track/getMetrics/getHistory/getStatus
 */

export interface MonitorConfig {
  enabled: boolean;
  sampleRate: number;
  alertThresholds: {
    errorRate?: number;
    logVolume?: number;
    responseTime?: number;
  };
  historySize: number;
  monitoringInterval: number;
}

export interface MonitoringMetrics {
  totalTracked: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  debugCount: number;
  avgResponseTime: number;
  lastAlert: number;
  alertsTriggered: number;
}

export interface MonitoringEntry {
  timestamp: number;
  level: string;
  message: string;
  responseTime?: number;
}

export interface MonitorStatus {
  isEnabled: boolean;
  uptime: number;
  lastUpdate: number;
  activeAlerts: number;
}

export class LogMonitor {
  private history: MonitoringEntry[] = [];
  private metrics: MonitoringMetrics;
  private startTime: number;
  private alerts: string[] = [];

  constructor(public config: MonitorConfig) {
    this.startTime = Date.now();
    this.metrics = {
      totalTracked: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      debugCount: 0,
      avgResponseTime: 0,
      lastAlert: 0,
      alertsTriggered: 0
    };
  }

  public track(entry: { level: string; message: string; responseTime?: number }): void {
    if (!this.config.enabled) {
      return;
    }

    const monitoringEntry: MonitoringEntry = {
      timestamp: Date.now(),
      level: entry.level,
      message: entry.message,
      responseTime: entry.responseTime
    };

    this.history.push(monitoringEntry);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    this.metrics.totalTracked++;
    
    switch (entry.level) {
      case 'error':
      case 'fatal':
        this.metrics.errorCount++;
        break;
      case 'warn':
        this.metrics.warnCount++;
        break;
      case 'info':
        this.metrics.infoCount++;
        break;
      case 'debug':
        this.metrics.debugCount++;
        break;
    }

    if (entry.responseTime) {
      this.metrics.avgResponseTime = 
        (this.metrics.avgResponseTime * (this.metrics.totalTracked - 1) + entry.responseTime) 
        / this.metrics.totalTracked;
    }

    this.checkThresholds();
  }

  private checkThresholds(): void {
    if (this.config.alertThresholds.errorRate) {
      const errorRate = this.metrics.errorCount / Math.max(1, this.metrics.totalTracked);
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.triggerAlert(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
      }
    }

    if (this.config.alertThresholds.logVolume) {
      const volumeRate = this.metrics.totalTracked / (Date.now() - this.startTime);
      if (volumeRate > this.config.alertThresholds.logVolume) {
        this.triggerAlert(`High log volume: ${volumeRate.toFixed(2)} logs/ms`);
      }
    }
  }

  private triggerAlert(message: string): void {
    this.alerts.push(message);
    this.metrics.lastAlert = Date.now();
    this.metrics.alertsTriggered++;
  }

  public getMetrics(): MonitoringMetrics {
    return {
      ...this.metrics
    };
  }

  public getHistory(filter?: { level?: string; since?: number }): MonitoringEntry[] {
    let filtered = [...this.history];

    if (filter?.level) {
      filtered = filtered.filter(e => e.level === filter.level);
    }
    if (filter?.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getStatus(): MonitorStatus {
    return {
      isEnabled: this.config.enabled,
      uptime: Date.now() - this.startTime,
      lastUpdate: this.history.length > 0 ? this.history[this.history.length - 1].timestamp : 0,
      activeAlerts: this.alerts.length
    };
  }

  public getSnapshot(): { metrics: MonitoringMetrics } {
    return {
      metrics: this.getMetrics()
    };
  }

  public reset(): void {
    this.history = [];
    this.alerts = [];
    this.metrics = {
      totalTracked: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      debugCount: 0,
      avgResponseTime: 0,
      lastAlert: 0,
      alertsTriggered: 0
    };
  }

  public getReport(): string {
    const m = this.getMetrics();
    const s = this.getStatus();
    return `LogMonitor Report:
  Total Tracked: ${m.totalTracked}
  Error Count: ${m.errorCount}
  Warn Count: ${m.warnCount}
  Info Count: ${m.infoCount}
  Debug Count: ${m.debugCount}
  Avg Response Time: ${m.avgResponseTime.toFixed(2)}ms
  Alerts Triggered: ${m.alertsTriggered}
  Active Alerts: ${s.activeAlerts}
  Uptime: ${s.uptime}ms`;
  }

  public exportMetrics(): { version: string } {
    return {
      version: 'V87-1.0.0'
    };
  }

  public getAlerts(): string[] {
    return [...this.alerts];
  }

  public clearAlerts(): void {
    this.alerts = [];
  }

  public getErrorRate(): number {
    return this.metrics.totalTracked > 0 
      ? this.metrics.errorCount / this.metrics.totalTracked 
      : 0;
  }

  public getVolumeRate(): number {
    const elapsed = Date.now() - this.startTime;
    return elapsed > 0 ? this.metrics.totalTracked / elapsed : 0;
  }
}

export default LogMonitor;
