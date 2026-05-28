import type {
  Phase,
  PhaseResult,
  PhaseStatus,
  WorkflowExecution,
  AgentId,
} from './types';

/**
 * PhaseWorkflow - DAG-based phase execution
 * Implements planning->coding->review->delivery workflow
 */
export class PhaseWorkflow {
  private phases: Phase[] = [];
  private executionMap: Map<string, WorkflowExecution> = new Map();
  private currentExecution: WorkflowExecution | null = null;

  constructor() {
    // Default workflow phases
    this.phases = this.createDefaultPhases();
  }

  /**
   * Create default planning->coding->review->delivery workflow
   */
  private createDefaultPhases(): Phase[] {
    return [
      {
        id: 'planning',
        name: 'Planning',
        dependsOn: [],
        agents: [],
        parallel: false,
        timeout: 30000,
        retryCount: 2,
      },
      {
        id: 'coding',
        name: 'Coding',
        dependsOn: ['planning'],
        agents: [],
        parallel: true,
        timeout: 120000,
        retryCount: 3,
      },
      {
        id: 'review',
        name: 'Review',
        dependsOn: ['coding'],
        agents: [],
        parallel: false,
        timeout: 60000,
        retryCount: 2,
      },
      {
        id: 'delivery',
        name: 'Delivery',
        dependsOn: ['review'],
        agents: [],
        parallel: false,
        timeout: 30000,
        retryCount: 1,
      },
    ];
  }

  /**
   * Set phases for workflow
   */
  setPhases(phases: Phase[]): void {
    this.validateDAG(phases);
    this.phases = phases;
  }

  /**
   * Get current phases
   */
  getPhases(): Phase[] {
    return [...this.phases];
  }

  /**
   * Validate that phases form a valid DAG (no cycles)
   */
  private validateDAG(phases: Phase[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (phaseId: string, phases: Phase[]): boolean => {
      if (recursionStack.has(phaseId)) return true;
      if (visited.has(phaseId)) return false;

      visited.add(phaseId);
      recursionStack.add(phaseId);

      const phase = phases.find((p) => p.id === phaseId);
      if (phase) {
        for (const dep of phase.dependsOn) {
          if (hasCycle(dep, phases)) return true;
        }
      }

      recursionStack.delete(phaseId);
      return false;
    };

    for (const phase of phases) {
      if (hasCycle(phase.id, phases)) {
        throw new Error(`Cycle detected in phase workflow at phase: ${phase.id}`);
      }
    }
  }

  /**
   * Create a new workflow execution
   */
  createExecution(agents: AgentId[]): WorkflowExecution {
    // Assign agents to phases
    const phasesWithAgents = this.assignAgentsToPhases(agents);

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      phases: phasesWithAgents,
      status: 'pending',
      startedAt: Date.now(),
      results: new Map(),
    };

    this.executionMap.set(execution.id, execution);
    this.currentExecution = execution;
    return execution;
  }

  /**
   * Assign agents to phases round-robin
   */
  private assignAgentsToPhases(agents: AgentId[]): Phase[] {
    if (agents.length === 0) return this.phases;

    return this.phases.map((phase, index) => ({
      ...phase,
      agents: [agents[index % agents.length]],
    }));
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executionMap.get(executionId);
  }

  /**
   * Get current execution
   */
  getCurrentExecution(): WorkflowExecution | null {
    return this.currentExecution;
  }

  /**
   * Execute a single phase
   */
  async executePhase(
    executionId: string,
    phaseId: string,
    executor: (phase: Phase) => Promise<unknown>
  ): Promise<PhaseResult> {
    const execution = this.executionMap.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const phase = execution.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found in execution`);
    }

    // Check dependencies
    for (const depId of phase.dependsOn) {
      const depResult = execution.results.get(depId);
      if (!depResult || !depResult.success) {
        return {
          phaseId,
          success: false,
          output: null,
          duration: 0,
          attempts: 0,
          error: `Dependency ${depId} not completed successfully`,
        };
      }
    }

    execution.status = 'running';
    execution.currentPhase = phaseId;

    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = phase.retryCount ?? 1;
    let lastError: string | undefined;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        let output: unknown;
        if (phase.parallel && phase.agents.length > 1) {
          // Parallel execution
          const results = await Promise.allSettled(
            phase.agents.map((agentId) => executor({ ...phase, agents: [agentId] }))
          );
          output = results.map((r) => (r.status === 'fulfilled' ? r.value : String(r.reason)));
        } else {
          // Sequential execution
          for (const agentId of phase.agents) {
            output = await executor({ ...phase, agents: [agentId] });
          }
        }

        const result: PhaseResult = {
          phaseId,
          success: true,
          output,
          duration: Date.now() - startTime,
          attempts,
        };

        execution.results.set(phaseId, result);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
        }
      }
    }

    const result: PhaseResult = {
      phaseId,
      success: false,
      output: null,
      duration: Date.now() - startTime,
      attempts,
      error: lastError,
    };

    execution.results.set(phaseId, result);
    return result;
  }

  /**
   * Execute all phases in DAG order
   */
  async executeAll(
    executionId: string,
    executor: (phase: Phase) => Promise<unknown>
  ): Promise<Map<string, PhaseResult>> {
    const execution = this.executionMap.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    execution.status = 'running';
    execution.startedAt = Date.now();

    // Topological sort for execution order
    const sortedPhases = this.topologicalSort(execution.phases);

    for (const phase of sortedPhases) {
      const result = await this.executePhase(executionId, phase.id, executor);
      if (!result.success && !phase.dependsOn.includes(phase.id)) {
        // Continue even on failure unless it's a critical phase
        // For now, we continue
      }
    }

    // Check if all completed
    const allCompleted = sortedPhases.every((p) => {
      const r = execution.results.get(p.id);
      return r?.success;
    });

    execution.status = allCompleted ? 'completed' : 'failed';
    execution.completedAt = Date.now();

    return execution.results;
  }

  /**
   * Topological sort of phases based on dependencies
   */
  private topologicalSort(phases: Phase[]): Phase[] {
    const sorted: Phase[] = [];
    const visited = new Set<string>();
    const phaseMap = new Map(phases.map((p) => [p.id, p]));

    const visit = (phaseId: string) => {
      if (visited.has(phaseId)) return;
      visited.add(phaseId);

      const phase = phaseMap.get(phaseId);
      if (phase) {
        for (const dep of phase.dependsOn) {
          visit(dep);
        }
        sorted.push(phase);
      }
    };

    for (const phase of phases) {
      visit(phase.id);
    }

    return sorted;
  }

  /**
   * Get pending phases for an execution
   */
  getPendingPhases(executionId: string): Phase[] {
    const execution = this.executionMap.get(executionId);
    if (!execution) return [];

    return execution.phases.filter((phase) => {
      const result = execution.results.get(phase.id);
      return !result;
    });
  }

  /**
   * Get completed phases for an execution
   */
  getCompletedPhases(executionId: string): PhaseResult[] {
    const execution = this.executionMap.get(executionId);
    if (!execution) return [];

    return Array.from(execution.results.values()).filter((r) => r.success);
  }

  /**
   * Get phase status
   */
  getPhaseStatus(executionId: string, phaseId: string): PhaseStatus {
    const execution = this.executionMap.get(executionId);
    if (!execution) return 'pending';

    const result = execution.results.get(phaseId);
    if (!result) return 'pending';
    if (result.success) return 'completed';
    return 'failed';
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executionMap.get(executionId);
    if (!execution) return false;
    execution.status = 'skipped';
    execution.completedAt = Date.now();
    return true;
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionMap.clear();
    this.currentExecution = null;
  }
}

// Export singleton
export const phaseWorkflow = new PhaseWorkflow();
