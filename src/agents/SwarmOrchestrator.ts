import type {
  AgentId,
  SwarmTopology,
  SwarmMetrics,
  OrchestratorConfig,
  OrchestratorEvent,
  Phase,
  PhaseResult,
} from './types';
import { MessageBus } from './MessageBus';
import { AgentRegistry } from './AgentRegistry';

/**
 * SwarmOrchestrator - hierarchical + mesh topology support
 * Coordinates multiple agents in a swarm configuration
 */
export class SwarmOrchestrator {
  private messageBus: MessageBus;
  private agentRegistry: AgentRegistry;
  private _topology: SwarmTopology = 'hierarchical';
  private config: OrchestratorConfig;
  private eventHandlers: Map<string, ((event: OrchestratorEvent) => void)[]> = new Map();
  private metrics: SwarmMetrics = {
    totalAgents: 0,
    activeAgents: 0,
    messagesProcessed: 0,
    averageLatency: 0,
    phasesCompleted: 0,
  };
  private leaderId: AgentId | null = null;
  private meshPeers: Set<AgentId> = new Set();
  private executionHistory: Map<string, Map<string, PhaseResult>> = new Map();

  constructor(
    messageBus: MessageBus,
    agentRegistry: AgentRegistry,
    config?: Partial<OrchestratorConfig>
  ) {
    this.messageBus = messageBus;
    this.agentRegistry = agentRegistry;
    this._topology = config?.topology ?? 'hierarchical';
    this.config = {
      topology: this._topology,
      phaseWorkflow: config?.phaseWorkflow ?? true,
      federationEnabled: config?.federationEnabled ?? false,
      autoScale: config?.autoScale ?? false,
      maxConcurrentPhases: config?.maxConcurrentPhases ?? 3,
    };

    this.setupMessageHandling();
  }

  public get topology(): SwarmTopology {
    return this._topology;
  }

  /**
   * Setup automatic message handling
   */
  private setupMessageHandling(): void {
    // Listen for agent status updates
    this.messageBus.subscribe('__swarm-orchestrator__', 'broadcast', (msg: any) => {
      if (msg.type === 'status') {
        this.handleStatusUpdate(msg);
      }
    });

    // Listen for phase completions
    this.messageBus.subscribe('__swarm-orchestrator__', 'phase', (msg: any) => {
      if (msg.type === 'response') {
        this.metrics.phasesCompleted++;
      }
    });
  }

  private handleStatusUpdate(msg: import('./types').AgentMessage): void {
    const payload = msg.payload as { agentId: AgentId; status: string };
    if (payload?.agentId && payload?.status) {
      this.agentRegistry.updateStatus(
        payload.agentId,
        payload.status as 'active' | 'inactive' | 'busy'
      );
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): SwarmMetrics {
    const regs = this.agentRegistry.getAllRegistrations();
    this.metrics.totalAgents = regs.length;
    this.metrics.activeAgents = regs.filter((r) => r.status === 'active').length;
    return { ...this.metrics };
  }

  /**
   * Set the leader agent (hierarchical topology)
   */
  setLeader(agentId: AgentId): boolean {
    if (!this.agentRegistry.has(agentId)) {
      return false;
    }
    this.leaderId = agentId;
    return true;
  }

  /**
   * Get the leader agent
   */
  getLeader(): AgentId | null {
    return this.leaderId;
  }

  /**
   * Add mesh peer (mesh topology)
   */
  addPeer(agentId: AgentId): boolean {
    if (!this.agentRegistry.has(agentId)) {
      return false;
    }
    this.meshPeers.add(agentId);
    return true;
  }

  /**
   * Remove mesh peer
   */
  removePeer(agentId: AgentId): boolean {
    return this.meshPeers.delete(agentId);
  }

  /**
   * Get mesh peers
   */
  getPeers(): AgentId[] {
    return Array.from(this.meshPeers);
  }

  /**
   * Get topology
   */
  getTopology(): SwarmTopology {
    return this.topology;
  }

  /**
   * Set topology
   */
  setTopology(topology: SwarmTopology): void {
    this._topology = topology;
  }

  /**
   * Get configuration
   */
  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  /**
   * Dispatch task to appropriate agent based on topology
   */
  async dispatchTask(task: { type: string; payload: unknown; targetAgent?: AgentId }): Promise<void> {
    const { type, payload, targetAgent } = task;

    if (this.topology === 'hierarchical' && this.leaderId) {
      // Route through leader
      await this.messageBus.send(this.leaderId, {
        id: `task_${Date.now()}`,
        from: 'orchestrator',
        to: this.leaderId,
        type: 'request',
        payload: { type, payload },
        timestamp: Date.now(),
      });
    } else if (this.topology === 'mesh') {
      // Broadcast to mesh peers
      if (targetAgent) {
        await this.messageBus.send(targetAgent, {
          id: `task_${Date.now()}`,
          from: 'orchestrator',
          to: targetAgent,
          type: 'request',
          payload: { type, payload },
          timestamp: Date.now(),
        });
      } else {
        await this.messageBus.broadcast({
          id: `task_${Date.now()}`,
          from: 'orchestrator',
          to: 'broadcast',
          type: 'request',
          payload: { type, payload },
          timestamp: Date.now(),
        });
      }
    }
    this.metrics.messagesProcessed++;
  }

  /**
   * Execute phases in DAG order
   */
  async executePhases(phases: Phase[]): Promise<Map<string, PhaseResult>> {
    const results = new Map<string, PhaseResult>();
    const completed = new Set<string>();

    // Build dependency graph
    const dependents = new Map<string, string[]>();
    for (const phase of phases) {
      for (const dep of phase.dependsOn) {
        let list = dependents.get(dep);
        if (!list) {
          list = [];
          dependents.set(dep, list);
        }
        list.push(phase.id);
      }
    }

    const pending = [...phases];
    const running: Promise<void>[] = [];
    const maxConcurrent = this.config.maxConcurrentPhases;

    while (pending.length > 0 || running.length > 0) {
      // Start pending phases whose dependencies are met
      while (pending.length > 0 && running.length < maxConcurrent) {
        const phase = pending[0];
        const depsMet = phase.dependsOn.every((d) => completed.has(d));
        if (depsMet) {
          pending.shift();
          const promise = this.executePhase(phase, results, completed);
          running.push(promise);
        } else {
          // No more phases can start, break
          break;
        }
      }

      // Wait for at least one to complete
      if (running.length > 0) {
        await Promise.race(running);
        // Remove completed promises
        for (let i = running.length - 1; i >= 0; i--) {
          const settled = await Promise.race([
            Promise.resolve(null),
            running[i].then(() => 'done'),
          ]);
          if (settled === 'done') {
            running.splice(i, 1);
          }
        }
      }
    }

    // Wait for remaining
    await Promise.allSettled(running);

    return results;
  }

  private async executePhase(
    phase: Phase,
    results: Map<string, PhaseResult>,
    completed: Set<string>
  ): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = phase.retryCount ?? 1;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        // Dispatch to agents
        const dispatchPromises = phase.agents.map((agentId) => {
          if (phase.parallel) {
            return this.messageBus.send(agentId, {
              id: `phase_${phase.id}_${Date.now()}`,
              from: 'orchestrator',
              to: agentId,
              type: 'request',
              payload: { phase: phase.id, task: phase.name },
              timestamp: Date.now(),
            });
          } else {
            return this.messageBus.send(agentId, {
              id: `phase_${phase.id}_${Date.now()}`,
              from: 'orchestrator',
              to: agentId,
              type: 'request',
              payload: { phase: phase.id, task: phase.name },
              timestamp: Date.now(),
            });
          }
        });

        await Promise.all(dispatchPromises);

        const result: PhaseResult = {
          phaseId: phase.id,
          success: true,
          output: { agents: phase.agents },
          duration: Date.now() - startTime,
          attempts,
        };

        results.set(phase.id, result);
        completed.add(phase.id);

        this.emit({
          type: 'phase_complete',
          timestamp: Date.now(),
          data: { phaseId: phase.id, result },
        });

        return;
      } catch (err) {
        if (attempts >= maxAttempts) {
          const result: PhaseResult = {
            phaseId: phase.id,
            success: false,
            output: null,
            duration: Date.now() - startTime,
            attempts,
            error: err instanceof Error ? err.message : String(err),
          };
          results.set(phase.id, result);
          completed.add(phase.id);
          return;
        }
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Emit orchestrator event
   */
  emit(event: OrchestratorEvent): void {
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (err) {
        console.error('Event handler error:', err);
      }
    }
  }

  /**
   * Subscribe to orchestrator events
   */
  on(eventType: string, handler: (event: OrchestratorEvent) => void): () => void {
    let handlers = this.eventHandlers.get(eventType);
    if (!handlers) {
      handlers = [];
      this.eventHandlers.set(eventType, handlers);
    }
    handlers.push(handler);
    return () => {
      const idx = handlers?.indexOf(handler);
      if (idx !== undefined && idx >= 0) {
        handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Get execution history
   */
  getExecutionHistory(workflowId: string): Map<string, PhaseResult> | undefined {
    return this.executionHistory.get(workflowId);
  }

  /**
   * Record execution
   */
  recordExecution(workflowId: string, results: Map<string, PhaseResult>): void {
    this.executionHistory.set(workflowId, new Map(results));
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalAgents: 0,
      activeAgents: 0,
      messagesProcessed: 0,
      averageLatency: 0,
      phasesCompleted: 0,
    };
  }
}

// Export singleton
export const swarmOrchestrator = new SwarmOrchestrator(new MessageBus(), new AgentRegistry());
