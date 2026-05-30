/**
 * V95 Workflow Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowRegistry } from '../workflow-registry/WorkflowRegistry';
import { WorkflowBuilder } from '../workflow-registry/WorkflowBuilder';
import { WorkflowValidator } from '../workflow-registry/WorkflowValidator';
import { WorkflowExecutor } from '../workflow-registry/WorkflowExecutor';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;

  beforeEach(() => {
    registry = new WorkflowRegistry();
  });

  it('should register a workflow', () => {
    const workflow = { id: 'wf1', name: 'Test', version: '1.0.0', enabled: true };
    expect(registry.register(workflow)).toBe(true);
    expect(registry.has('wf1')).toBe(true);
  });

  it('should not register duplicate without allowDuplicates', () => {
    const workflow = { id: 'wf1', name: 'Test', version: '1.0.0', enabled: true };
    registry.register(workflow);
    expect(registry.register(workflow)).toBe(false);
  });

  it('should unregister a workflow', () => {
    const workflow = { id: 'wf1', name: 'Test', version: '1.0.0', enabled: true };
    registry.register(workflow);
    expect(registry.unregister('wf1')).toBe(true);
    expect(registry.has('wf1')).toBe(false);
  });

  it('should get a workflow by id', () => {
    const workflow = { id: 'wf1', name: 'Test', version: '1.0.0', enabled: true };
    registry.register(workflow);
    expect(registry.get('wf1')).toEqual(workflow);
  });

  it('should getAll workflows', () => {
    registry.register({ id: 'wf1', name: 'Test1', version: '1.0.0', enabled: true });
    registry.register({ id: 'wf2', name: 'Test2', version: '1.0.0', enabled: false });
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should have a workflow', () => {
    registry.register({ id: 'wf1', name: 'Test', version: '1.0.0', enabled: true });
    expect(registry.has('wf1')).toBe(true);
    expect(registry.has('wf2')).toBe(false);
  });

  it('should return correct snapshot metrics', () => {
    registry.register({ id: 'wf1', name: 'Test1', version: '1.0.0', enabled: true });
    registry.register({ id: 'wf2', name: 'Test2', version: '1.0.0', enabled: false });
    const { metrics } = registry.getSnapshot();
    expect(metrics.total).toBe(2);
    expect(metrics.enabled).toBe(1);
    expect(metrics.disabled).toBe(1);
  });

  it('should reset all workflows', () => {
    registry.register({ id: 'wf1', name: 'Test', version: '1.0.0', enabled: true });
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('WorkflowBuilder', () => {
  let builder: WorkflowBuilder;

  beforeEach(() => {
    builder = new WorkflowBuilder();
  });

  it('should create a workflow', () => {
    const result = builder.create('wf1', 'Test', '1.0.0');
    expect(result).toBe(builder);
    expect(builder.getWorkflow('wf1')).toBeDefined();
  });

  it('should add steps to workflow', () => {
    builder.create('wf1', 'Test', '1.0.0');
    const result = builder.addStep('wf1', { id: 'step1', type: 'task' });
    expect(result).toBe(builder);
  });

  it('should throw error when adding step to non-existent workflow', () => {
    expect(() => builder.addStep('wf1', { id: 'step1', type: 'task' })).toThrow();
  });

  it('should set entry point', () => {
    builder.create('wf1', 'Test', '1.0.0');
    builder.addStep('wf1', { id: 'step1', type: 'task' });
    const result = builder.setEntryPoint('wf1', 'step1');
    expect(result).toBe(builder);
  });

  it('should build a workflow', () => {
    builder.create('wf1', 'Test', '1.0.0');
    builder.addStep('wf1', { id: 'step1', type: 'task' });
    const workflow = builder.build('wf1');
    expect(workflow).toBeDefined();
    expect(workflow?.id).toBe('wf1');
  });

  it('should get workflow definition', () => {
    builder.create('wf1', 'Test', '1.0.0');
    expect(builder.getWorkflow('wf1')).toBeDefined();
    expect(builder.getWorkflow('wf2')).toBeUndefined();
  });

  it('should return correct stats', () => {
    builder.create('wf1', 'Test', '1.0.0');
    builder.addStep('wf1', { id: 'step1', type: 'task' });
    const stats = builder.getStats();
    expect(stats.workflowsCreated).toBe(1);
    expect(stats.totalSteps).toBe(1);
  });

  it('should reset builder state', () => {
    builder.create('wf1', 'Test', '1.0.0');
    builder.addStep('wf1', { id: 'step1', type: 'task' });
    builder.reset();
    expect(builder.getStats().workflowsCreated).toBe(0);
  });
});

describe('WorkflowValidator', () => {
  let validator: WorkflowValidator;

  beforeEach(() => {
    validator = new WorkflowValidator();
  });

  it('should validate a valid workflow', () => {
    const workflow = { id: 'wf1', name: 'Test', version: '1.0.0' };
    const result = validator.validate(workflow);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for missing required fields', () => {
    const workflow = { name: 'Test' };
    const result = validator.validate(workflow);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
  });

  it('should get errors', () => {
    const workflow = { name: 'Test' };
    validator.validate(workflow);
    expect(validator.getErrors().length).toBeGreaterThan(0);
  });

  it('should check workflow validity', () => {
    const validWorkflow = { id: 'wf1', name: 'Test', version: '1.0.0' };
    const invalidWorkflow = { name: 'Test' };
    expect(validator.check(validWorkflow)).toBe(true);
    expect(validator.check(invalidWorkflow)).toBe(false);
  });

  it('should get schema', () => {
    const schema = validator.getSchema();
    expect(schema.requiredFields).toContain('id');
    expect(schema.requiredFields).toContain('name');
  });

  it('should return correct snapshot metrics', () => {
    validator.validate({ id: 'wf1', name: 'Test', version: '1.0.0' });
    const { metrics } = validator.getSnapshot();
    expect(metrics.totalValidated).toBe(1);
  });

  it('should reset validator', () => {
    validator.validate({ id: 'wf1', name: 'Test', version: '1.0.0' });
    validator.reset();
    expect(validator.getErrors()).toHaveLength(0);
  });
});

describe('WorkflowExecutor', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
  });

  it('should execute a workflow', async () => {
    const result = await executor.execute('wf1', { input: 'test' });
    expect(result).toBeDefined();
  });

  it('should run a workflow', async () => {
    const result = await executor.run('wf1', { input: 'test' });
    expect(result).toBeDefined();
  });

  it('should stop a running workflow', async () => {
    executor.execute('wf1');
    const stopped = executor.stop('wf1');
    expect(stopped).toBe(true);
  });

  it('should return correct status', async () => {
    executor.execute('wf1');
    expect(executor.getStatus('wf1')).toBeDefined();
  });

  it('should return correct stats', async () => {
    await executor.execute('wf1');
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBeGreaterThanOrEqual(1);
  });

  it('should return correct snapshot metrics', async () => {
    await executor.execute('wf1');
    const { metrics } = executor.getSnapshot();
    expect(metrics.totalExecuted).toBeGreaterThanOrEqual(1);
  });

  it('should reset executor state', () => {
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});