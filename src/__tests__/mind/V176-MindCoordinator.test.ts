import { describe, it, expect } from 'vitest';
import {
  createCoordinationState, createTask, startTask, completeTask, failTask,
  nextRound, setAgentActive, getPendingTasks, getActiveAgents, getCoordinationReport,
  type AgentRole,
} from '../../mind/V176-MindCoordinator';

describe('V176 MindCoordinator', () => {
  it('should create coordination state', () => {
    const s = createCoordinationState();
    expect(s.round).toBe(0);
    expect(s.agents.size).toBe(5);
  });

  it('should create task', () => {
    const s = createCoordinationState();
    const { state, taskId } = createTask(s, 'review', 'doc content', 'reviewer');
    expect(state.tasks).toHaveLength(1);
    expect(taskId).toMatch(/^task-/);
  });

  it('should start task', () => {
    let s = createCoordinationState();
    const { state, taskId } = createTask(s, 'review', 'doc', 'reviewer');
    s = startTask(state, taskId);
    expect(s.tasks[0].status).toBe('in_progress');
  });

  it('should complete task', () => {
    let s = createCoordinationState();
    const { state, taskId } = createTask(s, 'review', 'doc', 'reviewer');
    s = startTask(state, taskId);
    s = completeTask(s, taskId, 'looks good');
    expect(s.tasks[0].status).toBe('completed');
    expect(s.completedCount).toBe(1);
  });

  it('should fail task', () => {
    let s = createCoordinationState();
    const { state, taskId } = createTask(s, 'review', 'doc', 'reviewer');
    s = startTask(state, taskId);
    s = failTask(s, taskId, 'invalid input');
    expect(s.tasks[0].status).toBe('failed');
    expect(s.failedCount).toBe(1);
  });

  it('should advance round', () => {
    let s = createCoordinationState();
    s = nextRound(s);
    expect(s.round).toBe(1);
  });

  it('should set agent active', () => {
    let s = createCoordinationState();
    s = setAgentActive(s, 'reviewer', false);
    const a = s.agents.get('reviewer')!;
    expect(a.active).toBe(false);
  });

  it('should get pending tasks', () => {
    let s = createCoordinationState();
    s = createTask(s, 'review', 'a', 'reviewer').state;
    s = createTask(s, 'review', 'b', 'reviewer').state;
    expect(getPendingTasks(s)).toHaveLength(2);
  });

  it('should get active agents', () => {
    const s = createCoordinationState();
    const active = getActiveAgents(s);
    expect(active).toHaveLength(5);
  });

  it('should produce report', () => {
    let s = createCoordinationState();
    const { state, taskId } = createTask(s, 'review', 'a', 'reviewer');
    s = startTask(state, taskId);
    s = completeTask(s, taskId, 'ok');
    const r = getCoordinationReport(s);
    expect(r.completed).toBe(1);
    expect(r.activeAgents).toBe(5);
  });
});
