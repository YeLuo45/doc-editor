import type {
  AgentId,
  AgentManifest,
  AgentRegistration,
  SwarmConfig,
  AgentRole,
} from './types';

/**
 * AgentRegistry - register/enumerate/discover agents
 * Provides service discovery for the swarm
 */
export class AgentRegistry {
  private registry: Map<AgentId, AgentRegistration> = new Map();
  private capabilityIndex: Map<string, Set<AgentId>> = new Map();
  private roleIndex: Map<AgentRole, Set<AgentId>> = new Map();

  private readonly config: SwarmConfig = {
    topology: 'hierarchical',
    maxAgents: 100,
    communicationTimeout: 30000,
    heartbeatInterval: 5000,
    reconnectAttempts: 3,
  };

  constructor(config?: Partial<SwarmConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Register an agent with its manifest
   */
  register(manifest: AgentManifest): boolean {
    if (this.registry.size >= this.config.maxAgents) {
      throw new Error(`Max agents (${this.config.maxAgents}) reached`);
    }

    if (this.registry.has(manifest.id)) {
      throw new Error(`Agent ${manifest.id} already registered`);
    }

    const registration: AgentRegistration = {
      manifest,
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      status: 'active',
    };

    this.registry.set(manifest.id, registration);
    this.indexByCapability(manifest);
    this.indexByRole(manifest);
    return true;
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: AgentId): boolean {
    const reg = this.registry.get(agentId);
    if (!reg) return false;

    // Remove from indexes
    for (const cap of reg.manifest.capabilities) {
      const agents = this.capabilityIndex.get(cap);
      if (agents) {
        agents.delete(agentId);
        if (agents.size === 0) this.capabilityIndex.delete(cap);
      }
    }

    const roleAgents = this.roleIndex.get(reg.manifest.role);
    if (roleAgents) {
      roleAgents.delete(agentId);
      if (roleAgents.size === 0) this.roleIndex.delete(reg.manifest.role);
    }

    return this.registry.delete(agentId);
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: AgentId, status: AgentRegistration['status']): boolean {
    const reg = this.registry.get(agentId);
    if (!reg) return false;
    reg.status = status;
    reg.lastSeen = Date.now();
    return true;
  }

  /**
   * Touch agent (heartbeat)
   */
  touch(agentId: AgentId): boolean {
    const reg = this.registry.get(agentId);
    if (!reg) return false;
    reg.lastSeen = Date.now();
    if (reg.status === 'inactive') {
      reg.status = 'active';
    }
    return true;
  }

  /**
   * Get agent manifest
   */
  get(agentId: AgentId): AgentManifest | undefined {
    return this.registry.get(agentId)?.manifest;
  }

  /**
   * Get full registration
   */
  getRegistration(agentId: AgentId): AgentRegistration | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAll(): AgentManifest[] {
    return Array.from(this.registry.values()).map((r) => r.manifest);
  }

  /**
   * Get all registrations
   */
  getAllRegistrations(): AgentRegistration[] {
    return Array.from(this.registry.values());
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: string): AgentManifest[] {
    const agentIds = this.capabilityIndex.get(capability);
    if (!agentIds) return [];
    return Array.from(agentIds)
      .map((id) => this.registry.get(id)?.manifest)
      .filter((m): m is AgentManifest => m !== undefined);
  }

  /**
   * Find agents by role
   */
  findByRole(role: AgentRole): AgentManifest[] {
    const agentIds = this.roleIndex.get(role);
    if (!agentIds) return [];
    return Array.from(agentIds)
      .map((id) => this.registry.get(id)?.manifest)
      .filter((m): m is AgentManifest => m !== undefined);
  }

  /**
   * Find agents by capabilities (AND logic)
   */
  findByCapabilities(capabilities: string[]): AgentManifest[] {
    if (capabilities.length === 0) return this.getAll();

    let result: Set<AgentId> | null = null;
    for (const cap of capabilities) {
      const agents = this.capabilityIndex.get(cap);
      if (!agents) return [];
      if (result === null) {
        result = new Set(agents);
      } else {
        // AND intersection
        for (const id of Array.from(result)) {
          if (!agents.has(id)) result.delete(id);
        }
      }
    }
    if (!result) return [];
    return Array.from(result)
      .map((id) => this.registry.get(id)?.manifest)
      .filter((m): m is AgentManifest => m !== undefined);
  }

  /**
   * Get active agents
   */
  getActive(): AgentManifest[] {
    return Array.from(this.registry.values())
      .filter((r) => r.status === 'active')
      .map((r) => r.manifest);
  }

  /**
   * Get agents not seen recently
   */
  getStale(maxAgeMs: number = 60000): AgentManifest[] {
    const cutoff = Date.now() - maxAgeMs;
    return Array.from(this.registry.values())
      .filter((r) => r.lastSeen < cutoff)
      .map((r) => r.manifest);
  }

  /**
   * Get agent count
   */
  size(): number {
    return this.registry.size;
  }

  /**
   * Get active count
   */
  getActiveCount(): number {
    let count = 0;
    for (const reg of this.registry.values()) {
      if (reg.status === 'active') count++;
    }
    return count;
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): string[] {
    return Array.from(this.capabilityIndex.keys());
  }

  /**
   * Check if agent exists
   */
  has(agentId: AgentId): boolean {
    return this.registry.has(agentId);
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.registry.clear();
    this.capabilityIndex.clear();
    this.roleIndex.clear();
  }

  // Index helpers
  private indexByCapability(manifest: AgentManifest): void {
    for (const cap of manifest.capabilities) {
      let agents = this.capabilityIndex.get(cap);
      if (!agents) {
        agents = new Set();
        this.capabilityIndex.set(cap, agents);
      }
      agents.add(manifest.id);
    }
  }

  private indexByRole(manifest: AgentManifest): void {
    let agents = this.roleIndex.get(manifest.role);
    if (!agents) {
      agents = new Set();
      this.roleIndex.set(manifest.role, agents);
    }
    agents.add(manifest.id);
  }
}

// Export singleton
export const agentRegistry = new AgentRegistry();
