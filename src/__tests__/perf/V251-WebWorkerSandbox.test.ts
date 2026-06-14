import { describe, it, expect } from 'vitest';
import {
  createWorkerSandboxState, submitTask, startTask, completeTask, failTask,
  getTask, getTasksByStatus, getAvgTaskDuration, clearWorkerTasks, getWorkerSandboxReport,
} from '../../perf/V251-WebWorkerSandbox';

describe('V251 WebWorkerSandbox', () => {
  it('should create empty state', () => {
    const s = createWorkerSandboxState();
    expect(s.tasks.size).toBe(0);
  });

  it('should submit task', () => {
    const s = createWorkerSandboxState();
    const r = submitTask(s, 'diff', { a: 1, b: 2 });
    expect(r.state.tasks.size).toBe(1);
  });

  it('should start task', () => {
    let s = createWorkerSandboxState();
    const r = submitTask(s, 'analyze', {});
    s = startTask(r.state, r.taskId);
    expect(getTask(s, r.taskId)!.status).toBe('running');
  });

  it('should complete task', () => {
    let s = createWorkerSandboxState();
    const r = submitTask(s, 'analyze', {});
    s = startTask(r.state, r.taskId);
    s = completeTask(s, r.taskId, { result: 42 });
    expect(getTask(s, r.taskId)!.status).toBe('completed');
    expect(getTask(s, r.taskId)!.result).toEqual({ result: 42 });
  });

  it('should fail task', () => {
    let s = createWorkerSandboxState();
    const r = submitTask(s, 'analyze', {});
    s = failTask(r.state, r.taskId, 'oom');
    expect(getTask(s, r.taskId)!.status).toBe('failed');
  });

  it('should get tasks by status', () => {
    let s = createWorkerSandboxState();
    s = submitTask(s, 'a', {}).state;
    const r = submitTask(s, 'b', {});
    s = completeTask(r.state, r.taskId, {});
    expect(getTasksByStatus(s, 'completed')).toHaveLength(1);
    expect(getTasksByStatus(s, 'queued')).toHaveLength(1);
  });

  it('should get avg task duration', () => {
    let s = createWorkerSandboxState();
    const r = submitTask(s, 'a', {});
    s = startTask(r.state, r.taskId);
    s = completeTask(s, r.taskId, {});
    expect(getAvgTaskDuration(s)).toBeGreaterThanOrEqual(0);
  });

  it('should clear tasks', () => {
    let s = createWorkerSandboxState();
    s = submitTask(s, 'a', {}).state;
    s = clearWorkerTasks(s);
    expect(s.tasks.size).toBe(0);
  });

  it('should return undefined for missing task on start', () => {
    const s = createWorkerSandboxState();
    const newState = startTask(s, 'missing');
    expect(newState).toBe(s);
  });

  it('should produce report', () => {
    let s = createWorkerSandboxState();
    const r = submitTask(s, 'a', {});
    s = startTask(r.state, r.taskId);
    s = completeTask(s, r.taskId, {});
    const report = getWorkerSandboxReport(s);
    expect(report.completed).toBe(1);
  });
});
