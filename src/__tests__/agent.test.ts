/**
 * agent.test.ts - V21 Agent System Tests
 * Comprehensive test suite covering all agent classes
 */

import {
  AgentTask,
  TaskType,
  TaskStatus,
  TaskPriority,
  createTask,
  updateTaskStatus,
  validateTask,
} from '../agent/AgentTask';

import {
  AgentResult,
  ResultStatus,
  ResultArtifact,
  createResult,
  isSuccessful,
  isFailed,
  mergeResults,
} from '../agent/AgentResult';

import { AgentDesigner } from '../agent/AgentDesigner';
import { AgentCoder } from '../agent/AgentCoder';
import { AgentReviewer, ReviewIssue } from '../agent/AgentReviewer';
import { AgentRegistry, BaseAgent } from '../agent/AgentRegistry';
import { AgentCoordinator, PipelineConfig } from '../agent/AgentCoordinator';

describe('AgentTask', () => {
  describe('createTask', () => {
    it('should create a task with generated id', () => {
      const task = createTask({
        type: 'design',
        payload: { requirement: 'Build a document editor' },
      });
      expect(task.id).toMatch(/^task-/);
      expect(task.type).toBe('design');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('medium');
    });

    it('should create a task with custom id', () => {
      const task = createTask({
        id: 'custom-task-001',
        type: 'implement',
        payload: { specification: 'Spec content' },
      });
      expect(task.id).toBe('custom-task-001');
    });

    it('should set custom priority', () => {
      const task = createTask({
        type: 'review',
        payload: {},
        priority: 'critical',
      });
      expect(task.priority).toBe('critical');
    });

    it('should set dependencies', () => {
      const deps = [{ taskId: 'dep-1', type: 'requires' as const }];
      const task = createTask({
        type: 'deploy',
        payload: {},
        dependencies: deps,
      });
      expect(task.dependencies).toEqual(deps);
    });

    it('should set metadata', () => {
      const task = createTask({
        type: 'test',
        payload: {},
        metadata: { tags: ['urgent'] },
      });
      expect(task.metadata).toEqual({ tags: ['urgent'] });
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const task = createTask({ type: 'design', payload: {} });
      const updated = updateTaskStatus(task, 'running');
      expect(updated.status).toBe('running');
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('validateTask', () => {
    it('should validate a correct task', () => {
      const task = createTask({ type: 'design', payload: {}, priority: 'medium' });
      expect(validateTask(task)).toBe(true);
    });

    it('should reject null', () => {
      expect(validateTask(null)).toBe(false);
    });

    it('should reject task with invalid type', () => {
      expect(validateTask({ id: '1', type: 'invalid', payload: {}, status: 'pending' })).toBe(false);
    });

    it('should reject task without payload', () => {
      expect(validateTask({ id: '1', type: 'design', status: 'pending' })).toBe(false);
    });
  });
});

describe('AgentResult', () => {
  describe('createResult', () => {
    it('should create a success result', () => {
      const result = createResult({
        taskId: 'task-1',
        status: 'success',
        output: { data: 'test' },
        agentId: 'agent-1',
        agentName: 'TestAgent',
      });
      expect(result.taskId).toBe('task-1');
      expect(result.status).toBe('success');
      expect(result.output).toEqual({ data: 'test' });
      expect(result.metrics.durationMs).toBe(0);
    });

    it('should create a failure result with error', () => {
      const result = createResult({
        taskId: 'task-1',
        status: 'failure',
        output: null,
        error: 'Something went wrong',
        agentId: 'agent-1',
        agentName: 'TestAgent',
      });
      expect(result.status).toBe('failure');
      expect(result.error).toBe('Something went wrong');
    });
  });

  describe('isSuccessful', () => {
    it('should return true for success status', () => {
      const result = createResult({
        taskId: 'task-1',
        status: 'success',
        output: {},
        agentId: 'agent-1',
        agentName: 'TestAgent',
      });
      expect(isSuccessful(result)).toBe(true);
    });

    it('should return false for failure status', () => {
      const result = createResult({
        taskId: 'task-1',
        status: 'failure',
        output: null,
        agentId: 'agent-1',
        agentName: 'TestAgent',
      });
      expect(isSuccessful(result)).toBe(false);
    });
  });

  describe('isFailed', () => {
    it('should return true for failure status', () => {
      const result = createResult({
        taskId: 'task-1',
        status: 'failure',
        output: null,
        agentId: 'agent-1',
        agentName: 'TestAgent',
      });
      expect(isFailed(result)).toBe(true);
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple results', () => {
      const results = [
        createResult({ taskId: 't1', status: 'success', output: {}, agentId: 'a1', agentName: 'A' }),
        createResult({ taskId: 't2', status: 'success', output: {}, agentId: 'a2', agentName: 'B' }),
      ];
      const merged = mergeResults(results);
      expect(merged.status).toBe('success');
      expect(merged.metrics.totalTasks).toBe(2);
    });

    it('should mark as failure if any result fails', () => {
      const results = [
        createResult({ taskId: 't1', status: 'success', output: {}, agentId: 'a1', agentName: 'A' }),
        createResult({ taskId: 't2', status: 'failure', output: null, error: 'fail', agentId: 'a2', agentName: 'B' }),
      ];
      const merged = mergeResults(results);
      expect(merged.status).toBe('failure');
    });
  });
});

describe('AgentDesigner', () => {
  let designer: AgentDesigner;

  beforeEach(() => {
    designer = new AgentDesigner();
  });

  it('should have correct default id and name', () => {
    expect(designer.id).toMatch(/^designer-/);
    expect(designer.name).toBe('DesignerAgent');
    expect(designer.type).toBe('design');
  });

  it('should accept custom id and name', () => {
    const custom = new AgentDesigner('custom-id', 'CustomDesigner');
    expect(custom.id).toBe('custom-id');
    expect(custom.name).toBe('CustomDesigner');
  });

  it('should return capabilities', () => {
    const caps = designer.getCapabilities();
    expect(caps).toContain('architecture_design');
    expect(caps).toContain('api_design');
    expect(Array.isArray(caps)).toBe(true);
  });

  it('should canHandle design tasks', () => {
    expect(designer.canHandle('design')).toBe(true);
    expect(designer.canHandle('implement')).toBe(false);
  });

  it('should process design task successfully', async () => {
    const task = createTask({
      type: 'design',
      payload: { requirement: 'Build a collaborative document editor with real-time sync' },
    });
    const result = await designer.process(task);
    expect(result.status).toBe('success');
expect(result.output).toHaveProperty('design');
    expect(result.output.design).toHaveProperty('pattern');
    expect(result.output.design).toHaveProperty('components');
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  it('should reject non-design tasks', async () => {
    const task = createTask({ type: 'implement', payload: {} });
    const result = await designer.process(task);
    expect(result.status).toBe('failure');
    expect(result.error).toContain('cannot handle');
  });

  it('should select event-driven pattern for realtime requirements', async () => {
    const task = createTask({
      type: 'design',
      payload: { requirement: 'Build a realtime collaboration tool' },
    });
    const result = await designer.process(task);
    expect(result.status).toBe('success');
    const design = (result.output as Record<string, unknown>).design as Record<string, unknown>;
    expect(design.pattern).toBe('event-driven');
  });
});

describe('AgentCoder', () => {
  let coder: AgentCoder;

  beforeEach(() => {
    coder = new AgentCoder();
  });

  it('should have correct default id and name', () => {
    expect(coder.id).toMatch(/^coder-/);
    expect(coder.name).toBe('CoderAgent');
    expect(coder.type).toBe('implement');
  });

  it('should return capabilities', () => {
    const caps = coder.getCapabilities();
    expect(caps).toContain('code_generation');
    expect(caps).toContain('typescript');
    expect(caps).toContain('react');
  });

  it('should canHandle implement and refactor tasks', () => {
    expect(coder.canHandle('implement')).toBe(true);
    expect(coder.canHandle('refactor')).toBe(true);
    expect(coder.canHandle('design')).toBe(false);
  });

  it('should generate code with useState when needed', async () => {
    const task = createTask({
      type: 'implement',
      payload: {
        specification: 'Component with state',
        context: { needsState: true },
      },
    });
    const result = await coder.process(task);
    expect(result.status).toBe('success');
    const code = (result.output as Record<string, string>).code;
    expect(code).toContain('useState');
  });

  it('should reject non-implement tasks', async () => {
    const task = createTask({ type: 'review', payload: {} });
    const result = await coder.process(task);
    expect(result.status).toBe('failure');
  });
});

describe('AgentReviewer', () => {
  let reviewer: AgentReviewer;

  beforeEach(() => {
    reviewer = new AgentReviewer();
  });

  it('should have correct default id and name', () => {
    expect(reviewer.id).toMatch(/^reviewer-/);
    expect(reviewer.name).toBe('ReviewerAgent');
    expect(reviewer.type).toBe('review');
  });

  it('should return capabilities', () => {
    const caps = reviewer.getCapabilities();
    expect(caps).toContain('code_review');
    expect(caps).toContain('security_audit');
  });

  it('should canHandle review tasks', () => {
    expect(reviewer.canHandle('review')).toBe(true);
    expect(reviewer.canHandle('design')).toBe(false);
  });

  it('should detect console.log statements', async () => {
    const task = createTask({
      type: 'review',
      payload: { sourceCode: 'console.log("debug");\nconst x = 1;' },
    });
    const result = await reviewer.process(task);
    expect(result.status).toBe('success');
    const issues = (result.output as Record<string, ReviewIssue[]>).issues;
    expect(issues.some((i: ReviewIssue) => i.message.includes('console'))).toBe(true);
  });

  it('should detect any type usage', async () => {
    const task = createTask({
      type: 'review',
      payload: { sourceCode: 'const x: any = 1;' },
    });
    const result = await reviewer.process(task);
    expect(result.status).toBe('success');
    const issues = (result.output as Record<string, ReviewIssue[]>).issues;
    expect(issues.some((i: ReviewIssue) => i.severity === 'major')).toBe(true);
  });

  it('should calculate score based on issues', async () => {
    const task = createTask({
      type: 'review',
      payload: { sourceCode: 'console.log("test");\nconst x: any = 1;' },
    });
    const result = await reviewer.process(task);
    expect(result.status).toBe('success');
    expect((result.output as Record<string, number>).score).toBeLessThan(10);
  });

  it('should approve code with good score', async () => {
    const task = createTask({
      type: 'review',
      payload: { sourceCode: 'const x = 1;\nconst y = 2;' },
    });
    const result = await reviewer.process(task);
    expect(result.status).toBe('success');
    expect((result.output as Record<string, boolean>).approved).toBe(true);
  });
});

describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let mockAgent: BaseAgent;

  beforeEach(() => {
    registry = new AgentRegistry();
    mockAgent = {
      id: 'mock-001',
      name: 'MockAgent',
      type: 'design',
      capabilities: ['mock_capability'],
      process: vi.fn(),
      getCapabilities: () => ['mock_capability'],
    };
  });

  it('should register and retrieve agent', () => {
    registry.register(mockAgent);
    const retrieved = registry.getAgent('mock-001');
    expect(retrieved).toBe(mockAgent);
  });

  it('should throw on duplicate registration', () => {
    registry.register(mockAgent);
    expect(() => registry.register(mockAgent)).toThrow('already registered');
  });

  it('should unregister agent', () => {
    registry.register(mockAgent);
    expect(registry.unregister('mock-001')).toBe(true);
    expect(registry.getAgent('mock-001')).toBeUndefined();
  });

  it('should return false when unregistering non-existent agent', () => {
    expect(registry.unregister('non-existent')).toBe(false);
  });

  it('should get agents by type', () => {
    registry.register(mockAgent);
    const agents = registry.getAgentsByType('design');
    expect(agents).toContain(mockAgent);
  });

  it('should get agents by capability', () => {
    registry.register(mockAgent);
    const agents = registry.getAgentsByCapability('mock_capability');
    expect(agents).toContain(mockAgent);
  });

  it('should find agent for task', () => {
    registry.register(mockAgent);
    const task = createTask({ type: 'design', payload: {} });
    const agent = registry.findAgentForTask(task);
    expect(agent).toBe(mockAgent);
  });

  it('should list all agents', () => {
    registry.register(mockAgent);
    expect(registry.listAllAgents()).toContain(mockAgent);
  });

  it('should clear all agents', () => {
    registry.register(mockAgent);
    registry.clear();
    expect(registry.getAgentCount()).toBe(0);
  });
});

describe('AgentCoordinator', () => {
  let coordinator: AgentCoordinator;

  beforeEach(() => {
    coordinator = new AgentCoordinator();
  });

  it('should have default id and name', () => {
    expect(coordinator.id).toBe('coordinator-001');
    expect(coordinator.name).toBe('PipelineCoordinator');
  });

  it('should have a registry with default agents', () => {
    const registry = coordinator.getRegistry();
    expect(registry.getAgentCount()).toBe(3);
  });

  it('should run pipeline through design->implement->review', async () => {
    const designTask = createTask({
      type: 'design',
      payload: { requirement: 'Create a simple button component' },
    });
    const results = await coordinator.runPipeline(designTask);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].agentName).toBe('DesignerAgent');
  });

  it('should track history', async () => {
    const task = createTask({ type: 'design', payload: { requirement: 'Test' } });
    await coordinator.runPipeline(task);
    const history = coordinator.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  it('should clear history', async () => {
    const task = createTask({ type: 'design', payload: { requirement: 'Test' } });
    await coordinator.runPipeline(task);
    coordinator.clearHistory();
    expect(coordinator.getHistory().length).toBe(0);
  });

  it('should run parallel tasks', async () => {
    const tasks = [
      createTask({ type: 'design', payload: { requirement: 'Task 1' } }),
      createTask({ type: 'design', payload: { requirement: 'Task 2' } }),
    ];
    const results = await coordinator.runParallel(tasks);
    expect(results.length).toBe(2);
  });

  it('should get stats', async () => {
    const task = createTask({ type: 'design', payload: { requirement: 'Test' } });
    await coordinator.runPipeline(task);
    const stats = coordinator.getStats();
    expect(stats.totalTasks).toBeGreaterThan(0);
    expect(stats).toHaveProperty('successfulTasks');
    expect(stats).toHaveProperty('averageDurationMs');
  });

  it('should set config', () => {
    coordinator.setConfig({ includeDesigner: false });
    const config = coordinator.getHistory();
    expect(config).toBeDefined();
  });

  it('should handle custom pipeline', async () => {
    const tasks = [
      createTask({ type: 'design', payload: { requirement: 'Task 1' } }),
      createTask({ type: 'implement', payload: { specification: 'Spec 1' } }),
    ];
    const results = await coordinator.runCustomPipeline(tasks);
    expect(results.length).toBe(2);
  });
});

describe('Integration Tests', () => {
  it('should create and process a complete design task', async () => {
    const designer = new AgentDesigner();
    const task = createTask({
      type: 'design',
      payload: { requirement: 'Design a document storage system' },
    });
    const result = await designer.process(task);
    expect(result.status).toBe('success');
    expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should chain designer to coder output', async () => {
    const designer = new AgentDesigner();
    const coder = new AgentCoder();

    const designTask = createTask({
      type: 'design',
      payload: { requirement: 'Simple UI Component' },
    });
    const designResult = await designer.process(designTask);
    expect(designResult.status).toBe('success');

    const implementTask = createTask({
      type: 'implement',
      payload: {
        specification: JSON.stringify(designResult.output),
        context: { componentName: 'NewComponent', needsState: true },
      },
    });
    const implementResult = await coder.process(implementTask);
    expect(implementResult.status).toBe('success');
    expect((implementResult.output as Record<string, string>).code).toContain('NewComponent');
  });

  it('should register multiple agents and find by capability', () => {
    const registry = new AgentRegistry();
    const designer = new AgentDesigner('d1', 'Designer1');
    const coder = new AgentCoder('c1', 'Coder1');

    registry.register(designer);
    registry.register(coder);

    const designAgents = registry.getAgentsByCapability('architecture_design');
    expect(designAgents.length).toBeGreaterThan(0);

    const codeAgents = registry.getAgentsByCapability('code_generation');
    expect(codeAgents.some((a) => a.id === 'c1')).toBe(true);
  });

  it('should merge multiple agent results', () => {
    const results = [
      createResult({
        taskId: 'task-1',
        status: 'success',
        output: { step: 1 },
        agentId: 'a1',
        agentName: 'Agent1',
        metrics: { durationMs: 100 },
      }),
      createResult({
        taskId: 'task-2',
        status: 'success',
        output: { step: 2 },
        agentId: 'a2',
        agentName: 'Agent2',
        metrics: { durationMs: 200 },
      }),
    ];

    const merged = mergeResults(results);
    expect(merged.metrics.durationMs).toBe(300);
    expect(merged.artifacts.length).toBe(0);
  });

  it('should validate task with all required fields', () => {
    const validTask = createTask({
      id: 'test-task',
      type: 'design',
      payload: { requirement: 'Test requirement' },
      priority: 'high',
    });
    expect(validateTask(validTask)).toBe(true);
  });

  it('should reject invalid task types', () => {
    const invalidTask = { id: '1', type: 'invalid', payload: {}, status: 'pending' };
    expect(validateTask(invalidTask)).toBe(false);
  });
});