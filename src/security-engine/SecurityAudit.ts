/**
 * V70 Security Audit
 * Centralized security event logging and alerting
 */

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AuditConfig = {
  retentionDays: number;
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    failedAuthPerMinute: number;
    failedAuthWindow: number;
    suspiciousActivityThreshold: number;
  };
  logRotation: 'daily' | 'weekly' | 'monthly';
  enableComplianceLogging: boolean;
};

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  severity: AlertSeverity;
  userId?: string;
  resourceId?: string;
  details: Record<string, unknown>;
  source: string;
}

interface Alert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  message: string;
  source: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

interface AuditReport {
  generatedAt: Date;
  period: { start: Date; end: Date };
  totalEvents: number;
  eventsBySeverity: Record<AlertSeverity, number>;
  eventsByType: Record<string, number>;
  topUsers: { userId: string; count: number }[];
  alerts: Alert[];
}

export class SecurityAudit {
  readonly config: AuditConfig;
  private logs: AuditLogEntry[] = [];
  private alerts: Alert[] = [];
  private metrics = {
    loggedEvents: 0,
    queries: 0,
    alerts: 0,
    reports: 0,
  };

  constructor(config: AuditConfig) {
    this.config = config;
  }

  async log(
    eventType: string,
    severity: AlertSeverity,
    details: Record<string, unknown>,
    userId?: string,
    resourceId?: string
  ): Promise<string> {
    this.metrics.loggedEvents++;

    const entry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
      eventType,
      severity,
      userId,
      resourceId,
      details,
      source: 'security-engine',
    };

    this.logs.push(entry);
    this.cleanupOldEntries();

    if (this.shouldCreateAlert(eventType, severity, details)) {
      await this.createAlert(severity, eventType, details);
    }

    return entry.id;
  }

  async query(
    filters: {
      eventType?: string;
      severity?: AlertSeverity;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    this.metrics.queries++;

    let results = this.logs;

    if (filters.eventType) {
      results = results.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.severity) {
      results = results.filter((e) => e.severity === filters.severity);
    }
    if (filters.userId) {
      results = results.filter((e) => e.userId === filters.userId);
    }
    if (filters.startDate) {
      results = results.filter((e) => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter((e) => e.timestamp <= filters.endDate!);
    }

    return results.slice(0, limit);
  }

  async getAlerts(options?: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    limit?: number;
  }): Promise<Alert[]> {
    this.metrics.alerts++;

    let results = this.alerts;

    if (options?.severity) {
      results = results.filter((a) => a.severity === options.severity);
    }
    if (options?.acknowledged !== undefined) {
      results = results.filter((a) => a.acknowledged === options.acknowledged);
    }

    return results.slice(0, options?.limit || results.length);
  }

  async getReport(startDate?: Date, endDate?: Date): Promise<AuditReport> {
    this.metrics.reports++;

    const periodStart = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = endDate || new Date();

    const filteredLogs = this.logs.filter(
      (e) => e.timestamp >= periodStart && e.timestamp <= periodEnd
    );

    const eventsBySeverity: Record<AlertSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    const eventsByType: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    filteredLogs.forEach((log) => {
      eventsBySeverity[log.severity]++;
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
      if (log.userId) {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      }
    });

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      generatedAt: new Date(),
      period: { start: periodStart, end: periodEnd },
      totalEvents: filteredLogs.length,
      eventsBySeverity,
      eventsByType,
      topUsers,
      alerts: this.alerts.filter((a) => a.timestamp >= periodStart && a.timestamp <= periodEnd),
    };
  }

  private cleanupOldEntries(): void {
    const cutoff = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );
    this.logs = this.logs.filter((e) => e.timestamp >= cutoff);
  }

  private shouldCreateAlert(
    eventType: string,
    severity: AlertSeverity,
    details: Record<string, unknown>
  ): boolean {
    if (severity === 'critical' || severity === 'high') return true;
    if (details.failedAttempts && Number(details.failedAttempts) >= 5) return true;
    return false;
  }

  private async createAlert(
    severity: AlertSeverity,
    eventType: string,
    details: Record<string, unknown>
  ): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      severity,
      message: `${eventType}: ${JSON.stringify(details)}`,
      source: 'security-engine',
      acknowledged: false,
    };
    this.alerts.push(alert);
  }

  getSnapshot(): { metrics: typeof this.metrics; logCount: number; alertCount: number } {
    return {
      metrics: { ...this.metrics },
      logCount: this.logs.length,
      alertCount: this.alerts.length,
    };
  }

  reset(): void {
    this.logs = [];
    this.alerts = [];
    this.metrics = { loggedEvents: 0, queries: 0, alerts: 0, reports: 0 };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `SecurityAudit Report:
- Log Entries: ${snapshot.logCount}
- Alerts: ${snapshot.alertCount}
- Logged Events: ${snapshot.metrics.loggedEvents}
- Queries: ${snapshot.metrics.queries}
- Alerts Triggered: ${snapshot.metrics.alerts}
- Reports Generated: ${snapshot.metrics.reports}`;
  }

  exportMetrics(): { version: string; [key: string]: unknown } {
    return {
      version: 'V70',
      ...this.getSnapshot(),
    };
  }
}