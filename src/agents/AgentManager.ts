import type { AgentId, AgentConfig } from './types';

export class AgentManager {
  private agents: Map<AgentId, AgentConfig> = new Map();
  private agentOutputs: Map<AgentId, string> = new Map();

  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
  }

  getAgent(id: AgentId): AgentConfig | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  executeAgent(agentId: AgentId, _input: string): string {
    const agent = this.agents.get(agentId);
    if (!agent) return `Agent ${agentId} not found`;

    switch (agent.role) {
      case 'planner':
        return this.executePlanner();
      case 'editor':
        return this.executeEditor();
      case 'reviewer':
        return this.executeReviewer();
      default:
        return `Unknown role: ${agent.role}`;
    }
  }

  private executePlanner(): string {
    return `Document Plan:
1. Introduction - What is the topic?
2. Background - History and context
3. Key Concepts - Main ideas
4. Applications - Real-world uses
5. Conclusion - Summary and future`;
  }

  private executeEditor(): string {
    return `\n## Section Content\n\nThis section provides detailed coverage of the topic with relevant examples and explanations.\n`;
  }

  private executeReviewer(): string {
    const checks = [
      'Grammar: OK',
      'Structure: OK',
      'Clarity: OK',
      'Completeness: OK',
    ];
    return `Review Results:\n${checks.join('\n')}\n\nOverall: Content meets quality standards.`;
  }

  getAgentOutput(agentId: AgentId): string | undefined {
    return this.agentOutputs.get(agentId);
  }

  setAgentOutput(agentId: AgentId, output: string): void {
    this.agentOutputs.set(agentId, output);
  }

  clearOutputs(): void {
    this.agentOutputs.clear();
  }
}
