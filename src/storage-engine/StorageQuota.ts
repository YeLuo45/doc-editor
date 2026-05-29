/**
 * StorageQuota.ts - V68 Storage Engine Quota Management
 * Handles quota allocation and tracking: allocate, check, getQuota, getUsage
 */

type QuotaConfig = {
  maxQuota: number;
  warningThreshold: number;
  enforcementLevel: 'soft' | 'hard' | 'none';
  autoCleanup: boolean;
};

interface QuotaAllocation {
  id: string;
  size: number;
  createdAt: number;
  owner: string;
  priority: number;
}

interface QuotaUsage {
  used: number;
  available: number;
  allocations: number;
  utilizationPercent: number;
}

export class StorageQuota {
  private used: number = 0;
  private allocations: Map<string, QuotaAllocation> = new Map();
  public readonly config: QuotaConfig;

  constructor(config: Partial<QuotaConfig> = {}) {
    this.config = {
      maxQuota: config.maxQuota ?? 1024 * 1024 * 500, // 500MB default
      warningThreshold: config.warningThreshold ?? 0.8,
      enforcementLevel: config.enforcementLevel ?? 'soft',
      autoCleanup: config.autoCleanup ?? false,
    };
  }

  allocate(id: string, size: number, owner: string, priority: number = 5): boolean {
    if (!id || size <= 0) {
      throw new Error('Invalid allocation parameters');
    }

    if (this.used + size > this.config.maxQuota) {
      if (this.config.enforcementLevel === 'hard') {
        throw new Error(`Quota exceeded: ${this.used + size} > ${this.config.maxQuota}`);
      }
      return false;
    }

    const allocation: QuotaAllocation = {
      id,
      size,
      createdAt: Date.now(),
      owner,
      priority,
    };

    this.allocations.set(id, allocation);
    this.used += size;
    return true;
  }

  check(size: number): boolean {
    return this.used + size <= this.config.maxQuota;
  }

  getQuota(): number {
    return this.config.maxQuota;
  }

  getUsage(): QuotaUsage {
    return {
      used: this.used,
      available: this.config.maxQuota - this.used,
      allocations: this.allocations.size,
      utilizationPercent: (this.used / this.config.maxQuota) * 100,
    };
  }

  release(id: string): boolean {
    const allocation = this.allocations.get(id);
    if (!allocation) {
      return false;
    }

    this.used -= allocation.size;
    this.allocations.delete(id);
    return true;
  }

  isWarningThreshold(): boolean {
    return this.getUsage().utilizationPercent >= this.config.warningThreshold * 100;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    const usage = this.getUsage();
    return {
      metrics: {
        maxQuota: this.config.maxQuota,
        used: usage.used,
        available: usage.available,
        allocations: usage.allocations,
        utilizationPercent: usage.utilizationPercent,
        warningThreshold: this.config.warningThreshold,
        enforcementLevel: this.config.enforcementLevel,
        autoCleanup: this.config.autoCleanup,
      },
    };
  }

  reset(): void {
    this.used = 0;
    this.allocations.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const warning = this.isWarningThreshold() ? ' [WARNING]' : '';
    return [
      '=== StorageQuota Report ===',
      `Max Quota: ${snapshot.metrics.maxQuota} bytes`,
      `Used: ${snapshot.metrics.used} bytes`,
      `Available: ${snapshot.metrics.available} bytes`,
      `Allocations: ${snapshot.metrics.allocations}`,
      `Utilization: ${(snapshot.metrics.utilizationPercent as number).toFixed(2)}%${warning}`,
      `Enforcement: ${snapshot.metrics.enforcementLevel}`,
      `Auto Cleanup: ${snapshot.metrics.autoCleanup ? 'ON' : 'OFF'}`,
      '===========================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v68-storage-engine' };
  }

  getAllocation(id: string): QuotaAllocation | null {
    return this.allocations.get(id) ?? null;
  }

  listAllocations(): QuotaAllocation[] {
    return Array.from(this.allocations.values());
  }
}