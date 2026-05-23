import { describe, it, expect } from 'vitest';
import { YAMLWorkflowParser } from '../engine/YAMLWorkflowParser';

describe('YAMLWorkflowParser', () => {
  const parser = new YAMLWorkflowParser();

  it('should parse a valid workflow YAML', () => {
    const yaml = `name: test-workflow
version: "1.0"
agents:
  - id: planner
    role: planning
    prompt_template: plan
    max_turns: 3
workflow:
  - stage: plan
    agents: [planner]
    output: plan_out
`;
    const workflow = parser.parseWorkflow(yaml);
    expect(workflow.name).toBe('test-workflow');
    expect(workflow.version).toBeTruthy();
    expect(workflow.agents).toHaveLength(1);
    expect(workflow.agents[0].id).toBe('planner');
    expect(workflow.workflow).toHaveLength(1);
    expect(workflow.workflow[0].stage).toBe('plan');
  });

  it('should validate a correct workflow', () => {
    const workflow = parser.parseWorkflow(parser.getDefaultTemplate());
    const result = parser.validateWorkflow(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect workflow with no stages', () => {
    const workflow = parser.parseWorkflow(`name: test-workflow
version: "1.0"
agents:
  - id: planner
    role: planning
workflow:
`);
    const result = parser.validateWorkflow(workflow);
    // Empty workflow array should fail validation
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should get default template', () => {
    const template = parser.getDefaultTemplate();
    expect(template).toContain('doc-editor-multi-agent');
    expect(template).toContain('planner');
    expect(template).toContain('editor');
    expect(template).toContain('reviewer');
  });
});
