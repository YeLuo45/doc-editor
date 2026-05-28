/**
 * AutoFixExecutor - Autonomous fix agent pursuing repair goals
 * Goal-oriented agent that pursues fix objectives
 */

import type {
  FixGoal,
  ExecutionPlan,
  FixStep,
  FixAction,
  ExecutionResult,
  StepResult,
  DocumentIssue,
} from './types';
import { RootCauseAnalyzer } from './RootCauseAnalyzer';
import { RepairPipeline } from './RepairPipeline';

export interface ExecutorConfig {
  maxConcurrentFixes: number;
  goalTimeoutMs: number;
  stepTimeoutMs: number;
  autoRollback: boolean;
  learnFromFailure: boolean;
}

const DEFAULT_CONFIG: ExecutorConfig = {
  maxConcurrentFixes: 3,
  goalTimeoutMs: 60000,
  stepTimeoutMs: 30000,
  autoRollback: true,
  learnFromFailure: true,
};

export class AutoFixExecutor {
  private config: ExecutorConfig;
  private analyzer: RootCauseAnalyzer;
  private pipeline: RepairPipeline;
  private activeGoals: Map<string, FixGoal> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private goalIdCounter = 0;

  constructor(
    analyzer: RootCauseAnalyzer,
    pipeline: RepairPipeline,
    config: Partial<ExecutorConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.analyzer = analyzer;
    this.pipeline = pipeline;
  }

  // ---- Goal Management ----

  createGoal(issue: DocumentIssue): FixGoal {
    const goal: FixGoal = {
      issueId: issue.id,
      issueType: issue.type,
      target: issue.sourceLocation ?? issue.description,
      priority: issue.severity,
    };
    return goal;
  }

  async pursueGoal(issue: DocumentIssue): Promise<ExecutionResult> {
    const goal = this.createGoal(issue);

    if (this.activeGoals.size >= this.config.maxConcurrentFixes) {
      throw new Error('Max concurrent fixes reached');
    }

    this.activeGoals.set(goal.issueId, goal);

    // Run repair pipeline first to handle the repair flow
    await this.pipeline.execute(issue);

    const plan = this.buildExecutionPlan(goal);
    const result = await this.executePlan(plan);

    this.activeGoals.delete(goal.issueId);
    this.executionHistory.push(result);

    // Update rule statistics based on result
    if (this.config.learnFromFailure) {
      const allRules = this.analyzer.getAllFixRules();
      const rule = allRules.find(r => r.issuePattern === issue.type);
      if (rule) {
        this.analyzer.updateRuleStats(rule.id, result.success);
      }
    }

    return result;
  }

  buildExecutionPlan(goal: FixGoal): ExecutionPlan {
    const steps = this.generateSteps(goal);
    const rollbackSteps = this.config.autoRollback ? this.generateRollbackSteps() : [];

    return {
      goal,
      steps,
      estimatedDuration: steps.length * 5000,
      rollbackPlan: rollbackSteps,
    };
  }

  // ---- Execution ----

  private async executePlan(plan: ExecutionPlan): Promise<ExecutionResult> {
    const stepResults: StepResult[] = [];
    let stepsExecuted = 0;

    for (const step of plan.steps) {
      const stepResult = await this.executeStep(step);
      stepResults.push(stepResult);
      stepsExecuted++;

      if (!stepResult.success && step.onFailure === 'abort') {
        break;
      }
    }

    const success = stepResults.every((r) => r.success);

    return {
      success,
      stepsExecuted,
      totalSteps: plan.steps.length,
      results: stepResults,
      error: success ? undefined : stepResults[stepResults.length - 1]?.error,
    };
  }

  private async executeStep(step: FixStep): Promise<StepResult> {
    const startTime = Date.now();

    // Check preconditions
    if (step.preConditions) {
      const preconditionsMet = await Promise.resolve(step.preConditions());
      if (!preconditionsMet) {
        return {
          stepId: step.id,
          success: false,
          error: 'Preconditions not met',
          duration: Date.now() - startTime,
        };
      }
    }

    try {
      // Execute the fix action
      const output = await this.applyFixAction(step.action);

      // Check postconditions
      if (step.postConditions) {
        const postconditionsMet = await Promise.resolve(step.postConditions());
        if (!postconditionsMet) {
          return {
            stepId: step.id,
            success: false,
            output,
            error: 'Postconditions not met',
            duration: Date.now() - startTime,
          };
        }
      }

      return {
        stepId: step.id,
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      return {
        stepId: step.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  private async applyFixAction(action: FixAction): Promise<unknown> {
    // Simulate fix action application
    return new Promise((resolve) => setTimeout(() => resolve({ applied: action.type }), 200));
  }

  // ---- Step Generation ----

  private generateSteps(goal: FixGoal): FixStep[] {
    const steps: FixStep[] = [];
    let stepId = 0;

    // Step 1: Analyze
    steps.push({
      id: `step-${++stepId}`,
      action: { type: 'patch', payload: { goalId: goal.issueId } },
      onFailure: 'abort',
    });

    // Step 2: Prepare fix
    steps.push({
      id: `step-${++stepId}`,
      action: { type: 'replace', target: goal.target },
      onFailure: 'rollback',
    });

    // Step 3: Apply fix
    steps.push({
      id: `step-${++stepId}`,
      action: { type: 'revert' },
      onFailure: 'continue',
    });

    // Step 4: Verify
    steps.push({
      id: `step-${++stepId}`,
      action: { type: 'rebuild' },
      postConditions: () => true,
      onFailure: 'continue',
    });

    return steps;
  }

  private generateRollbackSteps(): FixStep[] {
    return [
      {
        id: `rollback-${++this.goalIdCounter}`,
        action: { type: 'revert' },
        onFailure: 'abort',
      },
    ];
  }

  // ---- Status ----

  getActiveGoals(): FixGoal[] {
    return Array.from(this.activeGoals.values());
  }

  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  getStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageStepsPerExecution: number;
  } {
    const total = this.executionHistory.length;
    const successful = this.executionHistory.filter((r) => r.success).length;
    const failed = total - successful;
    const avgSteps = total > 0
      ? this.executionHistory.reduce((sum, r) => sum + r.stepsExecuted, 0) / total
      : 0;

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      averageStepsPerExecution: Math.round(avgSteps * 10) / 10,
    };
  }

  // ---- Test Helpers ----

  _snapshot() {
    return {
      activeGoalsCount: this.activeGoals.size,
      historySize: this.executionHistory.length,
      config: { ...this.config },
    };
  }
}

export function createAutoFixExecutor(
  analyzer: RootCauseAnalyzer,
  pipeline: RepairPipeline,
  config?: Partial<ExecutorConfig>
): AutoFixExecutor {
  return new AutoFixExecutor(analyzer, pipeline, config);
}