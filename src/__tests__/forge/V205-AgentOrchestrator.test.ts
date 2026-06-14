import { describe, it, expect } from 'vitest';
import {
  createOrchestrationState, addTask, removeTask, setStrategy, topologicalSort,
  planExecution, markTaskRunning, markTaskCompleted, markTaskFailed, getReadyTasks, getOrchestratorReport,
} from '../../forge/V205-AgentOrchestrator';

describe('V205 AgentOrchestrator', () => {
  it('should create empty state', () => {
    const s = createOrchestrationState();
    expect(s.tasks.size).toBe(0);
  });

  it('should add task', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 't1', agentId: 'a', input: {}, dependsOn: [] });
    expect(s.tasks.size).toBe(1);
  });

  it('should remove task', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 't1', agentId: 'a', input: {}, dependsOn: [] });
    s = removeTask(s, 't1');
    expect(s.tasks.size).toBe(0);
  });

  it('should set strategy', () => {
    let s = createOrchestrationState();
    s = setStrategy(s, 'parallel');
    expect(s.strategy).toBe('parallel');
  });

  it('should do topological sort with deps', () => {
    const tasks = [
      { id: 'a', agentId: 'a', input: {}, dependsOn: [], status: 'pending' as const },
      { id: 'b', agentId: 'b', input: {}, dependsOn: ['a'], status: 'pending' as const },
      { id: 'c', agentId: 'c', input: {}, dependsOn: ['a'], status: 'pending' as const },
    ];
    const sorted = topologicalSort(tasks);
    expect(sorted[0].id).toBe('a');
    expect(sorted[1].id).not.toBe('a');
  });

  it('should plan execution', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 'a', agentId: 'a', input: {}, dependsOn: [] });
    s = addTask(s, { id: 'b', agentId: 'b', input: {}, dependsOn: ['a'] });
    s = planExecution(s);
    expect(s.executionOrder).toEqual(['a', 'b']);
  });

  it('should mark task running/completed/failed', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 't', agentId: 'a', input: {}, dependsOn: [] });
    s = markTaskRunning(s, 't');
    expect(s.tasks.get('t')!.status).toBe('running');
    s = markTaskCompleted(s, 't', { ok: true });
    expect(s.tasks.get('t')!.status).toBe('completed');
    expect(s.completed).toBe(1);
  });

  it('should mark task failed', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 't', agentId: 'a', input: {}, dependsOn: [] });
    s = markTaskFailed(s, 't', 'oops');
    expect(s.tasks.get('t')!.status).toBe('failed');
    expect(s.failed).toBe(1);
  });

  it('should get ready tasks (deps satisfied)', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 'a', agentId: 'a', input: {}, dependsOn: [] });
    s = addTask(s, { id: 'b', agentId: 'b', input: {}, dependsOn: ['a'] });
    s = planExecution(s);
    let ready = getReadyTasks(s);
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe('a');
    s = markTaskCompleted(s, 'a', {});
    ready = getReadyTasks(s);
    expect(ready).toHaveLength(1);
    expect(ready[0].id).toBe('b');
  });

  it('should produce report', () => {
    let s = createOrchestrationState();
    s = addTask(s, { id: 'a', agentId: 'a', input: {}, dependsOn: [] });
    const r = getOrchestratorReport(s);
    expect(r.total).toBe(1);
  });
});
