import { describe, it, expect } from 'vitest';
import {
  createWarmupState, setIdle, registerWarmupTask, markWarmupReady, markWarmupFailed,
  getWarmupTask, getWarmupByKey, getReadyWarmupTasks, getPendingWarmupTasks, clearWarmupTasks, getWarmupReport,
} from '../../perf/V257-CacheWarming';

describe('V257 CacheWarming', () => {
  it('should create empty state', () => {
    const s = createWarmupState();
    expect(s.tasks.size).toBe(0);
  });

  it('should set idle', () => {
    let s = createWarmupState();
    s = setIdle(s, false);
    expect(s.isIdle).toBe(false);
  });

  it('should register task', () => {
    const s = createWarmupState();
    const r = registerWarmupTask(s, 'http', 'url1', async () => 'data');
    expect(r.state.tasks.size).toBe(1);
  });

  it('should mark ready', () => {
    let s = createWarmupState();
    const r = registerWarmupTask(s, 'http', 'url1', async () => 'data');
    s = markWarmupReady(r.state, r.taskId);
    expect(getWarmupTask(s, r.taskId)!.status).toBe('ready');
  });

  it('should mark failed', () => {
    let s = createWarmupState();
    const r = registerWarmupTask(s, 'http', 'url1', async () => 'data');
    s = markWarmupFailed(r.state, r.taskId, 'timeout');
    expect(getWarmupTask(s, r.taskId)!.status).toBe('failed');
  });

  it('should get by key', () => {
    let s = createWarmupState();
    s = registerWarmupTask(s, 'http', 'url1', async () => 'data').state;
    s = registerWarmupTask(s, 'http', 'url2', async () => 'data').state;
    s = registerWarmupTask(s, 'http', 'url1', async () => 'data2').state;
    expect(getWarmupByKey(s, 'url1')).toHaveLength(2);
  });

  it('should get ready tasks', () => {
    let s = createWarmupState();
    const r1 = registerWarmupTask(s, 'http', 'a', async () => 'd');
    s = markWarmupReady(r1.state, r1.taskId);
    s = registerWarmupTask(s, 'http', 'b', async () => 'd').state;
    expect(getReadyWarmupTasks(s)).toHaveLength(1);
  });

  it('should get pending tasks', () => {
    let s = createWarmupState();
    s = registerWarmupTask(s, 'http', 'a', async () => 'd').state;
    expect(getPendingWarmupTasks(s)).toHaveLength(1);
  });

  it('should clear tasks', () => {
    let s = createWarmupState();
    s = registerWarmupTask(s, 'http', 'a', async () => 'd').state;
    s = clearWarmupTasks(s);
    expect(s.tasks.size).toBe(0);
  });

  it('should return undefined for missing task on mark', () => {
    const s = createWarmupState();
    const newState = markWarmupReady(s, 'missing');
    expect(newState).toBe(s);
  });

  it('should produce report', () => {
    let s = createWarmupState();
    s = setIdle(s, true);
    s = registerWarmupTask(s, 'http', 'a', async () => 'd').state;
    const r = getWarmupReport(s);
    expect(r.isIdle).toBe(true);
    expect(r.total).toBe(1);
  });
});
