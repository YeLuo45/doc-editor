export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted';
  maxWorkers: number;
  timeout: number;
  retryAttempts: number;
}

interface Worker {
  id: string;
  weight: number;
  connections: number;
  status: 'active' | 'draining' | 'offline';
  lastUsed: number;
}

export class LoadBalancer {
  private workers: Map<string, Worker> = new Map();
  private roundRobinIndex = 0;
  private config: LoadBalancerConfig;

  constructor(config: LoadBalancerConfig) {
    this.config = config;
  }

  addWorker(id: string, weight = 1): boolean {
    if (this.workers.size >= this.config.maxWorkers) return false;
    if (this.workers.has(id)) return false;
    this.workers.set(id, { id, weight, connections: 0, status: 'active', lastUsed: Date.now() });
    return true;
  }

  removeWorker(id: string): boolean {
    return this.workers.delete(id);
  }

  route(requestId?: string): string | null {
    const activeWorkers = this.getActiveWorkers();
    if (activeWorkers.length === 0) return null;

    switch (this.config.algorithm) {
      case 'round-robin': {
        const worker = activeWorkers[this.roundRobinIndex % activeWorkers.length];
        this.roundRobinIndex++;
        this.updateWorkerUsage(worker.id);
        return worker.id;
      }
      case 'least-connections': {
        const sorted = [...activeWorkers].sort((a, b) => a.connections - b.connections);
        const worker = sorted[0];
        this.updateWorkerUsage(worker.id);
        return worker.id;
      }
      case 'weighted': {
        const totalWeight = activeWorkers.reduce((sum, w) => sum + w.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const worker of activeWorkers) {
          rand -= worker.weight;
          if (rand <= 0) {
            this.updateWorkerUsage(worker.id);
            return worker.id;
          }
        }
        this.updateWorkerUsage(activeWorkers[0].id);
        return activeWorkers[0].id;
      }
    }
  }

  private getActiveWorkers(): Worker[] {
    return [...this.workers.values()].filter(w => w.status === 'active');
  }

  private updateWorkerUsage(id: string): void {
    const worker = this.workers.get(id);
    if (worker) {
      worker.connections++;
      worker.lastUsed = Date.now();
    }
  }

  releaseWorker(id: string): void {
    const worker = this.workers.get(id);
    if (worker && worker.connections > 0) worker.connections--;
  }

  getStats() {
    const workers = [...this.workers.values()];
    return {
      total: workers.length,
      active: workers.filter(w => w.status === 'active').length,
      draining: workers.filter(w => w.status === 'draining').length,
      offline: workers.filter(w => w.status === 'offline').length,
      totalConnections: workers.reduce((sum, w) => sum + w.connections, 0),
    };
  }

  getWorkers() {
    return [...this.workers.values()].map(w => ({ id: w.id, status: w.status }));
  }

  getStatus(): { healthy: boolean; message: string } {
    const stats = this.getStats();
    return {
      healthy: stats.active > 0,
      message: stats.active > 0 ? `${stats.active} workers active` : 'No workers available',
    };
  }

  getSnapshot() {
    return { metrics: this.getStats(), workers: this.getWorkers() };
  }

  reset(): void {
    this.roundRobinIndex = 0;
    this.workers.forEach(w => {
      w.connections = 0;
      w.lastUsed = Date.now();
    });
  }

  getReport(): string {
    const stats = this.getStats();
    return `LoadBalancer Report: ${stats.active}/${stats.total} workers active, ${stats.totalConnections} total connections`;
  }

  exportMetrics() {
    return { version: '1.0.0', stats: this.getStats() };
  }
}