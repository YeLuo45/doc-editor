// ============================================================
// ContentPipeline Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentPipeline, pipeline, createContentPipeline, PipelineStage } from '../pipeline/index.js';

describe('ContentPipeline', () => {
  let testPipeline: ContentPipeline<string, string>;

  beforeEach(() => {
    testPipeline = new ContentPipeline<string, string>({ name: 'test-pipeline' });
  });

  describe('constructor', () => {
    it('should create pipeline with name', () => {
      const p = new ContentPipeline<string, string>({ name: 'my-pipeline' });
      expect(p.name).toBe('my-pipeline');
    });

    it('should create pipeline with description', () => {
      const p = new ContentPipeline<string, string>({ name: 'test', description: 'Test description' });
      expect(p.description).toBe('Test description');
    });

    it('should use default config values', () => {
      const p = new ContentPipeline<string, string>({ name: 'test' });
      expect(p.getStatus()).toBe('idle');
    });
  });

  describe('addStage', () => {
    it('should add a stage to pipeline', () => {
      const stage = new PipelineStage({
        id: 'stage1',
        name: 'Stage 1',
        processor: async (input: string) => input,
      });
      testPipeline.addStage(stage);
      expect(testPipeline.hasStage('stage1')).toBe(true);
    });

    it('should return pipeline for chaining', () => {
      const stage = new PipelineStage({ id: 's1', name: 'S1', processor: async (i: string) => i });
      const result = testPipeline.addStage(stage);
      expect(result).toBe(testPipeline);
    });

    it('should throw when adding stage while running', async () => {
      const stage = new PipelineStage({
        id: 's1',
        name: 'S1',
        processor: async (i: string) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return i;
        },
      });
      testPipeline.addStage(stage);

      let pipelineStarted = false;
      testPipeline.on('stage_start', () => { pipelineStarted = true; });

      const executePromise = testPipeline.execute('test');

      // Poll until pipeline actually starts
      for (let i = 0; i < 50 && !pipelineStarted; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      let threw = false;
      try {
        testPipeline.addStage(new PipelineStage({ id: 's2', name: 'S2', processor: async (i: string) => i }));
      } catch (e: any) {
        threw = e.message.includes('running');
      }
      expect(threw).toBe(true);

      await executePromise;
    });
  });

  describe('addStageAt', () => {
    it('should insert stage at specific index', () => {
      const s1 = new PipelineStage({ id: 's1', name: 'S1', processor: async (i: string) => i });
      const s2 = new PipelineStage({ id: 's2', name: 'S2', processor: async (i: string) => i });
      const s3 = new PipelineStage({ id: 's3', name: 'S3', processor: async (i: string) => i });

      testPipeline.addStage(s1);
      testPipeline.addStage(s2);
      testPipeline.addStageAt(s3, 1);

      const stages = testPipeline.getAllStages();
      expect(stages[1].id).toBe('s3');
    });

    it('should throw on invalid index', () => {
      const s1 = new PipelineStage({ id: 's1', name: 'S1', processor: async (i: string) => i });
      testPipeline.addStage(s1);
      expect(() => testPipeline.addStageAt(s1, 10)).toThrow('Invalid stage index');
    });
  });

  describe('removeStage', () => {
    it('should remove existing stage', () => {
      const stage = new PipelineStage({ id: 's1', name: 'S1', processor: async (i: string) => i });
      testPipeline.addStage(stage);
      expect(testPipeline.removeStage('s1')).toBe(true);
      expect(testPipeline.hasStage('s1')).toBe(false);
    });

    it('should return false for non-existent stage', () => {
      expect(testPipeline.removeStage('nonexistent')).toBe(false);
    });
  });

  describe('getStage', () => {
    it('should return stage by id', () => {
      const stage = new PipelineStage({ id: 'test-stage', name: 'Test Stage', processor: async (i: string) => i });
      testPipeline.addStage(stage);
      const found = testPipeline.getStage('test-stage');
      expect(found?.id).toBe('test-stage');
    });

    it('should return undefined for non-existent stage', () => {
      expect(testPipeline.getStage('nonexistent')).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should execute single stage pipeline', async () => {
      const stage = new PipelineStage({
        id: 'transform',
        name: 'Transform',
        processor: async (input: string) => input.toUpperCase(),
      });
      testPipeline.addStage(stage);

      const result = await testPipeline.execute('hello');

      expect(result.success).toBe(true);
      expect(result.output).toBe('HELLO');
      expect(result.stagesExecuted).toBe(1);
    });

    it('should execute multiple stages sequentially', async () => {
      const stage1 = new PipelineStage({
        id: 's1',
        name: 'Stage 1',
        processor: async (input: string) => input.toUpperCase(),
      });
      const stage2 = new PipelineStage({
        id: 's2',
        name: 'Stage 2',
        processor: async (input: string) => `${input}!`,
      });

      testPipeline.addStage(stage1);
      testPipeline.addStage(stage2);

      const result = await testPipeline.execute('hello');

      expect(result.success).toBe(true);
      expect(result.output).toBe('HELLO!');
      expect(result.stagesExecuted).toBe(2);
    });

    it('should handle pipeline with no stages', async () => {
      const result = await testPipeline.execute('input');
      expect(result.success).toBe(true);
      expect(result.output).toBe('input');
      expect(result.stagesExecuted).toBe(0);
    });

    it('should skip stages that match skipIf condition', async () => {
      const stage = new PipelineStage({
        id: 'conditional',
        name: 'Conditional Stage',
        processor: async (input: string) => input,
        skipIf: (input: string) => input.startsWith('skip'),
      });
      testPipeline.addStage(stage);

      const result1 = await testPipeline.execute('hello');
      const result2 = await testPipeline.execute('skip-me');

      expect(result1.stagesExecuted).toBe(1);
      expect(result2.stagesSkipped).toBe(1);
    });

    it('should continue on error when configured', async () => {
      const stage1 = new PipelineStage({
        id: 'failing',
        name: 'Failing Stage',
        processor: async () => { throw new Error('Stage failed'); },
      });
      const stage2 = new PipelineStage({
        id: 's2',
        name: 'Stage 2',
        processor: async (input: string) => `${input}-processed`,
      });

      testPipeline = new ContentPipeline<string, string>({
        name: 'test',
        continueOnError: true,
      });
      (testPipeline as any).addStage(stage1);
      (testPipeline as any).addStage(stage2);

      const result = await testPipeline.execute('input');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track metrics when enabled', async () => {
      const stage = new PipelineStage({
        id: 'metrics-stage',
        name: 'Metrics Stage',
        processor: async (input: string) => input,
      });
      testPipeline.addStage(stage);

      await testPipeline.execute('test');

      const metrics = testPipeline.getMetrics();
      expect(metrics.stageMetrics.has('metrics-stage')).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should emit stage_start events', async () => {
      const stage = new PipelineStage({
        id: 'event-stage',
        name: 'Event Stage',
        processor: async (input: string) => input,
      });
      testPipeline.addStage(stage);

      let eventEmitted = false;
      testPipeline.on('stage_start', () => { eventEmitted = true; });

      await testPipeline.execute('test');
      expect(eventEmitted).toBe(true);
    });

    it('should emit stage_complete events', async () => {
      const stage = new PipelineStage({
        id: 'complete-stage',
        name: 'Complete Stage',
        processor: async (input: string) => input,
      });
      testPipeline.addStage(stage);

      let completeCount = 0;
      testPipeline.on('stage_complete', () => { completeCount++; });

      await testPipeline.execute('test');
      expect(completeCount).toBe(1);
    });

    it('should support wildcard event listeners', async () => {
      const stage = new PipelineStage({
        id: 'wildcard-stage',
        name: 'Wildcard Stage',
        processor: async (input: string) => input,
      });
      testPipeline.addStage(stage);

      let eventCount = 0;
      testPipeline.on('*', () => { eventCount++; });

      await testPipeline.execute('test');
      expect(eventCount).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset pipeline metrics and status', async () => {
      const stage = new PipelineStage({
        id: 'reset-stage',
        name: 'Reset Stage',
        processor: async (input: string) => input,
      });
      testPipeline.addStage(stage);

      await testPipeline.execute('test');
      testPipeline.reset();

      const metrics = testPipeline.getMetrics();
      expect(testPipeline.getStatus()).toBe('idle');
      expect(metrics.iterations).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create a copy of the pipeline', () => {
      const stage = new PipelineStage({ id: 'clone-stage', name: 'Clone Stage', processor: async (i: string) => i });
      testPipeline.addStage(stage);

      const cloned = testPipeline.clone();

      expect(cloned.name).toBe(testPipeline.name);
      expect(cloned.getAllStages().length).toBe(1);
    });
  });
});

describe('pipeline factory', () => {
  it('should create pipeline using factory function', () => {
    const p = createContentPipeline({ name: 'factory-pipeline' });
    expect(p.name).toBe('factory-pipeline');
  });

  it('should create pipeline using builder', () => {
    const p = pipeline('builder-pipeline')
      .withStage(new PipelineStage({ id: 's1', name: 'S1', processor: async (i: string) => i }))

      .build();

    expect(p.name).toBe('builder-pipeline');
    expect(p.getAllStages().length).toBe(1);
  });

  it('should allow configuring builder options', () => {
    const p = pipeline('configured-pipeline')
      .withFeedbackLoop(true)
      .withMaxIterations(5)
      .continueOnError(false)
      .build();

    expect(p.getStatus()).toBe('idle');
  });
});

describe('ContentPipeline with processors', () => {
  it('should handle async processors', async () => {
    const pl = new ContentPipeline<string, string>({
      name: 'async-pipeline',
    });

    pl.addStage(new PipelineStage({
      id: 'async-stage',
      name: 'Async Stage',
      processor: async (input: string) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return input.toUpperCase();
      },
    }));

    const result = await pl.execute('async-test');
    expect(result.output).toBe('ASYNC-TEST');
  });

  it('should handle sync processors', async () => {
    const pl = new ContentPipeline<string, string>({
      name: 'sync-pipeline',
    });

    pl.addStage(new PipelineStage({
      id: 'sync-stage',
      name: 'Sync Stage',
      processor: (input: string) => input.toUpperCase(),
    }));

    const result = await pl.execute('sync-test');
    expect(result.success).toBe(true);
  });
});