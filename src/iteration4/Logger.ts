/**
 * Logger.ts - Logging system module for V34 Iteration 4
 * Provides logging operations with log, warn, error, getLogs
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  meta?: unknown;
}

export interface LoggerMetrics {
  infoCount: number;
  warnCount: number;
  errorCount: number;
  totalCount: number;
  firstLog: number | null;
  lastLog: number | null;
}

export interface LoggerSnapshot {
  entries: LogEntry[];
  count: number;
  metrics: LoggerMetrics;
}

export class Logger {
  private entries: LogEntry[] = [];
  private maxEntries: number;
  private metrics: LoggerMetrics = {
    infoCount: 0,
    warnCount: 0,
    errorCount: 0,
    totalCount: 0,
    firstLog: null,
    lastLog: null,
  };

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Log an info message
   */
  log(message: string, meta?: unknown): void {
    this.addEntry('info', message, meta);
    this.metrics.infoCount++;
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: unknown): void {
    this.addEntry('warn', message, meta);
    this.metrics.warnCount++;
  }

  /**
   * Log an error message
   */
  error(message: string, meta?: unknown): void {
    this.addEntry('error', message, meta);
    this.metrics.errorCount++;
  }

  private addEntry(level: LogLevel, message: string, meta?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      meta,
    };
    this.entries.push(entry);
    this.metrics.totalCount++;
    this.metrics.lastLog = entry.timestamp;
    if (this.metrics.firstLog === null) {
      this.metrics.firstLog = entry.timestamp;
    }
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * Get all log entries
   */
  getLogs(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.entries.filter(e => e.level === level);
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get current snapshot of logger state
   */
  getSnapshot(): LoggerSnapshot {
    return {
      entries: [...this.entries],
      count: this.entries.length,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset logger to initial state
   */
  reset(): void {
    this.entries = [];
    this.metrics = {
      infoCount: 0,
      warnCount: 0,
      errorCount: 0,
      totalCount: 0,
      firstLog: null,
      lastLog: null,
    };
  }

  /**
   * Get human-readable report
   */
  getReport(): string {
    return [
      '=== Logger Report ===',
      `Total Entries: ${this.entries.length}`,
      `Info: ${this.metrics.infoCount}`,
      `Warn: ${this.metrics.warnCount}`,
      `Error: ${this.metrics.errorCount}`,
      `First Log: ${this.metrics.firstLog ? new Date(this.metrics.firstLog).toISOString() : 'N/A'}`,
      `Last Log: ${this.metrics.lastLog ? new Date(this.metrics.lastLog).toISOString() : 'N/A'}`,
      '====================',
    ].join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): LoggerMetrics {
    return { ...this.metrics };
  }
}

export default Logger;