/**
 * V201 AgentHookSystem - Direction B Agent Forge (Iter 17/30)
 * ruflo: Hook system for agent events (before/after/error)
 */
export type HookType = 'before_invoke' | 'after_invoke' | 'on_error' | 'on_timeout' | 'on_register' | 'on_unregister';

export interface AgentHook {
  id: string;
  agentId: string;
  type: HookType;
  priority: number;
  enabled: boolean;
  fn: (context: any) => any | Promise<any>;
}

export interface HookExecution {
  hookId: string;
  type: HookType;
  agentId: string;
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
}

export interface HookState {
  hooks: Map<string, AgentHook>;
  executions: HookExecution[];
  nextId: number;
}

export function createHookState(): HookState {
  return { hooks: new Map(), executions: [], nextId: 1 };
}

export function registerHook(state: HookState, agentId: string, type: HookType, fn: (ctx: any) => any, priority: number = 5, enabled: boolean = true): { state: HookState; hookId: string } {
  const id = `hook-${state.nextId}`;
  const hook: AgentHook = { id, agentId, type, priority, enabled, fn };
  return { state: { ...state, hooks: new Map(state.hooks).set(id, hook), nextId: state.nextId + 1 }, hookId: id };
}

export function unregisterHook(state: HookState, hookId: string): HookState {
  const hooks = new Map(state.hooks);
  hooks.delete(hookId);
  return { ...state, hooks };
}

export function setHookEnabled(state: HookState, hookId: string, enabled: boolean): HookState {
  const h = state.hooks.get(hookId);
  if (!h) return state;
  return { ...state, hooks: new Map(state.hooks).set(hookId, { ...h, enabled }) };
}

export function getHooksForAgent(state: HookState, agentId: string, type?: HookType): AgentHook[] {
  return Array.from(state.hooks.values())
    .filter(h => h.agentId === agentId && (!type || h.type === type))
    .sort((a, b) => b.priority - a.priority);
}

export function executeHooks(state: HookState, agentId: string, type: HookType, context: any): Promise<HookState> {
  const hooks = getHooksForAgent(state, agentId, type).filter(h => h.enabled);
  return hooks.reduce<Promise<HookState>>(async (p, hook) => {
    const s = await p;
    const start = Date.now();
    try {
      await hook.fn(context);
      const exec: HookExecution = { hookId: hook.id, type, agentId, success: true, duration: Date.now() - start, timestamp: Date.now() };
      return { ...s, executions: [...s.executions, exec].slice(-500) };
    } catch (e) {
      const exec: HookExecution = { hookId: hook.id, type, agentId, success: false, duration: Date.now() - start, timestamp: Date.now(), error: String(e) };
      return { ...s, executions: [...s.executions, exec].slice(-500) };
    }
  }, Promise.resolve(state));
}

export function getExecutionsByHook(state: HookState, hookId: string): HookExecution[] {
  return state.executions.filter(e => e.hookId === hookId);
}

export function getHookReport(state: HookState): { totalHooks: number; executions: number; successRate: number } {
  const success = state.executions.filter(e => e.success).length;
  return { totalHooks: state.hooks.size, executions: state.executions.length, successRate: state.executions.length > 0 ? success / state.executions.length : 0 };
}
