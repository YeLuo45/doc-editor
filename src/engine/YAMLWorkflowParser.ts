import type { Workflow, WorkflowNode } from '../agents/types';

const WORKFLOW_TEMPLATE = `name: doc-editor-multi-agent
version: "1.0"
agents:
  - id: planner
    role: planning
    prompt_template: plan_document
    max_turns: 3
  - id: editor
    role: editing
    prompt_template: edit_content
    max_turns: 5
  - id: reviewer
    role: reviewing
    prompt_template: review_output
    max_turns: 2
workflow:
  - stage: plan
    agents: [planner]
    output: document_plan
  - stage: draft
    agents: [editor]
    parallel: false
    output: draft_sections
  - stage: review
    agents: [reviewer]
    output: reviewed_sections
  - stage: integrate
    agents: [editor]
    output: final_document
`;

function parseYAML(yaml: string): any {
  const lines = yaml.split('\n');
  const result: any = {};
  let inAgents = false;
  let inWorkflow = false;
  let agents: any[] = [];
  let workflow: any[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed === 'agents:') { inAgents = true; inWorkflow = false; continue; }
    if (trimmed === 'workflow:') { inWorkflow = true; inAgents = false; continue; }
    
    if (inAgents && trimmed.startsWith('- id:')) {
      const agent: any = { id: trimmed.replace('- id:', '').trim() };
      agents.push(agent);
    } else if (inAgents && trimmed.startsWith('role:')) {
      if (agents.length) agents[agents.length - 1].role = trimmed.replace('role:', '').trim();
    } else if (inAgents && trimmed.startsWith('prompt_template:')) {
      if (agents.length) agents[agents.length - 1].prompt_template = trimmed.replace('prompt_template:', '').trim();
    } else if (inAgents && trimmed.startsWith('max_turns:')) {
      if (agents.length) agents[agents.length - 1].max_turns = parseInt(trimmed.replace('max_turns:', '').trim());
    } else if (inWorkflow && trimmed.startsWith('- stage:')) {
      const stageObj: any = { agents: [] };
      stageObj.stage = trimmed.replace('- stage:', '').trim();
      workflow.push(stageObj);
    } else if (inWorkflow && trimmed.startsWith('agents:')) {
      // agents array follows
    } else if (inWorkflow && trimmed.startsWith('- ')) {
      if (workflow.length) workflow[workflow.length - 1].agents.push(trimmed.replace('- ', '').trim().replace('[', '').replace(']', ''));
    } else if (inWorkflow && trimmed.startsWith('parallel:')) {
      if (workflow.length) workflow[workflow.length - 1].parallel = trimmed.replace('parallel:', '').trim() === 'true';
    } else if (inWorkflow && trimmed.startsWith('output:')) {
      if (workflow.length) workflow[workflow.length - 1].output = trimmed.replace('output:', '').trim();
    } else if (trimmed.startsWith('name:')) {
      result.name = trimmed.replace('name:', '').trim();
    } else if (trimmed.startsWith('version:')) {
      result.version = trimmed.replace('version:', '').trim();
    }
  }

  result.agents = agents;
  result.workflow = workflow.map((w, i) => ({
    id: `stage-${i}`,
    stage: w.stage,
    agents: w.agents,
    parallel: w.parallel || false,
    output_key: w.output || `output_${i}`,
  }));
  return result;
}

export class YAMLWorkflowParser {
  parseWorkflow(yamlContent: string): Workflow {
    const parsed = parseYAML(yamlContent);
    return {
      name: parsed.name || 'unnamed-workflow',
      version: parsed.version || '1.0',
      agents: (parsed.agents || []).map((a: any) => ({
        id: a.id,
        role: a.role,
        prompt_template: a.prompt_template || 'default',
        max_turns: a.max_turns || 3,
      })),
      workflow: parsed.workflow || [],
    };
  }

  getDefaultTemplate(): string {
    return WORKFLOW_TEMPLATE;
  }

  getNodes(workflow: Workflow): WorkflowNode[] {
    return workflow.workflow;
  }

  getAgentIds(workflow: Workflow): string[] {
    return workflow.agents.map(a => a.id);
  }

  validateWorkflow(workflow: Workflow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!workflow.name) errors.push('Workflow name is required');
    if (!workflow.workflow || workflow.workflow.length === 0) {
      errors.push('At least one workflow stage is required');
    }
    const agentIds = new Set(workflow.agents.map(a => a.id));
    workflow.workflow.forEach((stage) => {
      stage.agents.forEach(agentId => {
        if (!agentIds.has(agentId)) {
          errors.push(`Stage "${stage.stage}" references unknown agent "${agentId}"`);
        }
      });
    });
    return { valid: errors.length === 0, errors };
  }
}
