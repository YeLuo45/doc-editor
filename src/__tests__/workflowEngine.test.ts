import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowEngine } from '../engine/WorkflowEngine';
import type { Workflow } from '../agents/types';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it('should reject execution when no workflow is loaded', async () => {
    const result = await engine.execute('test input');
    expect(result.success).toBe(false);
    expect(result.final_output).toContain('No workflow loaded');
  });

  it('should load and execute a workflow successfully', async () => {
    const workflow: Workflow = {
      name: 'test-workflow',
      version: '1.0',
      agents: [
        { id: 'planner', role: 'planner', prompt_template: 'plan', max_turns: 3 },
        { id: 'editor', role: 'editor', prompt_template: 'edit', max_turns: 5 },
      ],
      workflow: [
        { id: 's1', stage: 'plan', agents: ['planner'], parallel: false, output_key: 'plan_out' },
        { id: 's2', stage: 'draft', agents: ['editor'], parallel: false, output_key: 'draft_out' },
      ],
    };

    engine.loadWorkflow(workflow);
    const result = await engine.execute('AI Agent');

    expect(result.success).toBe(true);
    expect(result.stages_completed).toBe(2);
  });

  it('should store outputs for each stage', async () => {
    const workflow: Workflow = {
      name: 'test',
      version: '1.0',
      agents: [
        { id: 'planner', role: 'planner', prompt_template: 'plan', max_turns: 3 },
      ],
      workflow: [
        { id: 's1', stage: 'plan', agents: ['planner'], parallel: false, output_key: 'plan_out' },
      ],
    };

    engine.loadWorkflow(workflow);
    await engine.execute('test');

    const planOut = engine.getOutput('plan_out');
    expect(planOut).toBeDefined();
    expect(planOut).toContain('Document Plan');
  });

  it('should handle multiple agents in parallel', async () => {
    const workflow: Workflow = {
      name: 'parallel-test',
      version: '1.0',
      agents: [
        { id: 'editor1', role: 'editor', prompt_template: 'edit', max_turns: 5 },
        { id: 'editor2', role: 'editor', prompt_template: 'edit', max_turns: 5 },
      ],
      workflow: [
        { id: 's1', stage: 'draft', agents: ['editor1', 'editor2'], parallel: true, output_key: 'parallel_out' },
      ],
    };

    engine.loadWorkflow(workflow);
    const result = await engine.execute('parallel test');

    expect(result.success).toBe(true);
    expect(result.stages_completed).toBe(1);
  });
});
