import type { Workflow, WorkflowResult } from '../agents/types';
import { AgentManager } from '../agents/AgentManager';
import { MessageBus } from './MessageBus';

export class WorkflowEngine {
  private workflow: Workflow | null = null;
  private agentManager: AgentManager;
  private messageBus: MessageBus;
  private outputs: Map<string, string> = new Map();

  constructor() {
    this.messageBus = new MessageBus();
    this.agentManager = new AgentManager();
  }

  loadWorkflow(workflow: Workflow): void {
    this.workflow = workflow;
    this.outputs.clear();
    workflow.agents.forEach(agent => {
      this.agentManager.registerAgent(agent);
    });
  }

  async execute(initialInput: string): Promise<WorkflowResult> {
    if (!this.workflow) {
      return { success: false, stages_completed: 0, final_output: 'No workflow loaded' };
    }

    let stagesCompleted = 0;
    const outputs: Map<string, string> = new Map();
    let currentInput = initialInput;

    for (const stage of this.workflow.workflow) {
      const stageOutput: string[] = [];
      
      for (const agentId of stage.agents) {
        const agentOutput = this.agentManager.executeAgent(agentId, currentInput);
        this.agentManager.setAgentOutput(agentId, agentOutput);
        stageOutput.push(agentOutput);
        
        this.messageBus.publish({
          id: `msg-${Date.now()}-${Math.random()}`,
          from: agentId,
          to: 'broadcast',
          type: 'status',
          payload: { stage: stage.stage, output: agentOutput },
          timestamp: Date.now(),
        });
      }

      const combined = stageOutput.join('\n---\n');
      outputs.set(stage.output_key, combined);
      currentInput = combined;
      stagesCompleted++;
    }

    this.outputs = outputs;
    const finalOutput = outputs.get('final_document') || outputs.get('reviewed_sections') || currentInput;

    return {
      success: true,
      stages_completed: stagesCompleted,
      final_output: finalOutput,
    };
  }

  getOutput(key: string): string | undefined {
    return this.outputs.get(key);
  }

  getAllOutputs(): Map<string, string> {
    return this.outputs;
  }

  getMessageBus(): MessageBus {
    return this.messageBus;
  }

  getAgentManager(): AgentManager {
    return this.agentManager;
  }
}
