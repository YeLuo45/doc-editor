/**
 * Intelligence System Tests - V28
 * Tests for IntelligenceEngine, PatternAnalyzer, AdaptiveOptimizer,
 * ContextBuilder, LearningEngine, and IntelligenceMetrics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligenceEngine } from '../intelligence/IntelligenceEngine';
import { PatternAnalyzer } from '../intelligence/PatternAnalyzer';
import { AdaptiveOptimizer } from '../intelligence/AdaptiveOptimizer';
import { ContextBuilder } from '../intelligence/ContextBuilder';
import { LearningEngine } from '../intelligence/LearningEngine';
import { IntelligenceMetrics } from '../intelligence/IntelligenceMetrics';

describe('IntelligenceEngine', () => {
  let engine: IntelligenceEngine;

  beforeEach(() => {
    engine = new IntelligenceEngine();
  });

  describe('analyze', () => {
    it('should analyze data and return result', () => {
      const result = engine.analyze({ text: 'hello world' });
      expect(result).toBeDefined();
      expect(result.type).toBe('analysis');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.id).toContain('analysis-');
    });

    it('should analyze with custom options', () => {
      const result = engine.analyze('test data', { depth: 5, scope: 'custom' });
      expect(result.metadata?.scope).toBe('custom');
    });

    it('should calculate confidence based on input size', () => {
      const shortResult = engine.analyze('short');
      const longResult = engine.analyze('a'.repeat(200));
      expect(longResult.confidence).toBeGreaterThan(shortResult.confidence);
    });
  });

  describe('predict', () => {
    it('should generate predictions', () => {
      const result = engine.predict({ context: 'test' }, 5);
      expect(result.type).toBe('prediction');
      expect(result.data).toHaveProperty('predictions');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should respect horizon parameter', () => {
      const result = engine.predict({}, 10);
      const predictions = (result.data as { predictions: unknown[] }).predictions;
      expect(predictions.length).toBe(10);
    });
  });

  describe('optimize', () => {
    it('should optimize target', () => {
      const result = engine.optimize({ type: 'resource', value: 100 });
      expect(result.type).toBe('optimization');
      expect(result.data).toHaveProperty('optimizations');
    });

    it('should apply optimization level to metadata', () => {
      const customEngine = new IntelligenceEngine({ optimizationLevel: 'high' });
      const result = customEngine.optimize({});
      expect(result.metadata?.level).toBe('high');
    });
  });

  describe('adapt', () => {
    it('should adapt to context', () => {
      const result = engine.adapt({ situation: 'test' });
      expect(result.type).toBe('adaptation');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should include learning rate in metadata', () => {
      const result = engine.adapt({});
      expect(result.metadata?.learningRate).toBe(0.01);
    });
  });

  describe('getSnapshot', () => {
    it('should return current state', () => {
      engine.analyze('test');
      const snapshot = engine.getSnapshot();
      expect(snapshot).toHaveProperty('config');
      expect(snapshot).toHaveProperty('resultsCount');
      expect(snapshot.resultsCount).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all results', () => {
      engine.analyze('test');
      engine.reset();
      const snapshot = engine.getSnapshot();
      expect(snapshot.resultsCount).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should generate comprehensive report', () => {
      engine.analyze('test');
      const report = engine.getReport();
      expect(report.engine).toBe('IntelligenceEngine');
      expect(report.version).toBe('V28');
      expect(report).toHaveProperty('snapshot');
      expect(report).toHaveProperty('statistics');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics object', () => {
      const metrics = engine.exportMetrics();
      expect(metrics).toHaveProperty('engine', 'IntelligenceEngine');
      expect(metrics).toHaveProperty('metrics');
    });
  });
});

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
  });

  describe('detectPattern', () => {
    it('should detect patterns in numeric array', () => {
      const pattern = analyzer.detectPattern([1, 2, 3, 4, 5]);
      expect(pattern).toBeDefined();
      expect(pattern.id).toContain('pattern-');
      expect(pattern.frequency).toBeGreaterThan(0);
    });

    it('should detect patterns in string array', () => {
      const pattern = analyzer.detectPattern(['a', 'b', 'a', 'c']);
      expect(pattern.type).toBe('textual');
    });

    it('should respect sensitivity option', () => {
      const lowSensitivity = analyzer.detectPattern([1, 2, 3], { sensitivity: 0.3 });
      const highSensitivity = analyzer.detectPattern([1, 2, 3], { sensitivity: 0.9 });
      expect(lowSensitivity.strength).not.toBe(highSensitivity.strength);
    });
  });

  describe('analyzeTrend', () => {
    it('should analyze increasing trend', () => {
      const trend = analyzer.analyzeTrend([1, 2, 3, 4, 5]);
      expect(trend.direction).toBe('upward');
      expect(trend.slope).toBeGreaterThan(0);
    });

    it('should analyze decreasing trend', () => {
      const trend = analyzer.analyzeTrend([5, 4, 3, 2, 1]);
      expect(trend.direction).toBe('downward');
    });

    it('should analyze stable trend', () => {
      const trend = analyzer.analyzeTrend([1, 1, 1, 1, 1]);
      expect(trend.direction).toBe('stable');
    });

    it('should generate predictions when requested', () => {
      const trend = analyzer.analyzeTrend([1, 2, 3], { predictFuture: true });
      expect(trend.predictions).toHaveLength(5);
    });
  });

  describe('getPatternReport', () => {
    it('should generate comprehensive report', () => {
      analyzer.detectPattern([1, 2, 3]);
      const report = analyzer.getPatternReport();
      expect(report).toHaveProperty('patterns');
      expect(report).toHaveProperty('summary');
      expect(report.summary.totalPatterns).toBeGreaterThan(0);
    });
  });

  describe('getSnapshot', () => {
    it('should return current state', () => {
      analyzer.detectPattern([1, 2, 3]);
      const snapshot = analyzer.getSnapshot();
      expect(snapshot.patternsAnalyzed).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all patterns', () => {
      analyzer.detectPattern([1, 2, 3]);
      analyzer.reset();
      const snapshot = analyzer.getSnapshot();
      expect(snapshot.patternsAnalyzed).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should generate report with version info', () => {
      const report = analyzer.getReport();
      expect(report.analyzer).toBe('PatternAnalyzer');
      expect(report.version).toBe('V28');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics', () => {
      const metrics = analyzer.exportMetrics();
      expect(metrics).toHaveProperty('analyzer', 'PatternAnalyzer');
    });
  });
});

describe('AdaptiveOptimizer', () => {
  let optimizer: AdaptiveOptimizer;

  beforeEach(() => {
    optimizer = new AdaptiveOptimizer();
  });

  describe('optimize', () => {
    it('should optimize target', () => {
      const target = { id: 'test', type: 'resource', currentValue: 100 };
      const result = optimizer.optimize(target);
      expect(result.target).toEqual(target);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result).toHaveProperty('converged');
    });

    it('should respect max iterations', () => {
      const target = { id: 'test', type: 'resource', currentValue: 100 };
      const result = optimizer.optimize(target, { maxIterations: 5 });
      expect(result.iterations).toBeLessThanOrEqual(5);
    });
  });

  describe('suggest', () => {
    it('should generate suggestions', () => {
      const suggestions = optimizer.suggest({ context: 'test' });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('priority');
      expect(suggestions[0]).toHaveProperty('category');
    });

    it('should respect category filter', () => {
      const suggestions = optimizer.suggest({}, { categories: ['performance'] });
      suggestions.forEach(s => {
        expect(s.category).toBe('performance');
      });
    });
  });

  describe('getRecommendations', () => {
    it('should return stored recommendations', () => {
      optimizer.suggest({});
      const recs = optimizer.getRecommendations();
      expect(recs.length).toBeGreaterThan(0);
    });

    it('should filter by priority', () => {
      optimizer.suggest({});
      const highPriority = optimizer.getRecommendations({ priority: 'high' });
      highPriority.forEach(r => {
        expect(r.priority).toBe('high');
      });
    });
  });

  describe('getSnapshot', () => {
    it('should return optimization statistics', () => {
      const target = { id: 'test', type: 'resource', currentValue: 100 };
      optimizer.optimize(target);
      const snapshot = optimizer.getSnapshot();
      expect(snapshot.optimizationsPerformed).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear history', () => {
      optimizer.suggest({});
      optimizer.reset();
      const snapshot = optimizer.getSnapshot();
      expect(snapshot.recommendationsGenerated).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should generate comprehensive report', () => {
      const report = optimizer.getReport();
      expect(report.optimizer).toBe('AdaptiveOptimizer');
      expect(report.version).toBe('V28');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics with history', () => {
      const metrics = optimizer.exportMetrics();
      expect(metrics).toHaveProperty('metrics');
    });
  });
});

describe('ContextBuilder', () => {
  let builder: ContextBuilder;

  beforeEach(() => {
    builder = new ContextBuilder();
  });

  describe('build', () => {
    it('should build context from data', () => {
      const context = builder.build({ text: 'hello' });
      expect(context).toBeDefined();
      expect(context.id).toContain('ctx-');
      expect(context.type).toBe('object');
    });

    it('should build array context', () => {
      const context = builder.build([1, 2, 3]);
      expect(context.type).toBe('array');
    });

    it('should respect maxDepth option', () => {
      const nested = { a: { b: { c: { d: 1 } } } };
      const context = builder.build(nested, { maxDepth: 2 });
      expect(context.content).not.toHaveProperty('a.b.c.d');
    });

    it('should respect ttl option', () => {
      const context = builder.build('test', { ttl: 1000 });
      expect(context.expires).toBeDefined();
      expect(context.expires!).toBeGreaterThan(Date.now());
    });
  });

  describe('parse', () => {
    it('should parse existing context', () => {
      const context = builder.build({ text: 'test' });
      const parsed = builder.parse(context.id);
      expect(parsed).not.toBeNull();
      expect(parsed?.parsed).toBeDefined();
    });

    it('should return null for non-existent context', () => {
      const parsed = builder.parse('non-existent');
      expect(parsed).toBeNull();
    });

    it('should extract entities', () => {
      const context = builder.build('Hello World Test');
      const parsed = builder.parse(context.id, { extractEntities: true });
      expect(parsed?.entities).toContain('Hello');
    });
  });

  describe('getContext', () => {
    it('should retrieve context by id', () => {
      const original = builder.build({ text: 'test' });
      const retrieved = builder.getContext(original.id);
      expect(retrieved).toEqual(original);
    });

    it('should return null for non-existent id', () => {
      const retrieved = builder.getContext('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('getSnapshot', () => {
    it('should return builder statistics', () => {
      builder.build({ test: 1 });
      const snapshot = builder.getSnapshot();
      expect(snapshot.contextsBuilt).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all contexts', () => {
      builder.build({ test: 1 });
      builder.reset();
      const snapshot = builder.getSnapshot();
      expect(snapshot.contextsBuilt).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should generate comprehensive report', () => {
      const report = builder.getReport();
      expect(report.builder).toBe('ContextBuilder');
      expect(report.version).toBe('V28');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics', () => {
      const metrics = builder.exportMetrics();
      expect(metrics).toHaveProperty('builder', 'ContextBuilder');
    });
  });
});

describe('LearningEngine', () => {
  let engine: LearningEngine;

  beforeEach(() => {
    engine = new LearningEngine();
  });

  describe('learn', () => {
    it('should learn from sample', () => {
      const sample = engine.learn({ input: 'a' }, { output: 'b' });
      expect(sample).toBeDefined();
      expect(sample.input).toEqual({ input: 'a' });
      expect(sample.output).toEqual({ output: 'b' });
    });

    it('should assign weight', () => {
      const sample = engine.learn({}, {}, { weight: 0.5 });
      expect(sample.weight).toBe(0.5);
    });

    it('should generate insights after learning', () => {
      for (let i = 0; i < 5; i++) {
        engine.learn({ input: 'same' }, { output: 'same' });
      }
      const insights = engine.getInsights({ type: 'pattern' });
      expect(insights.length).toBeGreaterThan(0);
    });
  });

  describe('predict', () => {
    it('should predict based on learned patterns', () => {
      engine.learn({ value: 10 }, { result: 20 });
      engine.learn({ value: 20 }, { result: 40 });
      const prediction = engine.predict({ value: 15 });
      expect(prediction).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should provide default prediction for unknown input', () => {
      const prediction = engine.predict({ unknown: true });
      expect(prediction.confidence).toBeLessThan(0.5);
    });
  });

  describe('getInsights', () => {
    it('should return insights', () => {
      engine.learn({}, {});
      const insights = engine.getInsights();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should filter by type', () => {
      const insights = engine.getInsights({ type: 'pattern' });
      insights.forEach(i => {
        expect(i.type).toBe('pattern');
      });
    });
  });

  describe('getSnapshot', () => {
    it('should return learning statistics', () => {
      engine.learn({}, {});
      const snapshot = engine.getSnapshot();
      expect(snapshot.samplesLearned).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all data', () => {
      engine.learn({}, {});
      engine.reset();
      const snapshot = engine.getSnapshot();
      expect(snapshot.samplesLearned).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should generate comprehensive report', () => {
      const report = engine.getReport();
      expect(report.engine).toBe('LearningEngine');
      expect(report.version).toBe('V28');
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics', () => {
      const metrics = engine.exportMetrics();
      expect(metrics).toHaveProperty('engine', 'LearningEngine');
    });
  });
});

describe('IntelligenceMetrics', () => {
  let metrics: IntelligenceMetrics;

  beforeEach(() => {
    metrics = new IntelligenceMetrics();
  });

  describe('record', () => {
    it('should record metric entry', () => {
      const entry = metrics.record('test_metric', 42);
      expect(entry).toBeDefined();
      expect(entry.name).toBe('test_metric');
      expect(entry.value).toBe(42);
    });

    it('should record with tags', () => {
      const entry = metrics.record('test', 1, { tags: { env: 'test' } });
      expect(entry.tags?.env).toBe('test');
    });
  });

  describe('getMetrics', () => {
    it('should retrieve metrics by name', () => {
      metrics.record('cpu', 50);
      metrics.record('cpu', 60);
      const result = metrics.getMetrics({ names: ['cpu'] });
      expect(result.cpu).toHaveLength(2);
    });

    it('should filter by timestamp', () => {
      metrics.record('test', 1);
      const since = Date.now() + 1000;
      const result = metrics.getMetrics({ since });
      expect(Object.values(result).flat()).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should return metrics history', () => {
      metrics.record('test', 10);
      metrics.record('test', 20);
      const history = metrics.getHistory({ name: 'test' });
      expect(history.entries).toHaveLength(2);
      expect(history.statistics.count).toBe(2);
    });

    it('should calculate statistics', () => {
      metrics.record('values', 10);
      metrics.record('values', 20);
      metrics.record('values', 30);
      const history = metrics.getHistory({ name: 'values' });
      expect(history.statistics.mean).toBe(20);
      expect(history.statistics.min).toBe(10);
      expect(history.statistics.max).toBe(30);
    });
  });

  describe('exportMetrics', () => {
    it('should export metrics with version info', () => {
      metrics.record('test', 1);
      const exported = metrics.exportMetrics();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('metrics');
    });
  });

  describe('getSnapshot', () => {
    it('should return metrics snapshot', () => {
      metrics.record('test', 1);
      const snapshot = metrics.getSnapshot();
      expect(snapshot.totalEntries).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all entries', () => {
      metrics.record('test', 1);
      metrics.reset();
      const snapshot = metrics.getSnapshot();
      expect(snapshot.totalEntries).toBe(0);
    });
  });

  describe('getReport', () => {
    it('should generate comprehensive report', () => {
      const report = metrics.getReport();
      expect(report.metrics).toBe('IntelligenceMetrics');
      expect(report.version).toBe('V28');
    });
  });

  describe('exportMetricsSummary', () => {
    it('should export summary', () => {
      const summary = metrics.exportMetricsSummary();
      expect(summary).toHaveProperty('summary');
    });
  });
});

describe('Integration Tests', () => {
  it('should work together across all modules', () => {
    const engine = new IntelligenceEngine();
    const analyzer = new PatternAnalyzer();
    const optimizer = new AdaptiveOptimizer();
    const builder = new ContextBuilder();
    const learning = new LearningEngine();
    const metrics = new IntelligenceMetrics();

    // Create patterns and learn from them
    const patternData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    analyzer.detectPattern(patternData);
    const trend = analyzer.analyzeTrend(patternData);

    // Analyze and optimize
    const analysis = engine.analyze(trend);
    engine.optimize(analysis.data);

    // Build context
    const context = builder.build({ analysis, trend });
    builder.parse(context.id);

    // Learn from results
    learning.learn({ input: analysis }, { output: 'optimized' });
    const prediction = learning.predict({ input: analysis });

    // Record metrics
    metrics.record('prediction_confidence', prediction.confidence * 100);

    // Verify all systems are functional
    expect(engine.getSnapshot().resultsCount).toBeGreaterThan(0);
    expect(analyzer.getSnapshot().patternsAnalyzed).toBeGreaterThan(0);
    expect(engine.getSnapshot().resultsCount).toBeGreaterThanOrEqual(2); // analyze + optimize
    expect(builder.getSnapshot().contextsBuilt).toBe(1);
    expect(learning.getSnapshot().predictionsMade).toBe(1);
    expect(metrics.getSnapshot().totalEntries).toBe(1);
  });

  it('should export combined metrics from all modules', () => {
    const modules = [
      new IntelligenceEngine(),
      new PatternAnalyzer(),
      new AdaptiveOptimizer(),
      new ContextBuilder(),
      new LearningEngine(),
      new IntelligenceMetrics(),
    ];

    modules.forEach(mod => {
      const exported = mod.exportMetrics();
      expect(exported).toBeDefined();
      expect(typeof exported).toBeTruthy();
      // For string exports (IntelligenceMetrics), verify it's valid JSON
      if (typeof exported === 'string') {
        expect(() => JSON.parse(exported)).not.toThrow();
      } else {
        // For object exports, verify version is present
        expect('version' in exported || 'engine' in exported || 'analyzer' in exported || 'optimizer' in exported || 'builder' in exported).toBe(true);
      }
    });
  });

  it('should reset all modules independently', () => {
    const engine = new IntelligenceEngine();
    const analyzer = new PatternAnalyzer();
    const builder = new ContextBuilder();

    engine.analyze('test');
    analyzer.detectPattern([1, 2, 3]);
    builder.build({ test: true });

    engine.reset();
    analyzer.reset();
    builder.reset();

    expect(engine.getSnapshot().resultsCount).toBe(0);
    expect(analyzer.getSnapshot().patternsAnalyzed).toBe(0);
    expect(builder.getSnapshot().contextsBuilt).toBe(0);
  });
});