/**
 * AgentRegistry.ts - Registry for Agent lookup by type and capability
 * Provides centralized agent management and discovery
 */

import { AgentTask, TaskType } from './AgentTask';
import { AgentResult } from './AgentResult';

export interface BaseAgent {
  id: string;
  name: string;
  type: TaskType;
  capabilities: string[];
  process(task: AgentTask): Promise<AgentResult>;
  getCapabilities(): string[];
}

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private typeIndex: Map<TaskType, BaseAgent[]> = new Map();
  private capabilityIndex: Map<string, BaseAgent[]> = new Map();

  register(agent: BaseAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} is already registered`);
    }

    this.agents.set(agent.id, agent);

    const types = [agent.type];
    for (const type of types) {
      const existing = this.typeIndex.get(type) || [];
      this.typeIndex.set(type, [...existing, agent]);
    }

    for (const cap of agent.capabilities) {
      const existing = this.capabilityIndex.get(cap) || [];
      if (!this.capabilityIndex.has(cap)) {
        this.capabilityIndex.set(cap, []);
      }
      this.capabilityIndex.get(cap)!.push(agent);
    }
  }

  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    this.agents.delete(agentId);

    for (const type of [agent.type]) {
      const list = this.typeIndex.get(type) || [];
      this.typeIndex.set(type, list.filter((a) => a.id !== agentId));
    }

    for (const cap of agent.capabilities) {
      const list = this.capabilityIndex.get(cap) || [];
      const filtered = list.filter((a) => a.id !== agentId);
      if (filtered.length > 0) {
        this.capabilityIndex.set(cap, filtered);
      } else {
        this.capabilityIndex.delete(cap);
      }
    }

    return true;
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAgentsByType(type: TaskType): BaseAgent[] {
    return this.typeIndex.get(type) || [];
  }

  getAgentsByCapability(capability: string): BaseAgent[] {
    return this.capabilityIndex.get(capability) || [];
  }

  findAgentForTask(task: AgentTask): BaseAgent | undefined {
    const agents = this.getAgentsByType(task.type);
    if (agents.length === 0) return undefined;
    return agents[0];
  }

  findAgentsWithAllCapabilities(capabilities: string[]): BaseAgent[] {
    if (capabilities.length === 0) return [];

    const firstCapAgents = new Set(this.getAgentsByCapability(capabilities[0]).map((a) => a.id));

    for (const cap of capabilities.slice(1)) {
      const capAgents = new Set(this.getAgentsByCapability(cap).map((a) => a.id));
      for (const id of firstCapAgents) {
        if (!capAgents.has(id)) {
          firstCapAgents.delete(id);
        }
      }
    }

    return Array.from(firstCapAgents)
      .map((id) => this.agents.get(id))
      .filter((a): a is BaseAgent => a !== undefined);
  }

  listAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  listAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  clear(): void {
    this.agents.clear();
    this.typeIndex.clear();
    this.capabilityIndex.clear();
  }
}

export const defaultRegistry = new AgentRegistry();