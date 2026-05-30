/**
 * V95 Workflow Registry - WorkflowRegistry.ts
 * Central registry for workflow management with register/unregister/get/getAll/has
 */

export type WorkflowConfig = {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
};

export type WorkflowRegistryConfig = {
  maxWorkflows?: number;
  allowDuplicates?: boolean;
  autoCleanup?: boolean;
};

interface RegistryMetrics {
  total: number;
  enabled: number;
  disabled: number;
  byPriority: Record<number, number>;
}

export class WorkflowRegistry {
  private workflows: Map<string, WorkflowConfig> = new Map();
  
  readonly config: WorkflowRegistryConfig;

  constructor(config: WorkflowRegistryConfig = {}) {
    this.config = {
      maxWorkflows: config.maxWorkflows ?? 100,
      allowDuplicates: config.allowDuplicates ?? false,
      autoCleanup: config.autoCleanup ?? true,
    };
  }

  register(workflow: WorkflowConfig): boolean {
    if (this.workflows.size >= (this.config.maxWorkflows ?? 100)) {
      if (this.config.autoCleanup && this.workflows.size > 0) {
        const oldest = this.workflows.keys().next().value;
        if (oldest) this.workflows.delete(oldest);
      } else {
        return false;
      }
    }

    const existing = this.workflows.get(workflow.id);
    if (existing && !this.config.allowDuplicates) {
      return false;
    }

    this.workflows.set(workflow.id, { ...workflow });
    return true;
  }

  unregister(id: string): boolean {
    return this.workflows.delete(id);
  }

  get(id: string): WorkflowConfig | undefined {
    return this.workflows.get(id);
  }

  getAll(): WorkflowConfig[] {
    return Array.from(this.workflows.values());
  }

  has(id: string): boolean {
    return this.workflows.has(id);
  }

  getSnapshot(): { metrics: RegistryMetrics } {
    const workflows = this.getAll();
    const byPriority: Record<number, number> = {};
    
    workflows.forEach(w => {
      const p = w.priority ?? 0;
      byPriority[p] = (byPriority[p] ?? 0) + 1;
    });

    return {
      metrics: {
        total: workflows.length,
        enabled: workflows.filter(w => w.enabled).length,
        disabled: workflows.filter(w => !w.enabled).length,
        byPriority,
      },
    };
  }

  reset(): void {
    this.workflows.clear();
  }

  getReport(): string {
    const { metrics } = this.getSnapshot();
    const lines = [
      '=== Workflow Registry Report ===',
      `Total Workflows: ${metrics.total}`,
      `Enabled: ${metrics.enabled}`,
      `Disabled: ${metrics.disabled}`,
      'Priority Distribution:',
    ];
    
    Object.entries(metrics.byPriority)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([priority, count]) => {
        lines.push(`  Priority ${priority}: ${count}`);
      });
    
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}