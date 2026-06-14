import { describe, it, expect } from 'vitest';
import {
  createFederatedCoordState, setDeviceState, startCoordination, markCoordRunning,
  markCoordCompleted, markCoordFailed, getCoordTask, getCoordTasksForDoc, getCoordTasksByStatus, clearCoordTasks, getFederatedCoordReport,
} from '../../federation/V235-FederatedCoord';

describe('V235 FederatedCoord', () => {
  it('should create empty state', () => {
    const s = createFederatedCoordState();
    expect(s.tasks.size).toBe(0);
  });

  it('should set device state', () => {
    let s = createFederatedCoordState();
    s = setDeviceState(s, 'd1', 'ready');
    expect(s.deviceStates.get('d1')).toBe('ready');
  });

  it('should start coordination', () => {
    const s = createFederatedCoordState();
    const r = startCoordination(s, 'd1', 'edit', 'd1', ['d1', 'd2']);
    expect(r.state.tasks.size).toBe(1);
  });

  it('should mark running/completed/failed', () => {
    let s = createFederatedCoordState();
    const r = startCoordination(s, 'd1', 'edit', 'd1', ['d1']);
    s = markCoordRunning(r.state, r.taskId);
    expect(getCoordTask(s, r.taskId)!.status).toBe('in_progress');
    s = markCoordCompleted(s, r.taskId);
    expect(getCoordTask(s, r.taskId)!.status).toBe('completed');
  });

  it('should mark failed', () => {
    let s = createFederatedCoordState();
    const r = startCoordination(s, 'd1', 'edit', 'd1', ['d1']);
    s = markCoordFailed(r.state, r.taskId);
    expect(getCoordTask(s, r.taskId)!.status).toBe('failed');
  });

  it('should get tasks for doc', () => {
    let s = createFederatedCoordState();
    s = startCoordination(s, 'd1', 'edit', 'd1', ['d1']).state;
    s = startCoordination(s, 'd1', 'edit', 'd2', ['d1']).state;
    expect(getCoordTasksForDoc(s, 'd1')).toHaveLength(2);
  });

  it('should get tasks by status', () => {
    let s = createFederatedCoordState();
    const r1 = startCoordination(s, 'd1', 'edit', 'd1', ['d1']);
    s = markCoordCompleted(r1.state, r1.taskId);
    s = startCoordination(s, 'd1', 'edit', 'd1', ['d1']).state;
    expect(getCoordTasksByStatus(s, 'completed')).toHaveLength(1);
  });

  it('should clear tasks', () => {
    let s = createFederatedCoordState();
    s = startCoordination(s, 'd1', 'edit', 'd1', ['d1']).state;
    s = clearCoordTasks(s);
    expect(s.tasks.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createFederatedCoordState();
    s = setDeviceState(s, 'd1', 'ready');
    s = setDeviceState(s, 'd2', 'busy');
    s = startCoordination(s, 'd1', 'edit', 'd1', ['d1']).state;
    const r = getFederatedCoordReport(s);
    expect(r.devices.d1).toBe('ready');
    expect(r.devices.d2).toBe('busy');
    expect(r.tasks).toBe(1);
  });
});
