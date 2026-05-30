/**
 * V96 TransactionLock - Distributed lock management for transactions
 * Handles acquire/release/getLocks/isLocked operations
 */

export type LockInfo = {
  resource: string;
  transactionId: string;
  acquiredAt: number;
  expiresAt: number;
  isExclusive: boolean;
};

export type TransactionLockConfig = {
  defaultTimeout?: number;
  maxLocks?: number;
  enableDeadlockDetection?: boolean;
  lockCleanupInterval?: number;
};

type TransactionLockConfigType = TransactionLockConfig;

export class TransactionLock {
  private config: TransactionLockConfigType;
  private locks: Map<string, LockInfo> = new Map();
  private waitQueue: Map<string, string[]> = new Map();
  private stats = {
    totalAcquires: 0,
    totalReleases: 0,
    deadlocksDetected: 0,
    timeouts: 0,
  };

  constructor(config: TransactionLockConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout ?? 30000,
      maxLocks: config.maxLocks ?? 100,
      enableDeadlockDetection: config.enableDeadlockDetection ?? true,
      lockCleanupInterval: config.lockCleanupInterval ?? 60000,
    };
  }

  acquire(
    resource: string,
    transactionId: string,
    options?: { timeout?: number; isExclusive?: boolean }
  ): boolean {
    this.stats.totalAcquires++;
    const isExclusive = options?.isExclusive ?? true;
    const timeout = options?.timeout ?? this.config.defaultTimeout!;
    const now = Date.now();
    const expiresAt = now + timeout;

    if (this.locks.size >= this.config.maxLocks!) {
      this.queueLockRequest(resource, transactionId);
      return false;
    }

    const existingLock = this.locks.get(resource);
    if (existingLock) {
      if (existingLock.expiresAt < now) {
        this.locks.delete(resource);
      } else if (isExclusive && existingLock.transactionId !== transactionId) {
        this.queueLockRequest(resource, transactionId);
        return false;
      }
    }

    if (this.config.enableDeadlockDetection && this.detectDeadlock(resource, transactionId)) {
      this.stats.deadlocksDetected++;
      return false;
    }

    const lockInfo: LockInfo = {
      resource,
      transactionId,
      acquiredAt: now,
      expiresAt,
      isExclusive,
    };
    this.locks.set(resource, lockInfo);
    return true;
  }

  release(resource: string, transactionId: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return false;
    if (lock.transactionId !== transactionId) return false;
    this.locks.delete(resource);
    this.stats.totalReleases++;
    this.processWaitQueue(resource);
    return true;
  }

  getLocks(transactionId?: string): LockInfo[] {
    if (transactionId) {
      return Array.from(this.locks.values()).filter((l) => l.transactionId === transactionId);
    }
    return Array.from(this.locks.values());
  }

  isLocked(resource: string, byTransactionId?: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock) return false;
    if (lock.expiresAt < Date.now()) {
      this.locks.delete(resource);
      return false;
    }
    if (byTransactionId) {
      return lock.transactionId === byTransactionId;
    }
    return true;
  }

  getLockInfo(resource: string): LockInfo | undefined {
    const lock = this.locks.get(resource);
    if (lock && lock.expiresAt < Date.now()) {
      this.locks.delete(resource);
      return undefined;
    }
    return lock;
  }

  forceRelease(resource: string): boolean {
    if (this.locks.has(resource)) {
      this.locks.delete(resource);
      this.processWaitQueue(resource);
      return true;
    }
    return false;
  }

  private queueLockRequest(resource: string, transactionId: string): void {
    const queue = this.waitQueue.get(resource) ?? [];
    if (!queue.includes(transactionId)) {
      queue.push(transactionId);
      this.waitQueue.set(resource, queue);
    }
  }

  private processWaitQueue(resource: string): void {
    const queue = this.waitQueue.get(resource);
    if (queue && queue.length > 0) {
      const nextId = queue.shift()!;
      this.acquire(resource, nextId);
    }
  }

  private detectDeadlock(resource: string, transactionId: string): boolean {
    const visited = new Set<string>();
    const lockChain = (txId: string): boolean => {
      if (visited.has(txId)) return false;
      visited.add(txId);
      const locks = this.getLocks(txId);
      for (const lock of locks) {
        if (lock.resource === resource) return true;
        const chain = lockChain(lock.transactionId);
        if (chain) return true;
      }
      return false;
    };
    return lockChain(transactionId);
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        locks: Array.from(this.locks.values()),
        stats: this.stats,
        config: this.config,
        waitQueue: Array.from(this.waitQueue.entries()),
      },
    };
  }

  reset(): void {
    this.locks.clear();
    this.waitQueue.clear();
    this.stats = { totalAcquires: 0, totalReleases: 0, deadlocksDetected: 0, timeouts: 0 };
  }

  getReport(): string {
    const lines = [
      '=== Transaction Lock Report ===',
      `Active Locks: ${this.locks.size}`,
      `Total Acquires: ${this.stats.totalAcquires}`,
      `Total Releases: ${this.stats.totalReleases}`,
      `Deadlocks Detected: ${this.stats.deadlocksDetected}`,
      `Timeouts: ${this.stats.timeouts}`,
      `Max Locks: ${this.config.maxLocks}`,
      `Resources Locked: ${Array.from(this.locks.keys()).join(', ') || 'none'}`,
      '==============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v96',
      activeLocks: this.locks.size,
      stats: this.stats,
      config: this.config,
      resources: Array.from(this.locks.keys()),
    };
  }
}