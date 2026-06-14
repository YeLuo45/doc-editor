import { describe, it, expect } from 'vitest';
import {
  createReloaderState, startReload, completeReload, cancelReload,
  getActiveReloads, getReloadHistory, isReloading, clearHistory, getReloaderReport,
} from '../../forge/V192-AgentHotReloader';

describe('V192 AgentHotReloader', () => {
  it('should create empty state', () => {
    const s = createReloaderState();
    expect(s.activeReloads.size).toBe(0);
  });

  it('should start reload', () => {
    let s = createReloaderState();
    s = startReload(s, 'agent1', '1.0.0');
    expect(s.activeReloads.size).toBe(1);
  });

  it('should complete reload', () => {
    let s = createReloaderState();
    s = startReload(s, 'agent1', '1.0.0');
    s = completeReload(s, 'agent1', '1.1.0', true);
    expect(s.activeReloads.size).toBe(0);
    expect(s.totalReloads).toBe(1);
  });

  it('should track failed reloads', () => {
    let s = createReloaderState();
    s = startReload(s, 'agent1', '1.0.0');
    s = completeReload(s, 'agent1', '1.1.0', false, 'error');
    expect(s.failures).toBe(1);
  });

  it('should cancel reload', () => {
    let s = createReloaderState();
    s = startReload(s, 'agent1', '1.0.0');
    s = cancelReload(s, 'agent1');
    expect(s.activeReloads.size).toBe(0);
  });

  it('should get active reloads', () => {
    let s = createReloaderState();
    s = startReload(s, 'a', '1.0');
    s = startReload(s, 'b', '1.0');
    expect(getActiveReloads(s)).toHaveLength(2);
  });

  it('should get reload history', () => {
    let s = createReloaderState();
    s = startReload(s, 'a', '1.0');
    s = completeReload(s, 'a', '2.0', true);
    expect(getReloadHistory(s)).toHaveLength(1);
  });

  it('should filter history by agent', () => {
    let s = createReloaderState();
    s = startReload(s, 'a', '1.0');
    s = completeReload(s, 'a', '2.0', true);
    s = startReload(s, 'b', '1.0');
    s = completeReload(s, 'b', '2.0', true);
    expect(getReloadHistory(s, 'a')).toHaveLength(1);
  });

  it('should check if reloading', () => {
    let s = createReloaderState();
    s = startReload(s, 'a', '1.0');
    expect(isReloading(s, 'a')).toBe(true);
    s = completeReload(s, 'a', '2.0', true);
    expect(isReloading(s, 'a')).toBe(false);
  });

  it('should clear history', () => {
    let s = createReloaderState();
    s = startReload(s, 'a', '1.0');
    s = completeReload(s, 'a', '2.0', true);
    s = clearHistory(s);
    expect(s.history).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createReloaderState();
    s = startReload(s, 'a', '1.0');
    s = completeReload(s, 'a', '2.0', true);
    const r = getReloaderReport(s);
    expect(r.totalReloads).toBe(1);
    expect(r.successRate).toBe(1);
  });
});
