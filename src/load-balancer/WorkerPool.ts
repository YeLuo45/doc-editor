export interface WorkerPoolConfig {
  minSize: number;
  maxSize: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

export interface PoolWorker {
  id: string;
  active: boolean;
  tasks: number;
  memory: number;
}

interface PoolMember {
  id: string;
  active: boolean;
  tasks: number;
  memory: number;
  createdAt: number;
}

export class WorkerPool {
  private workers: Map<string, PoolMember> = new Map();
  private config: WorkerPoolConfig;

  constructor(config: WorkerPoolConfig) {
    this.config = config;
  }

  add(id: string): boolean {
    if (this.workers.size >= this.config.maxSize) return false;
    if (this.workers.has(id)) return false;
    this.workers.set(id, { id, active: true, tasks: 0, memory: 0, createdAt: Date.now() });
    return true;
  }

  remove(id: string): boolean {
    return this.workers.delete(id);
  }

  get(id: string): PoolWorker | null {
    const w = this.workers.get(id);
    return w ? { id: w.id, active: w.active, tasks: w.tasks, memory: w.memory } : null;
  }

  update(id: string, updates: Partial<PoolWorker>): boolean {
    const w = this.workers.get(id);
    if (!w) return false;
    if (updates.active !== undefined) w.active = updates.active;
    if (updates.tasks !== undefined) w.tasks = updates.tasks;
    if (updates.memory !== undefined) w.memory = updates.memory;
    return true;
  }

  getStats() {
    const workers = [...this.workers.values()];
    return {
      total: workers.length,
      active: workers.filter(w => w.active).length,
      idle: workers.filter(w => !w.active).length,
      totalTasks: workers.reduce((sum, w) => sum + w.tasks, 0),
      avgMemory: workers.length > 0 ? workers.reduce((sum, w) => sum + w.memory, 0) / workers.length : 0,
    };
  }

  getWorkers(): PoolWorker[] {
    return [...this.workers.values()].map(w => ({
      id: w.id,
      active: w.active,
      tasks: w.tasks,
      memory: w.memory,
    }));
  }

  getStatus(): { healthy: boolean; message: string } {
    const stats = this.getStats();
    return {
      healthy: stats.active >= this.config.minSize,
      message: `${stats.active}/${stats.total} workers active`,
    };
  }

  getSnapshot() {
    return { metrics: this.getStats(), workers: this.getWorkers() };
  }

  reset(): void {
    this.workers.forEach(w => {
      w.tasks = 0;
      w.memory = 0;
    });
  }

  getReport(): string {
    const stats = this.getStats();
    return `WorkerPool Report: ${stats.active}/${stats.total} active, ${stats.totalTasks} total tasks`;
  }

  exportMetrics() {
    return { version: '1.0.0', stats: this.getStats() };
  }
}