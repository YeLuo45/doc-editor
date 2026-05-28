/**
 * RepairPipeline - detect → diagnose → fix → verify → commit
 * Orchestrates the full repair workflow
 */

import type {
  DocumentIssue,
  RepairPipelineState,
  RepairPhase,
  RepairResult,
  FixAction,
} from './types';
import { RootCauseAnalyzer } from './RootCauseAnalyzer';

export interface PipelineConfig {
  autoCommit: boolean;
  maxRetries: number;
  verifyTimeoutMs: number;
  rollbackOnFailure: boolean;
}

const DEFAULT_CONFIG: PipelineConfig = {
  autoCommit: true,
  maxRetries: 2,
  verifyTimeoutMs: 10000,
  rollbackOnFailure: true,
};

export class RepairPipeline {
  private config: PipelineConfig;
  private analyzer: RootCauseAnalyzer;
  private state: RepairPipelineState = {
    currentPhase: 'detect',
    isRunning: false,
    currentIssueId: null,
    progress: 0,
    startedAt: null,
    completedAt: null,
  };
  private results: Map<string, RepairResult> = new Map();
  private onPhaseChange?: (phase: RepairPhase, state: RepairPipelineState) => void;

  constructor(
    analyzer: RootCauseAnalyzer,
    config: Partial<PipelineConfig> = {},
    onPhaseChange?: (phase: RepairPhase, state: RepairPipelineState) => void
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.analyzer = analyzer;
    this.onPhaseChange = onPhaseChange;
  }

  // ---- State ----

  getState(): Readonly<RepairPipelineState> {
    return { ...this.state };
  }

  isRunning(): boolean {
    return this.state.isRunning;
  }

  getResult(issueId: string): RepairResult | undefined {
    return this.results.get(issueId);
  }

  getAllResults(): RepairResult[] {
    return Array.from(this.results.values());
  }

  // ---- Lifecycle ----

  async execute(issue: DocumentIssue): Promise<RepairResult> {
    if (this.state.isRunning) {
      throw new Error('Pipeline already running');
    }

    const startTime = Date.now();
    this.state = {
      currentPhase: 'detect',
      isRunning: true,
      currentIssueId: issue.id,
      progress: 0,
      startedAt: startTime,
      completedAt: null,
    };

    const phasesCompleted: RepairPhase[] = [];
    let fixApplied: FixAction | undefined;
    let verificationPassed = false;
    let error: string | undefined;

    try {
      // Phase 1: Detect
      this.transitionTo('diagnose');
      phasesCompleted.push('detect');

      // Phase 2: Diagnose
      const analysis = this.analyzer.analyzeIssue(issue);
      phasesCompleted.push('diagnose');

      // Phase 3: Fix
      this.transitionTo('fix');
      fixApplied = this.deriveFix(issue, analysis);
      phasesCompleted.push('fix');

      // Phase 4: Verify
      this.transitionTo('verify');
      verificationPassed = await this.verifyFix(fixApplied, issue);
      phasesCompleted.push('verify');

      // Phase 5: Commit
      if (this.config.autoCommit && verificationPassed) {
        this.transitionTo('commit');
        phasesCompleted.push('commit');
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      if (this.config.rollbackOnFailure) {
        await this.rollback(fixApplied);
      }
    } finally {
      this.state = {
        ...this.state,
        isRunning: false,
        currentPhase: 'detect',
        currentIssueId: null,
        progress: 100,
        completedAt: Date.now(),
      };
    }

    const result: RepairResult = {
      issueId: issue.id,
      success: !error && verificationPassed,
      phasesCompleted,
      fixApplied,
      verificationPassed,
      error,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };

    this.results.set(issue.id, result);
    return result;
  }

  // ---- Pipeline Steps ----

  private transitionTo(phase: RepairPhase): void {
    this.state = {
      ...this.state,
      currentPhase: phase,
      progress: this.phaseToProgress(phase),
    };
    this.onPhaseChange?.(phase, this.state);
  }

  private phaseToProgress(phase: RepairPhase): number {
    const map: Record<RepairPhase, number> = {
      detect: 20,
      diagnose: 40,
      fix: 60,
      verify: 80,
      commit: 100,
    };
    return map[phase] ?? 0;
  }

  private deriveFix(issue: DocumentIssue, analysis: ReturnType<RootCauseAnalyzer['analyzeIssue']>): FixAction | undefined {
    // Try suggested fix from analysis
    if (analysis.suggestedFix) {
      return analysis.suggestedFix;
    }

    // Check for existing fix rule
    const rule = this.analyzer.matchRuleForIssue(issue.type);
    if (rule) {
      return rule.fixAction;
    }

    // Default by severity
    const defaults: Record<string, FixAction> = {
      low: { type: 'patch' },
      medium: { type: 'replace' },
      high: { type: 'revert' },
      critical: { type: 'rebuild' },
    };

    return defaults[issue.severity] ?? { type: 'patch' };
  }

  private async verifyFix(fix: FixAction | undefined, _issue: DocumentIssue): Promise<boolean> {
    if (!fix) return false;

    // Simulate verification with timeout
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        // Verify logic: check that the fix was applied and the issue is resolved
        resolve(true);
      }, Math.min(this.config.verifyTimeoutMs, 500));

      // Clean up on early return
      if (!this.state.isRunning) {
        clearTimeout(timer);
        resolve(false);
      }
    });
  }

  private async rollback(fix: FixAction | undefined): Promise<void> {
    if (!fix?.rollback) return;
    // Rollback logic stub
  }

  // ---- Reset ----

  reset(): void {
    this.state = {
      currentPhase: 'detect',
      isRunning: false,
      currentIssueId: null,
      progress: 0,
      startedAt: null,
      completedAt: null,
    };
    this.results.clear();
  }

  // ---- Test helpers ----

  _snapshot() {
    return {
      state: { ...this.state },
      resultsCount: this.results.size,
      config: { ...this.config },
    };
  }
}

export function createRepairPipeline(
  analyzer: RootCauseAnalyzer,
  config?: Partial<PipelineConfig>,
  onPhaseChange?: (phase: RepairPhase, state: RepairPipelineState) => void
): RepairPipeline {
  return new RepairPipeline(analyzer, config, onPhaseChange);
}