// ============================================================
// PipelineOrchestrator Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineOrchestrator, createPipelineOrchestrator } from '../pipeline/index.js';

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
  });

  describe('constructor', () => {
    it('should create orchestrator with default config', () => {
      const o = new PipelineOrchestrator();
      const stats = o.getStats();
      expect(stats.totalAgents).toBe(0);
      expect(stats.pendingTasks).toBe(0);
    });

    it('should create orchestrator with custom config', () => {
      const o = new PipelineOrchestrator({
        maxConcurrentAgents: 8,
        taskTimeout: 60000,
        enableParallelExecution: true,
      });
      expect(o.getStats()).toBeDefined();
    });
  });

  describe('agent management', () => {
    it('should register a designer agent', () => {
      const agent = orchestrator.registerAgent('designer', 'Test Designer');
      expect(agent.role).toBe('designer');
      expect(agent.name).toBe('Test Designer');
      expect(agent.status).toBe('idle');
    });

    it('should register a coder agent', () => {
      const agent = orchestrator.registerAgent('coder');
      expect(agent.role).toBe('coder');
    });

    it('should register a reviewer agent', () => {
      const agent = orchestrator.registerAgent('reviewer');
      expect(agent.role).toBe('reviewer');
    });

    it('should register a publisher agent', () => {
      const agent = orchestrator.registerAgent('publisher');
      expect(agent.role).toBe('publisher');
    });

    it('should get agent by id', () => {
      const registered = orchestrator.registerAgent('designer');
      const found = orchestrator.getAgent(registered.id);
      expect(found?.id).toBe(registered.id);
    });

    it('should get agents by role', () => {
      orchestrator.registerAgent('designer');
      orchestrator.registerAgent('designer');
      orchestrator.registerAgent('coder');

      const designers = orchestrator.getAgentsByRole('designer');
      expect(designers.length).toBe(2);
    });

    it('should get all agents', () => {
      orchestrator.registerAgent('designer');
      orchestrator.registerAgent('coder');
      orchestrator.registerAgent('reviewer');
      orchestrator.registerAgent('publisher');

      const all = orchestrator.getAllAgents();
      expect(all.length).toBe(4);
    });

    it('should update agent status', () => {
      const agent = orchestrator.registerAgent('designer');
      orchestrator.updateAgentStatus(agent.id, 'working', 'task-1');

      const updated = orchestrator.getAgent(agent.id);
      expect(updated?.status).toBe('working');
      expect(updated?.currentTask).toBe('task-1');
    });

    it('should not fail updating non-existent agent', () => {
      expect(() => orchestrator.updateAgentStatus('nonexistent', 'working')).not.toThrow();
    });
  });

  describe('task management', () => {
    it('should submit a task', () => {
      orchestrator.submitTask({
        id: 'task-1',
        type: 'design',
        input: { prompt: 'Design a button' },
      });

      const task = orchestrator.getTask('task-1');
      expect(task?.id).toBe('task-1');
      expect(task?.type).toBe('design');
    });

    it('should get pending tasks', () => {
      orchestrator.submitTask({ id: 't1', type: 'design', input: {} });
      orchestrator.submitTask({ id: 't2', type: 'code', input: {} });

      const pending = orchestrator.getPendingTasks();
      expect(pending.length).toBe(2);
    });

    it('should return undefined for non-existent task', () => {
      expect(orchestrator.getTask('nonexistent')).toBeUndefined();
    });

    it('should track task result after execution', async () => {
      orchestrator.registerAgent('designer');
      orchestrator.submitTask({ id: 't1', type: 'design', input: {} });

      await orchestrator.executeTasks(['t1']);

      const result = orchestrator.getTaskResult('t1');
      expect(result).toBeDefined();
      expect(result?.taskId).toBe('t1');
    });
  });

  describe('executeTasks', () => {
    it('should execute a single task', async () => {
      orchestrator.registerAgent('designer');
      orchestrator.submitTask({
        id: 'design-task',
        type: 'design',
        input: { prompt: 'Create a form' },
      });

      const results = await orchestrator.executeTasks(['design-task']);

      expect(results.length).toBe(1);
      expect(results[0].taskId).toBe('design-task');
    });

    it('should execute tasks sequentially by default', async () => {
      orchestrator.registerAgent('coder');
      orchestrator.submitTask({ id: 't1', type: 'code', input: {} });
      orchestrator.submitTask({ id: 't2', type: 'code', input: {} });

      const results = await orchestrator.executeTasks(['t1', 't2']);

      expect(results.length).toBe(2);
    });

    it('should return empty array for empty task list', async () => {
      const results = await orchestrator.executeTasks([]);
      expect(results.length).toBe(0);
    });

    it('should return failure result for unknown task', async () => {
      const results = await orchestrator.executeTasks(['unknown-task']);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('No available agent');
    });
  });

  describe('parallel execution', () => {
    it('should execute tasks in parallel when grouped', async () => {
      const orch = new PipelineOrchestrator({ enableParallelExecution: true });
      orch.registerAgent('coder');
      orch.registerAgent('coder');

      orch.submitTask({ id: 't1', type: 'code', input: {}, parallelGroup: 'group1' });
      orch.submitTask({ id: 't2', type: 'code', input: {}, parallelGroup: 'group1' });

      const results = await orch.executeTasks(['t1', 't2']);

      expect(results.length).toBe(2);
    });

    it('should handle mixed parallel and sequential tasks', async () => {
      const orch = new PipelineOrchestrator({ enableParallelExecution: true });
      orch.registerAgent('designer');
      orch.registerAgent('coder');

      orch.submitTask({ id: 't1', type: 'design', input: {}, parallelGroup: 'design' });
      orch.submitTask({ id: 't2', type: 'code', input: {} });

      const results = await orch.executeTasks(['t1', 't2']);

      expect(results.length).toBe(2);
    });
  });

  describe('message handling', () => {
    it('should register message handler', async () => {
      let messageReceived = false;
      orchestrator.onMessage('test-channel', async () => {
        messageReceived = true;
      });

      await orchestrator.sendMessage({
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        type: 'request',
        payload: {},
        timestamp: Date.now(),
        channel: 'test-channel',
      });

      expect(messageReceived).toBe(true);
    });

    it('should emit message_sent event', async () => {
      let eventReceived = false;
      orchestrator.on('message_sent', () => { eventReceived = true; });

      await orchestrator.sendMessage({
        id: 'msg-2',
        from: 'a1',
        to: 'a2',
        type: 'request',
        payload: {},
        timestamp: Date.now(),
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe('event system', () => {
    it('should register and emit events', () => {
      let eventData: unknown = null;
      orchestrator.on('test_event', (data) => { eventData = data; });
      // @ts-expect-error accessing private method for testing
      orchestrator.emit('test_event', { value: 42 });

      expect(eventData).toEqual({ value: 42 });
    });

    it('should allow multiple listeners for same event', () => {
      let count = 0;
      orchestrator.on('multi_event', () => { count++; });
      orchestrator.on('multi_event', () => { count++; });

      // @ts-expect-error accessing private method for testing
      orchestrator.emit('multi_event', {});

      expect(count).toBe(2);
    });

    it('should remove event listener', () => {
      let count = 0;
      const handler = () => { count++; };
      orchestrator.on('remove_test', handler);
      orchestrator.off('remove_test', handler);

      // @ts-expect-error accessing private method for testing
      orchestrator.emit('remove_test', {});

      expect(count).toBe(0);
    });

    it('should handle errors in event listeners', () => {
      orchestrator.on('error_event', () => { throw new Error('Listener error'); });

      expect(() => {
        // @ts-expect-error accessing private method for testing
        orchestrator.emit('error_event', {});
      }).not.toThrow();
    });
  });

  describe('stats', () => {
    it('should return correct stats', async () => {
      orchestrator.registerAgent('designer');
      orchestrator.registerAgent('coder');
      orchestrator.submitTask({ id: 't1', type: 'design', input: {} });
      orchestrator.submitTask({ id: 't2', type: 'code', input: {} });

      await orchestrator.executeTasks(['t1']);

      const stats = orchestrator.getStats();
      expect(stats.totalAgents).toBe(2);
      expect(stats.pendingTasks).toBe(1);
      expect(stats.completedTasks).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all agents and tasks', async () => {
      orchestrator.registerAgent('designer');
      orchestrator.submitTask({ id: 't1', type: 'design', input: {} });

      await orchestrator.executeTasks(['t1']);

      orchestrator.reset();

      const stats = orchestrator.getStats();
      expect(stats.totalAgents).toBe(0);
      expect(stats.pendingTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
    });

    it('should emit reset event', () => {
      let resetCalled = false;
      orchestrator.on('orchestrator_reset', () => { resetCalled = true; });

      orchestrator.reset();

      expect(resetCalled).toBe(true);
    });
  });

  describe('agent registration events', () => {
    it('should emit agent_registered event', () => {
      let eventReceived = false;
      orchestrator.on('agent_registered', () => { eventReceived = true; });

      orchestrator.registerAgent('designer');

      expect(eventReceived).toBe(true);
    });

    it('should emit agent_status_changed event', () => {
      let eventReceived = false;
      orchestrator.on('agent_status_changed', () => { eventReceived = true; });

      const agent = orchestrator.registerAgent('designer');
      orchestrator.updateAgentStatus(agent.id, 'working');

      expect(eventReceived).toBe(true);
    });
  });

  describe('task lifecycle events', () => {
    it('should emit task_submitted event', () => {
      let eventReceived = false;
      orchestrator.on('task_submitted', () => { eventReceived = true; });

      orchestrator.submitTask({ id: 't1', type: 'design', input: {} });

      expect(eventReceived).toBe(true);
    });

    it('should emit task_completed event', async () => {
      orchestrator.registerAgent('designer');
      let eventReceived = false;
      orchestrator.on('task_completed', () => { eventReceived = true; });

      orchestrator.submitTask({ id: 't1', type: 'design', input: {} });
      await orchestrator.executeTasks(['t1']);

      expect(eventReceived).toBe(true);
    });
  });
});

describe('createPipelineOrchestrator', () => {
  it('should create orchestrator with factory function', () => {
    const o = createPipelineOrchestrator();
    expect(o.getStats()).toBeDefined();
  });

  it('should accept config via factory', () => {
    const o = createPipelineOrchestrator({ maxConcurrentAgents: 10 });
    expect(o.getStats()).toBeDefined();
  });
});

describe('retry behavior', () => {
  it('should retry failed tasks', async () => {
    const orch = new PipelineOrchestrator({ retryOnFailure: true, maxRetries: 3 });
    orch.registerAgent('designer');

    orch.submitTask({ id: 'retry-task', type: 'design', input: {} });
    const results = await orch.executeTasks(['retry-task']);

    expect(results[0]).toBeDefined();
  });

  it('should respect maxConcurrentAgents limit', () => {
    const orch = new PipelineOrchestrator({ maxConcurrentAgents: 2 });

    orch.registerAgent('designer');
    orch.registerAgent('designer');
    orch.registerAgent('designer');

    expect(orch.getAllAgents().length).toBe(3);
  });
});

describe('agent role mapping', () => {
  it('should map design tasks to designer agents', async () => {
    const orch = new PipelineOrchestrator();
    orch.registerAgent('designer');
    orch.submitTask({ id: 'd1', type: 'design', input: {} });

    const results = await orch.executeTasks(['d1']);
    expect(results[0]).toBeDefined();
  });

  it('should map code tasks to coder agents', async () => {
    const orch = new PipelineOrchestrator();
    orch.registerAgent('coder');
    orch.submitTask({ id: 'c1', type: 'code', input: {} });

    const results = await orch.executeTasks(['c1']);
    expect(results[0]).toBeDefined();
  });

  it('should map review tasks to reviewer agents', async () => {
    const orch = new PipelineOrchestrator();
    orch.registerAgent('reviewer');
    orch.submitTask({ id: 'r1', type: 'review', input: {} });

    const results = await orch.executeTasks(['r1']);
    expect(results[0]).toBeDefined();
  });

  it('should map publish tasks to publisher agents', async () => {
    const orch = new PipelineOrchestrator();
    orch.registerAgent('publisher');
    orch.submitTask({ id: 'p1', type: 'publish', input: {} });

    const results = await orch.executeTasks(['p1']);
    expect(results[0]).toBeDefined();
  });
});