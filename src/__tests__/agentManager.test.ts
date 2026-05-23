import { describe, it, expect, beforeEach } from 'vitest';
import { AgentManager } from '../agents/AgentManager';

describe('AgentManager', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager();
  });

  it('should register and retrieve agents', () => {
    agentManager.registerAgent({ id: 'test-agent', role: 'planner', prompt_template: 'test', max_turns: 3 });
    const agent = agentManager.getAgent('test-agent');
    expect(agent).toBeDefined();
    expect(agent!.id).toBe('test-agent');
    expect(agent!.role).toBe('planner');
  });

  it('should return undefined for non-existent agent', () => {
    const agent = agentManager.getAgent('non-existent');
    expect(agent).toBeUndefined();
  });

  it('should execute planner agent and return outline', () => {
    agentManager.registerAgent({ id: 'planner', role: 'planner', prompt_template: 'plan', max_turns: 3 });
    const output = agentManager.executeAgent('planner', 'AI Agents');
    expect(output).toContain('Document Plan');
    expect(output).toContain('Introduction');
  });

  it('should execute editor agent and produce content', () => {
    agentManager.registerAgent({ id: 'editor', role: 'editor', prompt_template: 'edit', max_turns: 5 });
    const output = agentManager.executeAgent('editor', 'Some input');
    expect(output).toContain('##');
  });

  it('should execute reviewer agent and return review', () => {
    agentManager.registerAgent({ id: 'reviewer', role: 'reviewer', prompt_template: 'review', max_turns: 2 });
    const output = agentManager.executeAgent('reviewer', 'Some content to review');
    expect(output).toContain('Review Results');
    expect(output).toContain('Grammar');
  });
});
