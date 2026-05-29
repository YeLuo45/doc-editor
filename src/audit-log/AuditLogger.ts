/**
 * AuditLogger.ts - Core audit logging for doc-editor V63
 * Provides logging, querying, entry retrieval, and statistics
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  action: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLoggerConfig {
  maxEntries?: number;
  retentionDays?: number;
  enableConsole?: boolean;
  enableFile?: boolean;
  logPath?: string;
  minLevel?: LogLevel;
}

interface LoggerSnapshot {
  metrics: {
    totalEntries: number;
    entriesByLevel: Record<LogLevel, number>;
    entriesByAction: Record<string, number>;
    oldestEntry?: string;
    newestEntry?: string;
  };
}

const DEFAULT_CONFIG: AuditLoggerConfig = {
  maxEntries: 10000,
  retentionDays: 90,
  enableConsole: true,
  enableFile: false,
  logPath: './audit.log',
  minLevel: 'INFO',
};

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private _config: AuditLoggerConfig;
  private metrics: LoggerSnapshot['metrics'] = {
    totalEntries: 0,
    entriesByLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 },
    entriesByAction: {},
    oldestEntry: undefined,
    newestEntry: undefined,
  };

  constructor(config: AuditLoggerConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): AuditLoggerConfig {
    return { ...this._config };
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const minIndex = levels.indexOf(this._config.minLevel || 'INFO');
    const entryIndex = levels.indexOf(level);
    return entryIndex >= minIndex;
  }

  log(
    action: string,
    options: {
      level?: LogLevel;
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      details?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): string {
    const level = options.level || 'INFO';

    if (!this.shouldLog(level)) {
      return '';
    }

    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      action,
      userId: options.userId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    this.entries.push(entry);
    this.updateMetrics(entry);

    if (this.entries.length > (this._config.maxEntries || 10000)) {
      this.entries = this.entries.slice(-this._config.maxEntries!);
    }

    if (this._config.enableConsole) {
      console.log(`[${level}] ${action}:`, JSON.stringify(options.details || {}));
    }

    return entry.id;
  }

  private updateMetrics(entry: AuditEntry): void {
    this.metrics.totalEntries++;
    this.metrics.entriesByLevel[entry.level]++;
    this.metrics.entriesByAction[entry.action] = (this.metrics.entriesByAction[entry.action] || 0) + 1;
    this.metrics.oldestEntry = this.metrics.oldestEntry || entry.id;
    this.metrics.newestEntry = entry.id;
  }

  query(filters: {
    startDate?: Date;
    endDate?: Date;
    level?: LogLevel;
    action?: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
  }): AuditEntry[] {
    return this.entries.filter((entry) => {
      if (filters.startDate && entry.timestamp < filters.startDate) return false;
      if (filters.endDate && entry.timestamp > filters.endDate) return false;
      if (filters.level && entry.level !== filters.level) return false;
      if (filters.action && entry.action !== filters.action) return false;
      if (filters.userId && entry.userId !== filters.userId) return false;
      if (filters.resourceType && entry.resourceType !== filters.resourceType) return false;
      if (filters.resourceId && entry.resourceId !== filters.resourceId) return false;
      return true;
    });
  }

  getEntries(limit?: number, offset: number = 0): AuditEntry[] {
    const sorted = [...this.entries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return sorted.slice(offset, limit ? offset + limit : undefined);
  }

  getStats(): LoggerSnapshot['metrics'] {
    return { ...this.metrics };
  }

  getSnapshot(): LoggerSnapshot {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    this.entries = [];
    this.metrics = {
      totalEntries: 0,
      entriesByLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 },
      entriesByAction: {},
      oldestEntry: undefined,
      newestEntry: undefined,
    };
  }

  getReport(): string {
    const lines = [
      '=== Audit Logger Report ===',
      `Total Entries: ${this.metrics.totalEntries}`,
      `Max Entries: ${this._config.maxEntries}`,
      `Retention Days: ${this._config.retentionDays}`,
      '',
      'Entries by Level:',
      ...Object.entries(this.metrics.entriesByLevel).map(
        ([level, count]) => `  ${level}: ${count}`
      ),
      '',
      'Top Actions:',
      ...Object.entries(this.metrics.entriesByAction)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => `  ${action}: ${count}`),
      '',
      `Oldest Entry: ${this.metrics.oldestEntry || 'N/A'}`,
      `Newest Entry: ${this.metrics.newestEntry || 'N/A'}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string; metrics: LoggerSnapshot['metrics'] } {
    return {
      version: 'V63',
      metrics: { ...this.metrics },
    };
  }
}

export default AuditLogger;