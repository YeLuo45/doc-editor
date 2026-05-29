/**
 * V59 AI Engine - TokenBudget.ts
 * Token Budget Control and Management Module
 */

export interface TokenAllocation {
  category: string;
  allocated: number;
  used: number;
  remaining: number;
}

export interface BudgetConfig {
  totalBudget: number;
  warningThreshold: number;
  hardLimit: boolean;
  autoReset: boolean;
}

export interface BudgetSnapshot {
  totalAllocated: number;
  totalUsed: number;
  totalReserved: number;
  allocations: TokenAllocation[];
  warningTriggered: boolean;
  limitReached: boolean;
}

const DEFAULT_CATEGORIES = ['prompt', 'completion', 'system', 'user'];

export class TokenBudget {
  private _config: BudgetConfig;
  private totalBudget: number;
  private allocations: Map<string, TokenAllocation>;
  private reserved: number;
  private used: number;
  private warningTriggered: boolean = false;
  private limitReached: boolean = false;

  constructor(config: Partial<BudgetConfig> = {}) {
    this._config = {
      totalBudget: config.totalBudget || 1000000,
      warningThreshold: config.warningThreshold || 0.8,
      hardLimit: config.hardLimit ?? false,
      autoReset: config.autoReset ?? false,
    };
    this.totalBudget = this._config.totalBudget;
    this.allocations = new Map();
    this.reserved = 0;
    this.used = 0;

    DEFAULT_CATEGORIES.forEach(cat => {
      this.allocations.set(cat, { category: cat, allocated: 0, used: 0, remaining: 0 });
    });
  }

  get config(): BudgetConfig {
    return { ...this._config };
  }

  allocate(category: string, amount: number): boolean {
    const current = this.allocations.get(category) || { category, allocated: 0, used: 0, remaining: 0 };
    const available = this.totalBudget - this.reserved - this.used;

    if (amount > available) {
      if (this._config.hardLimit) {
        return false;
      }
      amount = available;
    }

    current.allocated += amount;
    current.remaining = current.allocated - current.used;
    this.allocations.set(category, current);
    this.reserved += amount;

    this.checkThresholds();
    return true;
  }

  reserve(amount: number): boolean {
    const available = this.totalBudget - this.reserved - this.used;

    if (amount > available) {
      if (this._config.hardLimit) {
        return false;
      }
      amount = available;
    }

    this.reserved += amount;
    this.checkThresholds();
    return true;
  }

  remaining(category?: string): number {
    if (category) {
      const allocation = this.allocations.get(category);
      if (!allocation) return 0;
      return allocation.remaining;
    }

    return this.totalBudget - this.reserved - this.used;
  }

  getBudget(category?: string): TokenAllocation | TokenAllocation[] {
    if (category) {
      return this.allocations.get(category) || { category, allocated: 0, used: 0, remaining: 0 };
    }
    return Array.from(this.allocations.values());
  }

  use(category: string, amount: number): boolean {
    const allocation = this.allocations.get(category);
    if (allocation) {
      if (amount > allocation.remaining) {
        if (this._config.hardLimit) return false;
        amount = allocation.remaining;
      }
      allocation.used += amount;
      allocation.remaining = allocation.allocated - allocation.used;
      this.used += amount;
    } else {
      this.used += amount;
    }

    this.checkThresholds();
    return true;
  }

  release(category: string, amount: number): void {
    const allocation = this.allocations.get(category);
    if (allocation) {
      const releaseAmount = Math.min(amount, allocation.allocated);
      allocation.allocated -= releaseAmount;
      allocation.remaining = allocation.allocated - allocation.used;
      this.reserved -= releaseAmount;
    }
  }

  resetCategory(category: string): void {
    const allocation = this.allocations.get(category);
    if (allocation) {
      this.reserved -= allocation.allocated;
      this.used -= allocation.used;
      allocation.allocated = 0;
      allocation.used = 0;
      allocation.remaining = 0;
    }
  }

  private checkThresholds(): void {
    const usage = this.used / this.totalBudget;
    this.warningTriggered = usage >= this._config.warningThreshold;
    this.limitReached = usage >= 1.0;

    if (this.limitReached && this._config.autoReset) {
      this.reset();
    }
  }

  getSnapshot(): { metrics: BudgetSnapshot } {
    return {
      metrics: {
        totalAllocated: this.reserved,
        totalUsed: this.used,
        totalReserved: this.reserved,
        allocations: Array.from(this.allocations.values()),
        warningTriggered: this.warningTriggered,
        limitReached: this.limitReached,
      },
    };
  }

  reset(): void {
    this.used = 0;
    this.reserved = 0;
    this.warningTriggered = false;
    this.limitReached = false;
    this.allocations.clear();
    DEFAULT_CATEGORIES.forEach(cat => {
      this.allocations.set(cat, { category: cat, allocated: 0, used: 0, remaining: 0 });
    });
  }

  getReport(): string {
    const lines = [
      '=== Token Budget Report ===',
      `Total Budget: ${this.totalBudget}`,
      `Total Allocated: ${this.reserved}`,
      `Total Used: ${this.used}`,
      `Remaining: ${this.remaining()}`,
      `Warning Triggered: ${this.warningTriggered}`,
      `Limit Reached: ${this.limitReached}`,
      'Allocations:',
    ];

    this.allocations.forEach(alloc => {
      lines.push(`  ${alloc.category}: allocated=${alloc.allocated}, used=${alloc.used}, remaining=${alloc.remaining}`);
    });

    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V59-ai-engine-1.0',
    };
  }
}