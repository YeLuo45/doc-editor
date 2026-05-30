/**
 * V96 TransactionLog - Transaction logging and history management
 * Provides log/retrieve/clear/getHistory/getSize operations
 */

export type LogEntry = {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  transactionId?: string;
  data?: unknown;
};

export type TransactionLogConfig = {
  maxEntries?: number;
  retentionPeriod?: number;
  enablePersistence?: boolean;
  levels?: Array<'INFO' | 'WARN' | 'ERROR' | 'DEBUG'>;
};

type TransactionLogConfigType = TransactionLogConfig;

export class TransactionLog {
  private config: TransactionLogConfigType;
  private entries: LogEntry[] = [];
  private history: Map<string, LogEntry[]> = new Map();
  private idCounter = 0;

  constructor(config: TransactionLogConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      retentionPeriod: config.retentionPeriod ?? 86400000,
      enablePersistence: config.enablePersistence ?? false,
      levels: config.levels ?? ['INFO', 'WARN', 'ERROR', 'DEBUG'],
    };
  }

  log(
    message: string,
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO',
    transactionId?: string,
    data?: unknown
  ): string {
    const id = `log_${++this.idCounter}_${Date.now()}`;
    const entry: LogEntry = {
      id,
      timestamp: Date.now(),
      level,
      message,
      transactionId,
      data,
    };
    this.entries.push(entry);
    if (transactionId) {
      const txHistory = this.history.get(transactionId) ?? [];
      txHistory.push(entry);
      this.history.set(transactionId, txHistory);
    }
    this.trimEntries();
    return id;
  }

  retrieve(logId: string): LogEntry | undefined {
    return this.entries.find((entry) => entry.id === logId);
  }

  clear(transactionId?: string): boolean {
    if (transactionId) {
      this.history.delete(transactionId);
      this.entries = this.entries.filter((e) => e.transactionId !== transactionId);
    } else {
      this.entries = [];
      this.history.clear();
    }
    return true;
  }

  getHistory(transactionId: string): LogEntry[] {
    return this.history.get(transactionId) ?? [];
  }

  getSize(): { entries: number; transactions: number; memoryBytes: number } {
    const memoryBytes = JSON.stringify(this.entries).length;
    return {
      entries: this.entries.length,
      transactions: this.history.size,
      memoryBytes,
    };
  }

  getEntriesByLevel(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'): LogEntry[] {
    return this.entries.filter((entry) => entry.level === level);
  }

  getEntriesByRange(startTime: number, endTime: number): LogEntry[] {
    return this.entries.filter((entry) => entry.timestamp >= startTime && entry.timestamp <= endTime);
  }

  private trimEntries(): void {
    const maxEntries = this.config.maxEntries ?? 1000;
    if (this.entries.length > maxEntries) {
      this.entries = this.entries.slice(-maxEntries);
    }
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        entries: this.entries.length,
        transactions: this.history.size,
        config: this.config,
        size: this.getSize(),
        latestEntry: this.entries[this.entries.length - 1] ?? null,
      },
    };
  }

  reset(): void {
    this.entries = [];
    this.history.clear();
    this.idCounter = 0;
  }

  getReport(): string {
    const size = this.getSize();
    const lines = [
      '=== Transaction Log Report ===',
      `Total Entries: ${size.entries}`,
      `Transactions Logged: ${size.transactions}`,
      `Memory Usage: ${size.memoryBytes} bytes`,
      `Config: ${JSON.stringify(this.config)}`,
      'Last 5 Entries:',
      ...this.entries.slice(-5).map((e) => `  [${e.level}] ${e.message}`),
      '==============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v96',
      totalEntries: this.entries.length,
      transactionsLogged: this.history.size,
      memoryUsage: this.getSize().memoryBytes,
      config: this.config,
    };
  }
}