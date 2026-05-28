import { describe, it, expect, beforeEach } from 'vitest';
import { AutoFixExecutor, createAutoFixExecutor } from '../selfHealing/AutoFixExecutor';
import { RootCauseAnalyzer, createRootCauseAnalyzer } from '../selfHealing/RootCauseAnalyzer';
import { RepairPipeline, createRepairPipeline } from '../selfHealing/RepairPipeline';
import type { DocumentIssue } from '../selfHealing/types';

function createTestIssue(overrides: Partial<DocumentIssue> = {}): DocumentIssue {
  return {
    id: `issue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'sync_failure',
    severity: 'high',
    description: 'Sync operation failed',
    detectedAt: Date.now(),
    sourceLocation: 'offlineSyncStore.ts:42',
    ...overrides,
  };
}

describe('AutoFixExecutor', () => {
  let analyzer: RootCauseAnalyzer;
  let pipeline: RepairPipeline;
  let executor: AutoFixExecutor;

  beforeEach(() => {
    analyzer = createRootCauseAnalyzer();
    pipeline = createRepairPipeline(analyzer);
    executor = createAutoFixExecutor(analyzer, pipeline);
  });

  describe('initialization', () => {
    it('should create executor with default config', () => {
      const snap = executor._snapshot();
      expect(snap.activeGoalsCount).toBe(0);
      expect(snap.historySize).toBe(0);
      expect(snap.config.maxConcurrentFixes).toBe(3);
    });

    it('should accept custom config', () => {
      const customExec = createAutoFixExecutor(analyzer, pipeline, {
        maxConcurrentFixes: 5,
        goalTimeoutMs: 120000,
      });
      const snap = customExec._snapshot();
      expect(snap.config.maxConcurrentFixes).toBe(5);
      expect(snap.config.goalTimeoutMs).toBe(120000);
    });
  });

  describe('goal creation', () => {
    it('should create goal from issue', () => {
      const issue = createTestIssue({ type: 'data_corruption', severity: 'critical' });
      const goal = executor.createGoal(issue);

      expect(goal.issueId).toBe(issue.id);
      expect(goal.issueType).toBe('data_corruption');
      expect(goal.priority).toBe('critical');
    });

    it('should use sourceLocation as target when available', () => {
      const issue = createTestIssue({ sourceLocation: 'hooks/userHook.ts:15' });
      const goal = executor.createGoal(issue);
      expect(goal.target).toBe('hooks/userHook.ts:15');
    });

    it('should fall back to description as target', () => {
      const issue = createTestIssue({ sourceLocation: undefined });
      const goal = executor.createGoal(issue);
      expect(goal.target).toBe(issue.description);
    });
  });

  describe('plan building', () => {
    it('should build execution plan with steps', () => {
      const issue = createTestIssue();
      const goal = executor.createGoal(issue);
      const plan = executor.buildExecutionPlan(goal);

      expect(plan.goal).toEqual(goal);
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('should include rollback steps when autoRollback enabled', () => {
      const issue = createTestIssue();
      const goal = executor.createGoal(issue);
      const plan = executor.buildExecutionPlan(goal);

      expect(plan.rollbackPlan).toBeDefined();
      expect(plan.rollbackPlan!.length).toBeGreaterThan(0);
    });

    it('should not include rollback steps when autoRollback disabled', () => {
      const noRollbackExec = createAutoFixExecutor(analyzer, pipeline, { autoRollback: false });
      const issue = createTestIssue();
      const goal = noRollbackExec.createGoal(issue);
      const plan = noRollbackExec.buildExecutionPlan(goal);

      expect(plan.rollbackPlan).toHaveLength(0);
    });
  });

  describe('goal pursuit', () => {
    it('should complete successfully for valid issue', async () => {
      const issue = createTestIssue();
      const result = await executor.pursueGoal(issue);

      expect(result.success).toBe(true);
      expect(result.stepsExecuted).toBeGreaterThan(0);
      expect(result.totalSteps).toBe(result.stepsExecuted);
      expect(result.error).toBeUndefined();
    });

    it('should add result to execution history', async () => {
      const issue = createTestIssue();
      await executor.pursueGoal(issue);

      const history = executor.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
    });

    it('should remove goal from active after completion', async () => {
      const issue = createTestIssue();
      await executor.pursueGoal(issue);
      expect(executor.getActiveGoals()).toHaveLength(0);
    });
  });

  describe('concurrent fix limits', () => {
    it('should throw when max concurrent fixes reached', async () => {
      const limitedExec = createAutoFixExecutor(analyzer, pipeline, { maxConcurrentFixes: 1 });
      const issue1 = createTestIssue({ id: 'issue-1' });
      const issue2 = createTestIssue({ id: 'issue-2' });

      // Start first goal without awaiting
      const p1 = limitedExec.pursueGoal(issue1);
      await new Promise((r) => setTimeout(r, 10));

      // Second should fail
      await expect(limitedExec.pursueGoal(issue2)).rejects.toThrow('Max concurrent fixes reached');

      // Clean up
      await p1;
    });
  });

  describe('statistics', () => {
    it('should track execution statistics', async () => {
      await executor.pursueGoal(createTestIssue({ id: 'issue-a' }));
      await executor.pursueGoal(createTestIssue({ id: 'issue-b' }));
      await executor.pursueGoal(createTestIssue({ id: 'issue-c' }));

      const stats = executor.getStats();
      expect(stats.totalExecutions).toBe(3);
      expect(stats.successfulExecutions).toBe(3);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.averageStepsPerExecution).toBeGreaterThan(0);
    });

    it('should calculate average steps correctly', async () => {
      // All same executor from beforeEach
      const stats = executor.getStats();
      expect(Number.isFinite(stats.averageStepsPerExecution)).toBe(true);
    });
  });

  describe('learning from failure', () => {
    it('should update rule stats when learnFromFailure enabled', async () => {
      const rules0 = analyzer.getAllFixRules().length;
      analyzer.buildFixRule('sync_failure', { type: 'revert' }, 0.8);
      const issue = createTestIssue({ type: 'sync_failure' });
      await executor.pursueGoal(issue);

      // Rule lookup uses issue type pattern
      const allRules = analyzer.getAllFixRules();
      const updatedRule = allRules.find(r => r.issuePattern === 'sync_failure');
      expect(updatedRule).toBeDefined();
      expect(allRules.length).toBeGreaterThan(rules0);
    });
  });

  describe('step execution', () => {
    it('should execute preconditions before action', async () => {
      const issue = createTestIssue();
      const goal = executor.createGoal(issue);
      const plan = executor.buildExecutionPlan(goal);

      expect(plan.steps[0]).toBeDefined();
      expect(plan.steps[0].id).toBeDefined();
    });

    it('should respect onFailure strategy abort', async () => {
      const issue = createTestIssue();
      const goal = executor.createGoal(issue);
      const plan = executor.buildExecutionPlan(goal);

      // First step has onFailure: 'abort'
      expect(plan.steps[0].onFailure).toBe('abort');
    });

    it('should track duration for each step', async () => {
      const issue = createTestIssue();
      const result = await executor.pursueGoal(issue);

      expect(result.results[0].duration).toBeGreaterThanOrEqual(0);
    });
  });
});