/**
 * LoggerEngine.ts - V87 Logger Engine Core
 * Handles logging operations with write/flush/getLevel/getStats
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerConfig {
  minLevel: LogLevel;
  maxBufferSize: number;
  flushInterval: number;
  enableConsole: boolean;
  enableRemote: boolean;
  format: string;
  tags?: string[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  tags?: string[];
}

export interface LoggerStats {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  bufferSize: number;
  lastFlush: number;
  uptime: number;
}

export class LoggerEngine {
  private buffer: LogEntry[] = [];
  private stats: LoggerStats;
  private startTime: number;
  
  constructor(public config: LoggerConfig) {
    this.startTime = Date.now();
    this.stats = {
      totalLogs: 0,
      logsByLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
      bufferSize: 0,
      lastFlush: 0,
      uptime: 0
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const minIndex = levels.indexOf(this.config.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public log(level: LogLevel, message: string, context?: Record<string, unknown>): boolean {
    if (!this.shouldLog(level)) {
      return false;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      context,
      tags: this.config.tags
    };

    this.buffer.push(entry);
    this.stats.totalLogs++;
    this.stats.logsByLevel[level]++;
    this.stats.bufferSize = this.buffer.length;

    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush();
    }

    return true;
  }

  public write(entry: LogEntry): boolean {
    if (!this.shouldLog(entry.level)) {
      return false;
    }

    this.buffer.push(entry);
    this.stats.totalLogs++;
    this.stats.logsByLevel[entry.level]++;
    this.stats.bufferSize = this.buffer.length;

    return true;
  }

  public flush(): LogEntry[] {
    const flushed = [...this.buffer];
    this.buffer = [];
    this.stats.bufferSize = 0;
    this.stats.lastFlush = Date.now();
    return flushed;
  }

  public getLevel(): LogLevel {
    return this.config.minLevel;
  }

  public getStats(): LoggerStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime
    };
  }

  public getSnapshot(): { metrics: LoggerStats } {
    return {
      metrics: this.getStats()
    };
  }

  public reset(): void {
    this.buffer = [];
    this.stats = {
      totalLogs: 0,
      logsByLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
      bufferSize: 0,
      lastFlush: 0,
      uptime: Date.now() - this.startTime
    };
  }

  public getReport(): string {
    const s = this.getStats();
    return `LoggerEngine Report:
  Total Logs: ${s.totalLogs}
  Buffer Size: ${s.bufferSize}
  Last Flush: ${new Date(s.lastFlush).toISOString()}
  Uptime: ${s.uptime}ms
  By Level: debug=${s.logsByLevel.debug}, info=${s.logsByLevel.info}, warn=${s.logsByLevel.warn}, error=${s.logsByLevel.error}, fatal=${s.logsByLevel.fatal}`;
  }

  public exportMetrics(): { version: string } {
    return {
      version: 'V87-1.0.0'
    };
  }

  public debug(message: string, context?: Record<string, unknown>): boolean {
    return this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, unknown>): boolean {
    return this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, unknown>): boolean {
    return this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, unknown>): boolean {
    return this.log('error', message, context);
  }

  public fatal(message: string, context?: Record<string, unknown>): boolean {
    return this.log('fatal', message, context);
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}]`;
    console.log(`${prefix} ${entry.message}`, entry.context || '');
  }
}

export default LoggerEngine;
