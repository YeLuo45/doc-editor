/**
 * V96 TransactionMonitor - Transaction monitoring and metrics collection
 * Provides track/getMetrics/getHistory/getStatus operations
 */

export type MetricPoint = {
  timestamp: number;
  name: string;
  value: number;
  tags?: Record<string, string>;
};

export type TransactionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export type TrackedTransaction = {
  id: string;
  status: TransactionStatus;
  startTime: number;
  endTime?: number;
  metrics: MetricPoint[];
  checkpoints: Map<string, unknown>;
};

export type TransactionMonitorConfig = {
  samplingRate?: number;
  enableRealTimeTracking?: boolean;
  metricsRetentionPeriod?: number;
  maxTrackedTransactions?: number;
};

type TransactionMonitorConfigType = TransactionMonitorConfig;

export class TransactionMonitor {
  private config: TransactionMonitorConfigType;
  private trackedTransactions: Map<string, TrackedTransaction> = new Map();
  private globalMetrics: MetricPoint[] = [];
  private history: Map<string, TrackedTransaction[]> = new Map();

  constructor(config: TransactionMonitorConfig = {}) {
    this.config = {
      samplingRate: config.samplingRate ?? 1.0,
      enableRealTimeTracking: config.enableRealTimeTracking ?? true,
      metricsRetentionPeriod: config.metricsRetentionPeriod ?? 3600000,
      maxTrackedTransactions: config.maxTrackedTransactions ?? 1000,
    };
  }

  track(transactionId: string, status: TransactionStatus = 'pending'): TrackedTransaction {
    let transaction = this.trackedTransactions.get(transactionId);
    if (!transaction) {
      transaction = {
        id: transactionId,
        status,
        startTime: Date.now(),
        metrics: [],
        checkpoints: new Map(),
      };
      this.trackedTransactions.set(transactionId, transaction);
    } else {
      transaction.status = status;
    }
    return transaction;
  }

  recordMetric(transactionId: string, name: string, value: number, tags?: Record<string, string>): void {
    const transaction = this.trackedTransactions.get(transactionId);
    if (!transaction) {
      this.track(transactionId, 'active');
    }
    const metric: MetricPoint = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };
    const tx = this.trackedTransactions.get(transactionId);
    if (tx) {
      tx.metrics.push(metric);
    }
    if (Math.random() <= this.config.samplingRate!) {
      this.globalMetrics.push(metric);
    }
  }

  addCheckpoint(transactionId: string, checkpointName: string, data: unknown): void {
    const transaction = this.trackedTransactions.get(transactionId);
    if (transaction) {
      transaction.checkpoints.set(checkpointName, data);
    }
  }

  getMetrics(transactionId?: string): MetricPoint[] {
    if (transactionId) {
      const transaction = this.trackedTransactions.get(transactionId);
      return transaction?.metrics ?? [];
    }
    return this.globalMetrics;
  }

  getHistory(transactionId: string): TrackedTransaction | undefined {
    return this.trackedTransactions.get(transactionId);
  }

  getStatus(transactionId?: string): TransactionStatus | Map<string, TransactionStatus> {
    if (transactionId) {
      const transaction = this.trackedTransactions.get(transactionId);
      return transaction?.status ?? 'pending';
    }
    const statuses = new Map<string, TransactionStatus>();
    this.trackedTransactions.forEach((tx, id) => {
      statuses.set(id, tx.status);
    });
    return statuses;
  }

  completeTransaction(transactionId: string, success: boolean): void {
    const transaction = this.trackedTransactions.get(transactionId);
    if (transaction) {
      transaction.status = success ? 'completed' : 'failed';
      transaction.endTime = Date.now();
      this.archiveTransaction(transactionId);
    }
  }

  private archiveTransaction(transactionId: string): void {
    const transaction = this.trackedTransactions.get(transactionId);
    if (transaction) {
      const dayKey = new Date().toISOString().split('T')[0];
      const dayHistory = this.history.get(dayKey) ?? [];
      dayHistory.push({ ...transaction, checkpoints: new Map(transaction.checkpoints) });
      this.history.set(dayKey, dayHistory);
    }
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        trackedTransactions: this.trackedTransactions.size,
        globalMetrics: this.globalMetrics.length,
        historyDays: this.history.size,
        config: this.config,
        transactions: Array.from(this.trackedTransactions.values()).map((tx) => ({
          ...tx,
          checkpoints: Array.from(tx.checkpoints.entries()),
        })),
      },
    };
  }

  reset(): void {
    this.trackedTransactions.clear();
    this.globalMetrics = [];
  }

  getReport(): string {
    const lines = [
      '=== Transaction Monitor Report ===',
      `Tracked Transactions: ${this.trackedTransactions.size}`,
      `Global Metrics: ${this.globalMetrics.length}`,
      `History Days: ${this.history.size}`,
      `Config: ${JSON.stringify(this.config)}`,
      'Active Transactions:',
      ...Array.from(this.trackedTransactions.values())
        .filter((tx) => tx.status === 'active')
        .map((tx) => `  ${tx.id}: ${tx.metrics.length} metrics`),
      '==================================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v96',
      trackedTransactions: this.trackedTransactions.size,
      globalMetrics: this.globalMetrics.length,
      config: this.config,
    };
  }
}