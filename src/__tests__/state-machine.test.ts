/**
 * state-machine.test.ts
 * V86 State Machine Test Suite for doc-editor
 * 27+ tests covering StateMachine, StateRegistry, TransitionManager, StateMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateMachine, StateConfig, State, TransitionResult } from '../state-machine/StateMachine';
import { StateRegistry, RegistryConfig, RegisteredState } from '../state-machine/StateRegistry';
import { TransitionManager, TransitionConfig, Transition } from '../state-machine/TransitionManager';
import { StateMonitor, MonitorConfig, StateMetric, ActiveState } from '../state-machine/StateMonitor';

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => {
    sm = new StateMachine({ maxHistory: 10, enableLogging: false });
  });

  it('should initialize with default config', () => {
    expect(sm.config).toEqual({ maxHistory: 10, enableLogging: false, validationEnabled: true });
  });

  it('should transition between states', () => {
    const result = sm.transition('idle', 'Idle State');
    expect(result.success).toBe(true);
    expect(result.from).toBe('none');
    expect(result.to).toBe('idle');
    expect(sm.getState()?.id).toBe('idle');
  });

  it('should maintain transition history', () => {
    sm.transition('idle', 'Idle');
    sm.transition('active', 'Active');
    const history = sm.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('idle');
  });

  it('should reject invalid transitions when validation is enabled', () => {
    const result = sm.transition('', 'Empty');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid state ID');
  });

  it('should execute actions on current state', () => {
    sm.transition('active', 'Active');
    const result = sm.execute('process', { data: 'test' });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it('should return error when executing without state', () => {
    const result = sm.execute('process');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No current state');
  });

  it('should track transition count', () => {
    sm.transition('a', 'A');
    sm.transition('b', 'B');
    expect(sm.transitionCount).toBe(2);
  });

  it('should call transition callbacks', () => {
    const callback = vi.fn();
    sm.onTransition(callback);
    sm.transition('idle', 'Idle');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should provide snapshot with metrics', () => {
    const snapshot = sm.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('currentState');
    expect(snapshot.metrics).toHaveProperty('transitionCount');
  });

  it('should reset all state', () => {
    sm.transition('idle', 'Idle');
    sm.reset();
    expect(sm.getState()).toBeNull();
    expect(sm.getHistory()).toEqual([]);
    expect(sm.transitionCount).toBe(0);
  });

  it('should generate report string', () => {
    const report = sm.getReport();
    expect(report).toContain('StateMachine Report');
    expect(report).toContain('Total Transitions:');
  });

  it('should export metrics with version', () => {
    const metrics = sm.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics).toHaveProperty('transitionCount');
  });
});

describe('StateRegistry', () => {
  let registry: StateRegistry;

  beforeEach(() => {
    registry = new StateRegistry({ allowOverwrite: false, maxEntries: 10 });
  });

  it('should initialize with config', () => {
    expect(registry.config.allowOverwrite).toBe(false);
    expect(registry.size).toBe(0);
  });

  it('should register new states', () => {
    const result = registry.register('idle', 'Idle State');
    expect(result).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('should add states via add method', () => {
    registry.add('active', 'Active State');
    expect(registry.has('active')).toBe(true);
  });

  it('should prevent duplicate registrations when overwrite disabled', () => {
    registry.register('idle', 'Idle');
    const result = registry.register('idle', 'Idle 2');
    expect(result).toBe(false);
  });

  it('should allow overwriting when enabled', () => {
    const regWithOverwrite = new StateRegistry({ allowOverwrite: true });
    regWithOverwrite.register('idle', 'Idle');
    const result = regWithOverwrite.register('idle', 'Idle 2');
    expect(result).toBe(true);
  });

  it('should remove existing states', () => {
    registry.register('idle', 'Idle');
    const result = registry.remove('idle');
    expect(result).toBe(true);
    expect(registry.has('idle')).toBe(false);
  });

  it('should return null for non-existent state', () => {
    const state = registry.get('nonexistent');
    expect(state).toBeNull();
  });

  it('should return all registered states', () => {
    registry.register('a', 'A');
    registry.register('b', 'B');
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should provide snapshot metrics', () => {
    registry.register('idle', 'Idle');
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.totalStates).toBe(1);
  });

  it('should reset registry', () => {
    registry.register('idle', 'Idle');
    registry.reset();
    expect(registry.size).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('TransitionManager', () => {
  let tm: TransitionManager;

  beforeEach(() => {
    tm = new TransitionManager({ allowSelfTransitions: false, maxTransitions: 100 });
  });

  it('should initialize with config', () => {
    expect(tm.config.allowSelfTransitions).toBe(false);
    expect(tm.size).toBe(0);
  });

  it('should add transitions', () => {
    const result = tm.add('t1', 'idle', 'active');
    expect(result).toBe(true);
    expect(tm.size).toBe(1);
  });

  it('should reject transitions with missing fields', () => {
    const result = tm.add('', 'idle', 'active');
    expect(result).toBe(false);
  });

  it('should execute valid transitions', () => {
    tm.add('t1', 'idle', 'active');
    const result = tm.execute('t1', 'idle', 'active');
    expect(result.success).toBe(true);
  });

  it('should reject self-transitions when disabled', () => {
    tm.add('t1', 'idle', 'idle');
    const result = tm.execute('t1', 'idle', 'idle');
    expect(result.success).toBe(false);
  });

  it('should get transitions by from/to filters', () => {
    tm.add('t1', 'idle', 'active');
    tm.add('t2', 'active', 'idle');
    const fromIdle = tm.getTransitions('idle');
    expect(fromIdle.length).toBe(1);
    expect(fromIdle[0].id).toBe('t1');
  });

  it('should get valid transitions from a state', () => {
    tm.add('t1', 'idle', 'active');
    const valid = tm.getValid('idle');
    expect(valid.length).toBe(1);
  });

  it('should remove transitions', () => {
    tm.add('t1', 'idle', 'active');
    const removed = tm.remove('t1');
    expect(removed).toBe(true);
    expect(tm.size).toBe(0);
  });

  it('should provide snapshot metrics', () => {
    const snapshot = tm.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('totalTransitions');
  });

  it('should reset manager', () => {
    tm.add('t1', 'idle', 'active');
    tm.reset();
    expect(tm.size).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = tm.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('StateMonitor', () => {
  let monitor: StateMonitor;

  beforeEach(() => {
    monitor = new StateMonitor({ maxHistorySize: 50 });
  });

  it('should initialize with config', () => {
    expect(monitor.config.maxHistorySize).toBe(50);
  });

  it('should track state entry', () => {
    monitor.track('idle', 'Idle', 'enter');
    const metrics = monitor.getMetrics('idle');
    expect(metrics?.entryCount).toBe(1);
  });

  it('should track state exit with duration', () => {
    monitor.track('idle', 'Idle', 'enter');
    monitor.track('idle', 'Idle', 'exit');
    const metrics = monitor.getMetrics('idle') as StateMetric;
    expect(metrics.totalDuration).toBeGreaterThanOrEqual(0);
  });

  it('should return active states', () => {
    monitor.track('idle', 'Idle', 'enter');
    const active = monitor.getActive();
    expect(active.length).toBe(1);
    expect(active[0].stateId).toBe('idle');
  });

  it('should return history', () => {
    monitor.track('idle', 'Idle', 'enter');
    monitor.track('idle', 'Idle', 'exit');
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  it('should limit history with parameter', () => {
    monitor.track('a', 'A', 'enter');
    monitor.track('b', 'B', 'enter');
    const limited = monitor.getHistory(1);
    expect(limited.length).toBe(1);
  });

  it('should count events', () => {
    monitor.track('idle', 'Idle', 'enter');
    expect(monitor.eventCount).toBe(1);
  });

  it('should provide snapshot metrics', () => {
    monitor.track('idle', 'Idle', 'enter');
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.trackedStates).toBe(1);
  });

  it('should reset monitor', () => {
    monitor.track('idle', 'Idle', 'enter');
    monitor.reset();
    expect(monitor.eventCount).toBe(0);
    expect(monitor.getHistory()).toEqual([]);
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('Integration', () => {
  it('should integrate StateMachine with StateRegistry', () => {
    const registry = new StateRegistry();
    const sm = new StateMachine();

    registry.register('idle', 'Idle');
    registry.register('active', 'Active');

    sm.transition('idle', 'Idle');
    expect(sm.getState()?.id).toBe('idle');

    sm.transition('active', 'Active');
    expect(sm.getState()?.id).toBe('active');
  });

  it('should integrate StateMachine with TransitionManager', () => {
    const tm = new TransitionManager();
    const sm = new StateMachine();

    tm.add('toActive', 'idle', 'active');

    sm.transition('idle', 'Idle');
    const result = tm.execute('toActive', 'idle', 'active');
    expect(result.success).toBe(true);
  });

  it('should integrate StateMachine with StateMonitor', () => {
    const monitor = new StateMonitor();
    const sm = new StateMachine();

    sm.transition('idle', 'Idle');
    monitor.track('idle', 'Idle', 'enter');

    const active = monitor.getActive();
    expect(active.length).toBe(1);
    expect(active[0].stateId).toBe('idle');
  });
});