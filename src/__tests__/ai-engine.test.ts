/**
 * V59 AI Engine - Test Suite
 * Comprehensive tests for AI Engine modules
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AIModel } from '../ai-engine/AIModel';
import { PromptBuilder } from '../ai-engine/PromptBuilder';
import { ResponseParser } from '../ai-engine/ResponseParser';
import { TokenBudget } from '../ai-engine/TokenBudget';

describe('AIModel', () => {
  let model: AIModel;

  beforeEach(() => {
    model = new AIModel();
  });

  it('should have config property', () => {
    expect(model.config).toBeDefined();
    expect(typeof model.config).toBe('object');
  });

  it('should select a valid model', () => {
    expect(model.select('gpt-4o')).toBe(true);
    expect(model.getActiveModel()?.modelId).toBe('gpt-4o');
  });

  it('should not select an invalid model', () => {
    expect(model.select('non-existent')).toBe(false);
  });

  it('should deselect current model', () => {
    model.select('gpt-4o');
    model.deselect();
    expect(model.getActiveModel()).toBeNull();
  });

  it('should get all models', () => {
    const models = model.getModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('should add a custom model', () => {
    model.addModel({
      modelId: 'custom-model',
      provider: 'custom',
      name: 'Custom Model',
      version: '1.0',
      maxTokens: 50000,
      temperature: 0.5,
      topP: 0.9,
      enabled: true,
    });
    expect(model.getModels().find(m => m.modelId === 'custom-model')).toBeDefined();
  });

  it('should remove a model', () => {
    model.addModel({ modelId: 'test-model', provider: 'test', name: 'Test', version: '1.0', maxTokens: 1000, temperature: 0.5, topP: 0.9, enabled: true });
    expect(model.removeModel('test-model')).toBe(true);
  });

  it('should update a model', () => {
    expect(model.updateModel('gpt-4o', { temperature: 0.9 })).toBe(true);
  });

  it('should return snapshot with metrics', () => {
    model.select('gpt-4o');
    const snapshot = model.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.activeModel).toBe('gpt-4o');
    expect(snapshot.metrics.totalSelections).toBe(1);
  });

  it('should reset state', () => {
    model.select('gpt-4o');
    model.reset();
    expect(model.getActiveModel()).toBeNull();
  });

  it('should generate report', () => {
    const report = model.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('AI Model Report');
  });

  it('should export metrics', () => {
    const metrics = model.exportMetrics();
    expect(metrics).toHaveProperty('version');
    expect(metrics.version).toContain('V59');
  });
});

describe('PromptBuilder', () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  it('should have config property', () => {
    expect(builder.config).toBeDefined();
    expect(typeof builder.config).toBe('object');
  });

  it('should build prompt with variables', () => {
    const result = builder.build('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should handle multiple variables', () => {
    const result = builder.build('{{greeting}} {{name}}!', { greeting: 'Hi', name: 'Alice' });
    expect(result).toBe('Hi Alice!');
  });

  it('should combine prompts', () => {
    const result = builder.combine(['Prompt 1', 'Prompt 2', 'Prompt 3']);
    expect(result).toBe('Prompt 1\n\nPrompt 2\n\nPrompt 3');
  });

  it('should use preset', () => {
    const result = builder.preset('summarize', { content: 'Sample content' });
    expect(result).toBeTruthy();
    expect(result).toContain('Sample content');
  });

  it('should get all presets', () => {
    const presets = builder.getPresets();
    expect(Array.isArray(presets)).toBe(true);
    expect(presets.length).toBeGreaterThan(0);
  });

  it('should add custom preset', () => {
    builder.addPreset({
      id: 'custom-preset',
      name: 'Custom',
      template: 'Custom: {{value}}',
      variables: ['value'],
      category: 'test',
      usageCount: 0,
    });
    expect(builder.getPreset('custom-preset')).toBeDefined();
  });

  it('should set default variable', () => {
    builder.setDefaultVariable('app', 'DocEditor');
    const result = builder.build('Welcome to {{app}}!', {});
    expect(result).toBe('Welcome to DocEditor!');
  });

  it('should return snapshot with metrics', () => {
    builder.build('Test {{var}}', { var: 'value' });
    const snapshot = builder.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.builtCount).toBe(1);
  });

  it('should reset state', () => {
    builder.build('Test', {});
    builder.reset();
    expect(builder.getSnapshot().metrics.builtCount).toBe(0);
  });

  it('should generate report', () => {
    const report = builder.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Prompt Builder Report');
  });

  it('should export metrics', () => {
    const metrics = builder.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('ResponseParser', () => {
  let parser: ResponseParser;

  beforeEach(() => {
    parser = new ResponseParser();
  });

  it('should have config property', () => {
    expect(parser.config).toBeDefined();
    expect(typeof parser.config).toBe('object');
  });

  it('should parse JSON response', () => {
    const result = parser.parse('{"key": "value"}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
  });

  it('should handle non-JSON response', () => {
    const result = parser.parse('Plain text response');
    expect(result.success).toBe(true);
    expect(result.matchedPattern).toBe('raw');
  });

  it('should reject empty response', () => {
    const result = parser.parse('');
    expect(result.success).toBe(false);
  });

  it('should extract using pattern', () => {
    const extracted = parser.extract('# Heading\nSome text', 'markdown');
    expect(extracted.length).toBeGreaterThan(0);
  });

  it('should validate response', () => {
    expect(parser.validate('Valid response')).toBe(true);
    expect(parser.validate('')).toBe(false);
  });

  it('should get all patterns', () => {
    const patterns = parser.getPatterns();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('should add custom pattern', () => {
    parser.addPattern({
      id: 'custom-pattern',
      name: 'Custom',
      pattern: /custom_\w+/,
      extractGroup: 0,
      description: 'Custom pattern',
      usageCount: 0,
    });
    expect(parser.getPattern('custom-pattern')).toBeDefined();
  });

  it('should return snapshot with metrics', () => {
    parser.parse('{"test": true}');
    const snapshot = parser.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.parsedCount).toBe(1);
  });

  it('should reset state', () => {
    parser.parse('{}');
    parser.reset();
    expect(parser.getSnapshot().metrics.parsedCount).toBe(0);
  });

  it('should generate report', () => {
    const report = parser.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Response Parser Report');
  });

  it('should export metrics', () => {
    const metrics = parser.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('TokenBudget', () => {
  let budget: TokenBudget;

  beforeEach(() => {
    budget = new TokenBudget({ totalBudget: 100000 });
  });

  it('should have config property', () => {
    expect(budget.config).toBeDefined();
    expect(typeof budget.config).toBe('object');
  });

  it('should allocate tokens', () => {
    expect(budget.allocate('prompt', 10000)).toBe(true);
    expect(budget.getBudget('prompt').allocated).toBe(10000);
  });

  it('should reserve tokens', () => {
    expect(budget.reserve(5000)).toBe(true);
  });

  it('should calculate remaining tokens', () => {
    budget.allocate('prompt', 20000);
    expect(budget.remaining('prompt')).toBe(20000);
  });

  it('should get all budget allocations', () => {
    const allocations = budget.getBudget();
    expect(Array.isArray(allocations)).toBe(true);
  });

  it('should use tokens', () => {
    budget.allocate('prompt', 10000);
    expect(budget.use('prompt', 5000)).toBe(true);
    expect(budget.getBudget('prompt').used).toBe(5000);
  });

  it('should release tokens', () => {
    budget.allocate('prompt', 10000);
    budget.release('prompt', 5000);
    expect(budget.getBudget('prompt').allocated).toBe(5000);
  });

  it('should respect hard limit', () => {
    const strictBudget = new TokenBudget({ totalBudget: 1000, hardLimit: true });
    expect(strictBudget.allocate('prompt', 2000)).toBe(false);
  });

  it('should trigger warning threshold', () => {
    const warnBudget = new TokenBudget({ totalBudget: 100, warningThreshold: 0.5 });
    warnBudget.allocate('prompt', 100);
    warnBudget.use('prompt', 60);
    expect(warnBudget.getSnapshot().metrics.warningTriggered).toBe(true);
  });

  it('should return snapshot with metrics', () => {
    budget.allocate('prompt', 10000);
    const snapshot = budget.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.totalAllocated).toBe(10000);
  });

  it('should reset state', () => {
    budget.allocate('prompt', 10000);
    budget.reset();
    expect(budget.remaining()).toBe(100000);
  });

  it('should generate report', () => {
    const report = budget.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Token Budget Report');
  });

  it('should export metrics', () => {
    const metrics = budget.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});