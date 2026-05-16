// Agent Registry - Central registry for all agents

import { AgentType } from './types';
import { EditorAgent, editorAgent } from './editor';
import { ReviewerAgent, reviewerAgent } from './reviewer';
import { ResearcherAgent, researcherAgent } from './researcher';
import { ManagerAgent, managerAgent } from './manager';

export interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  instance: EditorAgent | ReviewerAgent | ResearcherAgent | ManagerAgent;
}

class AgentRegistry {
  private agents: Map<AgentType, AgentInfo>;
  private static instance: AgentRegistry;

  private constructor() {
    this.agents = new Map();
    this.registerAgents();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private registerAgents(): void {
    this.agents.set(AgentType.EDITOR, {
      type: AgentType.EDITOR,
      name: 'Editor Agent',
      description: 'Content editing, formatting, and document manipulation',
      instance: editorAgent,
    });

    this.agents.set(AgentType.REVIEWER, {
      type: AgentType.REVIEWER,
      name: 'Reviewer Agent',
      description: 'Quality review, grammar checking, and content validation',
      instance: reviewerAgent,
    });

    this.agents.set(AgentType.RESEARCHER, {
      type: AgentType.RESEARCHER,
      name: 'Researcher Agent',
      description: 'Information gathering, web search, and reference management',
      instance: researcherAgent,
    });

    this.agents.set(AgentType.MANAGER, {
      type: AgentType.MANAGER,
      name: 'Manager Agent',
      description: 'Orchestration, state machine, and workflow coordination',
      instance: managerAgent,
    });
  }

  getAgent(type: AgentType): AgentInfo | undefined {
    return this.agents.get(type);
  }

  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  getAgentTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  isAgentActive(type: AgentType): boolean {
    const info = this.agents.get(type);
    return info?.instance.isActive() ?? false;
  }
}

const agentRegistry = AgentRegistry.getInstance();

export { AgentRegistry, agentRegistry };
export { ManagerAgent, managerAgent };