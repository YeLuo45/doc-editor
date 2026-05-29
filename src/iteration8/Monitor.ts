/**
 * Monitor.ts - V38 Iteration 8
 * Runtime monitor with monitor, alert, and getMetrics capabilities
 */

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  source: string;
  timestamp: number;
  acknowledged: boolean;
  metadata: Record<string, unknown>;
}

export interface MetricPoint {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
}

export interface MonitorSnapshot {
  alerts: Record<string, Alert>;
  metrics: Record<string, MetricPoint[]>;
  metricsSummary: {
    cpu: number;
    memory: number;
    requests: number;
    errors: number;
    uptime: number;
  };
  status: {
    isMonitoring: boolean;
    lastUpdate: number;
    alertCount: number;
    criticalAlerts: number;
  };
}

export class Monitor {
  private alerts: Map<string, Alert> = new Map();
  private metrics: Map<string, MetricPoint[]> = new Map();
  private isMonitoring: boolean = false;
  private lastUpdate: number = 0;
  private startTime: number = 0;
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Start monitoring
   */
  monitor(): void {
    if (!this.isMonitoring) {
      this.isMonitoring = true;
      this.startTime = Date.now();
      this.lastUpdate = Date.now();
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isMonitoring = false;
  }

  /**
   * Create and track an alert
   */
  alert(level: AlertLevel, message: string, source: string, metadata?: Record<string, unknown>): Alert {
    const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    const alert: Alert = {
      id,
      level,
      message,
      source,
      timestamp: Date.now(),
      acknowledged: false,
      metadata: metadata || {},
    };

    this.alerts.set(id, alert);
    this.lastUpdate = Date.now();
    
    return alert;
  }

  /**
   * Record a metric data point
   */
  recordMetric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const point: MetricPoint = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags: tags || {},
    };

    this.metrics.get(name)!.push(point);
    this.lastUpdate = Date.now();

    // Track special metrics
    if (name === 'requests') this.requestCount += value;
    if (name === 'errors') this.errorCount += value;
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level: AlertLevel): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.level === level);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get metric history
   */
  getMetricHistory(name: string): MetricPoint[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get all metrics summary
   */
  getMetrics(): {
    cpu: number;
    memory: number;
    requests: number;
    errors: number;
    uptime: number;
  } {
    const cpuPoints = this.metrics.get('cpu') || [];
    const memPoints = this.metrics.get('memory') || [];
    
    const avgCpu = cpuPoints.length > 0
      ? cpuPoints.reduce((sum, p) => sum + p.value, 0) / cpuPoints.length
      : 0;
    
    const avgMem = memPoints.length > 0
      ? memPoints.reduce((sum, p) => sum + p.value, 0) / memPoints.length
      : 0;

    return {
      cpu: Math.round(avgCpu * 100) / 100,
      memory: Math.round(avgMem * 100) / 100,
      requests: this.requestCount,
      errors: this.errorCount,
      uptime: this.isMonitoring ? Date.now() - this.startTime : 0,
    };
  }

  /**
   * Get current snapshot of monitor state
   */
  getSnapshot(): MonitorSnapshot {
    const alertsObj: Record<string, Alert> = {};
    this.alerts.forEach((a, id) => { alertsObj[id] = a; });

    const metricsObj: Record<string, MetricPoint[]> = {};
    this.metrics.forEach((points, name) => { metricsObj[name] = [...points]; });

    const allAlerts = this.getAlerts();
    const criticalCount = allAlerts.filter(a => a.level === 'critical' && !a.acknowledged).length;

    return {
      alerts: alertsObj,
      metrics: metricsObj,
      metricsSummary: this.getMetrics(),
      status: {
        isMonitoring: this.isMonitoring,
        lastUpdate: this.lastUpdate,
        alertCount: allAlerts.length,
        criticalAlerts: criticalCount,
      },
    };
  }

  /**
   * Reset all monitor state
   */
  reset(): void {
    this.alerts.clear();
    this.metrics.clear();
    this.isMonitoring = false;
    this.lastUpdate = 0;
    this.startTime = 0;
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const metrics = this.getMetrics();
    
    const lines = [
      '=== Monitor Report ===',
      `Monitoring: ${snap.status.isMonitoring ? 'Active' : 'Inactive'}`,
      `Uptime: ${metrics.uptime}ms`,
      `Requests: ${metrics.requests}`,
      `Errors: ${metrics.errors}`,
      `CPU: ${metrics.cpu}%`,
      `Memory: ${metrics.memory}%`,
      `Alerts: ${snap.status.alertCount} (${snap.status.criticalAlerts} critical)`,
      '',
      'Recent Alerts:',
    ];

    const alerts = this.getAlerts().slice(-5);
    if (alerts.length === 0) {
      lines.push('  (none)');
    } else {
      alerts.forEach(a => {
        const ack = a.acknowledged ? '[ACK]' : '[NEW]';
        lines.push(`  ${ack} [${a.level.toUpperCase()}] ${a.message} (${a.source})`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      isMonitoring: snap.status.isMonitoring,
      uptime: snap.metricsSummary.uptime,
      requests: snap.metricsSummary.requests,
      errors: snap.metricsSummary.errors,
      cpu: snap.metricsSummary.cpu,
      memory: snap.metricsSummary.memory,
      alertCount: snap.status.alertCount,
      criticalAlerts: snap.status.criticalAlerts,
      metricTypes: Object.keys(snap.metrics).length,
    };
  }
}

export default Monitor;