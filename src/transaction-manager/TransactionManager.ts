/**
 * V96 TransactionManager - Core transaction management for doc-editor
 * Handles begin/commit/rollback operations with full state tracking
 */

export type TransactionConfig = {
  maxRetries?: number;
  timeout?: number;
  autoRollback?: boolean;
  isolationLevel?: 'READ_COMMITTED' | 'READ_UNCOMMITTED' | 'SERIALIZABLE';
  enableLogging?: boolean;
};

export type Transaction = {
  id: string;
  status: 'active' | 'committed' | 'rolled_back' | 'failed';
  startTime: number;
  operations: TransactionOperation[];
};

export type TransactionOperation = {
  type: string;
  timestamp: number;
  data: unknown;
};

type TransactionManagerConfig = TransactionConfig;

export class TransactionManager {
  private config: TransactionManagerConfig;
  private transactions: Map<string, Transaction> = new Map();
  private activeTransactionId: string | null = null;
  private stats = {
    totalTransactions: 0,
    committed: 0,
    rolledBack: 0,
    failed: 0,
  };

  constructor(config: TransactionConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 30000,
      autoRollback: config.autoRollback ?? true,
      isolationLevel: config.isolationLevel ?? 'READ_COMMITTED',
      enableLogging: config.enableLogging ?? true,
    };
  }

  begin(transactionId?: string): string {
    const id = transactionId ?? this.generateTransactionId();
    const transaction: Transaction = {
      id,
      status: 'active',
      startTime: Date.now(),
      operations: [],
    };
    this.transactions.set(id, transaction);
    this.activeTransactionId = id;
    this.stats.totalTransactions++;
    return id;
  }

  commit(transactionId?: string): boolean {
    const id = transactionId ?? this.activeTransactionId;
    if (!id) {
      throw new Error('No active transaction to commit');
    }
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }
    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${id} is not active (status: ${transaction.status})`);
    }
    transaction.status = 'committed';
    this.stats.committed++;
    this.activeTransactionId = null;
    return true;
  }

  rollback(transactionId?: string): boolean {
    const id = transactionId ?? this.activeTransactionId;
    if (!id) {
      throw new Error('No active transaction to rollback');
    }
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error(`Transaction ${id} not found`);
    }
    transaction.status = 'rolled_back';
    this.stats.rolledBack++;
    this.activeTransactionId = null;
    return true;
  }

  addOperation(transactionId: string, type: string, data: unknown): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    transaction.operations.push({ type, timestamp: Date.now(), data });
  }

  getStatus(transactionId?: string): string {
    const id = transactionId ?? this.activeTransactionId;
    if (!id) return 'no_transaction';
    const transaction = this.transactions.get(id);
    return transaction?.status ?? 'unknown';
  }

  getStats(): {
    total: number;
    committed: number;
    rolledBack: number;
    failed: number;
    active: number;
  } {
    return {
      total: this.stats.totalTransactions,
      committed: this.stats.committed,
      rolledBack: this.stats.rolledBack,
      failed: this.stats.failed,
      active: this.transactions.size - this.stats.committed - this.stats.rolledBack - this.stats.failed,
    };
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        transactions: Array.from(this.transactions.values()),
        stats: this.getStats(),
        activeTransactionId: this.activeTransactionId,
        config: this.config,
      },
    };
  }

  reset(): void {
    this.transactions.clear();
    this.activeTransactionId = null;
    this.stats = { totalTransactions: 0, committed: 0, rolledBack: 0, failed: 0 };
  }

  getReport(): string {
    const stats = this.getStats();
    const lines = [
      '=== Transaction Manager Report ===',
      `Total Transactions: ${stats.total}`,
      `Committed: ${stats.committed}`,
      `Rolled Back: ${stats.rolledBack}`,
      `Failed: ${stats.failed}`,
      `Active: ${stats.active}`,
      `Active Transaction: ${this.activeTransactionId ?? 'none'}`,
      `Config: ${JSON.stringify(this.config)}`,
      '================================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v96',
      stats: this.getStats(),
      transactions: this.transactions.size,
      activeTransactionId: this.activeTransactionId,
    };
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}