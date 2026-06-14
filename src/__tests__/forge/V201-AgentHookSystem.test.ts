import { describe, it, expect } from 'vitest';
import {
  createHookState, registerHook, unregisterHook, setHookEnabled,
  getHooksForAgent, executeHooks, getExecutionsByHook, getHookReport,
} from '../../forge/V201-AgentHookSystem';

describe('V201 AgentHookSystem', () => {
  it('should create empty state', () => {
    const s = createHookState();
    expect(s.hooks.size).toBe(0);
  });

  it('should register hook', () => {
    const s = createHookState();
    const r = registerHook(s, 'agent1', 'before_invoke', () => {});
    expect(r.state.hooks.size).toBe(1);
    expect(r.hookId).toMatch(/^hook-/);
  });

  it('should unregister hook', () => {
    let s = createHookState();
    const r = registerHook(s, 'a', 'before_invoke', () => {});
    s = unregisterHook(r.state, r.hookId);
    expect(s.hooks.size).toBe(0);
  });

  it('should set hook enabled', () => {
    let s = createHookState();
    const r = registerHook(s, 'a', 'before_invoke', () => {}, 5, true);
    s = setHookEnabled(r.state, r.hookId, false);
    expect(s.hooks.get(r.hookId)!.enabled).toBe(false);
  });

  it('should get hooks for agent', () => {
    let s = createHookState();
    s = registerHook(s, 'a', 'before_invoke', () => {}).state;
    s = registerHook(s, 'a', 'after_invoke', () => {}).state;
    s = registerHook(s, 'b', 'before_invoke', () => {}).state;
    expect(getHooksForAgent(s, 'a')).toHaveLength(2);
  });

  it('should sort hooks by priority', () => {
    let s = createHookState();
    s = registerHook(s, 'a', 'before_invoke', () => {}, 1).state;
    s = registerHook(s, 'a', 'before_invoke', () => {}, 9).state;
    s = registerHook(s, 'a', 'before_invoke', () => {}, 5).state;
    const hooks = getHooksForAgent(s, 'a');
    expect(hooks[0].priority).toBe(9);
  });

  it('should filter by type', () => {
    let s = createHookState();
    s = registerHook(s, 'a', 'before_invoke', () => {}).state;
    s = registerHook(s, 'a', 'after_invoke', () => {}).state;
    expect(getHooksForAgent(s, 'a', 'before_invoke')).toHaveLength(1);
  });

  it('should execute hooks', async () => {
    let s = createHookState();
    s = registerHook(s, 'a', 'before_invoke', () => {}).state;
    s = registerHook(s, 'a', 'after_invoke', () => {}).state;
    const newState = await executeHooks(s, 'a', 'before_invoke', {});
    expect(newState.executions).toHaveLength(1);
  });

  it('should record hook errors', async () => {
    let s = createHookState();
    s = registerHook(s, 'a', 'before_invoke', () => { throw new Error('boom'); }).state;
    const newState = await executeHooks(s, 'a', 'before_invoke', {});
    expect(newState.executions[0].success).toBe(false);
    expect(newState.executions[0].error).toContain('boom');
  });

  it('should get executions by hook', async () => {
    let s = createHookState();
    const r = registerHook(s, 'a', 'before_invoke', () => {});
    s = r.state;
    s = await executeHooks(s, 'a', 'before_invoke', {});
    const execs = getExecutionsByHook(s, r.hookId);
    expect(execs).toHaveLength(1);
  });

  it('should produce report', async () => {
    let s = createHookState();
    s = registerHook(s, 'a', 'before_invoke', () => {}).state;
    s = await executeHooks(s, 'a', 'before_invoke', {});
    const r = getHookReport(s);
    expect(r.totalHooks).toBe(1);
    expect(r.successRate).toBe(1);
  });
});
