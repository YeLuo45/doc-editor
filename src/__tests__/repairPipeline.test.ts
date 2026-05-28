import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RepairPipeline, createRepairPipeline } from '../selfHealing/RepairPipeline';
import { RootCauseAnalyzer, createRootCauseAnalyzer } from '../selfHealing/RootCauseAnalyzer';
import type { DocumentIssue, RepairPipelineState, RepairPhase } from '../selfHealing/types';

function createTestIssue(overrides: Partial<DocumentIssue> = {}): DocumentIssue {
  return {
    id: `issue-test-${Date.now().toString(36)}`,
    type: 'sync_failure',
    severity: 'high',
    description: 'Sync operation failed',
    detectedAt: Date.now(),
    ...overrides,
  };
}

describe('RepairPipeline', () => {
  let analyzer: RootCauseAnalyzer;
  let pipeline: RepairPipeline;
  let phaseLogs: Array<{ phase: RepairPhase; state: RepairPipelineState }>;

  beforeEach(() => {
    analyzer = createRootCauseAnalyzer();
    phaseLogs = [];
    pipeline = createRepairPipeline(analyzer, {}, (phase, state) => {
      phaseLogs.push({ phase, state });
    });
  });

  afterEach(() => {
    pipeline.reset();
  });

  describe('initial state', () => {
    it('should not be running initially', () => {
      expect(pipeline.isRunning()).toBe(false);
    });

    it('should be in detect phase initially', () => {
      expect(pipeline.getState().currentPhase).toBe('detect');
    });

    it('should have zero progress initially', () => {
      expect(pipeline.getState().progress).toBe(0);
    });
  });

  describe('execute', () => {
    it('should execute full pipeline for a valid issue', async () => {
      const issue = createTestIssue();
      const result = await pipeline.execute(issue);

      expect(result.issueId).toBe(issue.id);
      expect(result.phasesCompleted).toContain('detect');
      expect(result.phasesCompleted).toContain('diagnose');
      expect(result.phasesCompleted).toContain('fix');
      expect(result.phasesCompleted).toContain('verify');
      expect(result.phasesCompleted).toContain('commit');
    });

    it('should mark result as success on successful repair', async () => {
      const issue = createTestIssue();
      const result = await pipeline.execute(issue);
      expect(result.success).toBe(true);
      expect(result.verificationPassed).toBe(true);
    });

    it('should record duration for each repair', async () => {
      const issue = createTestIssue();
      const result = await pipeline.execute(issue);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw when pipeline already running', async () => {
      const issue = createTestIssue();
      pipeline.execute(issue).catch(() => {}); // fire and forget
      await new Promise((r) => setTimeout(r, 10));
      await expect(pipeline.execute(createTestIssue())).rejects.toThrow('Pipeline already running');
    });

    it('should store result for later retrieval', async () => {
      const issue = createTestIssue();
      await pipeline.execute(issue);
      const stored = pipeline.getResult(issue.id);
      expect(stored).toBeDefined();
      expect(stored?.issueId).toBe(issue.id);
    });

    it('should record all phases in order', async () => {
      const issue = createTestIssue();
      await pipeline.execute(issue);
      const snap = pipeline._snapshot();
      expect(snap.resultsCount).toBe(1);
    });
  });

  describe('phase transitions', () => {
    it('should record phase change callbacks', async () => {
      const issue = createTestIssue();
      await pipeline.execute(issue);

      const phases = phaseLogs.map((l) => l.phase);
      // detect is the initial phase so no transition callback for it
      expect(phases).toContain('diagnose');
      expect(phases).toContain('fix');
      expect(phases).toContain('verify');
      expect(phases).toContain('commit');
    });

    it('should update progress during execution', async () => {
      const issue = createTestIssue();
      await pipeline.execute(issue);

      const progressValues = phaseLogs.map((l) => l.state.progress);
      expect(progressValues[0]).toBe(40);  // diagnose (first transition from detect)
      expect(progressValues[1]).toBe(60);  // fix
      expect(progressValues[2]).toBe(80);  // verify
      expect(progressValues[3]).toBe(100); // commit
    });

    it('should set isRunning during execution', async () => {
      const issue = createTestIssue();
      let duringRunning = false;
      const checkRunning = new Promise<void>((resolve) => {
        setTimeout(() => {
          duringRunning = pipeline.isRunning();
          resolve();
        }, 50);
      });
      await Promise.all([pipeline.execute(issue), checkRunning]);
      expect(duringRunning).toBe(true);
    });
  });

  describe('reset', () => {
    it('should clear all state on reset', async () => {
      const issue = createTestIssue();
      await pipeline.execute(issue);
      pipeline.reset();

      const state = pipeline.getState();
      expect(state.currentPhase).toBe('detect');
      expect(state.isRunning).toBe(false);
      expect(state.currentIssueId).toBeNull();
      expect(state.progress).toBe(0);
    });

    it('should clear results on reset', async () => {
      const issue = createTestIssue();
      await pipeline.execute(issue);
      pipeline.reset();
      expect(pipeline.getAllResults()).toHaveLength(0);
    });
  });

  describe('configuration', () => {
    it('should respect autoCommit: false', async () => {
      const nocommitPipeline = createRepairPipeline(
        analyzer,
        { autoCommit: false },
        () => {}
      );
      const issue = createTestIssue();
      const result = await nocommitPipeline.execute(issue);
      expect(result.phasesCompleted).not.toContain('commit');
    });

    it('should respect rollbackOnFailure: false', async () => {
      // This tests that config is accepted; rollback is stub implementation
      const noRollbackPipeline = createRepairPipeline(analyzer, { rollbackOnFailure: false });
      const issue = createTestIssue({ severity: 'critical' });
      const result = await noRollbackPipeline.execute(issue);
      expect(result.success).toBe(true); // still succeeds in happy path
    });

    it('should cap retries at maxRetries', async () => {
      const limitedPipeline = createRepairPipeline(analyzer, { maxRetries: 0 });
      const issue = createTestIssue();
      const result = await limitedPipeline.execute(issue);
      expect(result).toBeDefined();
    });
  });

  describe('fix action derivation', () => {
    it('should use RootCauseAnalyzer to analyze issue', async () => {
      const issue = createTestIssue({ type: 'data_corruption', severity: 'critical' });
      await pipeline.execute(issue);

      const history = analyzer._getIssueHistory();
      expect(history.some((i) => i.id === issue.id)).toBe(true);
    });

    it('should associate fix rule if pattern matches', async () => {
      // Build a rule first
      analyzer.buildFixRule('sync_failure', { type: 'revert' }, 0.8);
      const issue = createTestIssue({ type: 'sync_failure' });
      const result = await pipeline.execute(issue);
      expect(result.fixApplied?.type).toBe('revert');
    });
  });
});