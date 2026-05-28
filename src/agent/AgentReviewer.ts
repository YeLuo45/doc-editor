/**
 * AgentReviewer.ts - Reviewer Agent for the V21 Agent System
 * Reviews code quality and provides feedback
 */

import { AgentTask, TaskType } from './AgentTask';
import { AgentResult, createResult, ResultArtifact } from './AgentResult';

export interface ReviewIssue {
  severity: 'critical' | 'major' | 'minor' | 'info';
  category: string;
  message: string;
  line?: number;
  suggestion?: string;
}

export class AgentReviewer {
  readonly id: string;
  readonly name: string;
  readonly type: TaskType = 'review';
  private readonly capabilities: string[];

  constructor(id?: string, name?: string) {
    this.id = id || 'reviewer-001';
    this.name = name || 'ReviewerAgent';
    this.capabilities = [
      'code_review',
      'security_audit',
      'performance_review',
      'style_check',
      'best_practices',
      'typescript_analysis',
      'react_hooks_review',
      'accessibility_review',
    ];
  }

  getCapabilities(): string[] {
    return [...this.capabilities];
  }

  canHandle(taskType: TaskType): boolean {
    return taskType === 'review';
  }

  async process(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      if (task.type !== 'review') {
        throw new Error(`Reviewer cannot handle task type: ${task.type}`);
      }

      const sourceCode = task.payload.sourceCode || '';
      const context = task.payload.context || {};

      const issues = this.performReview(sourceCode, context);
      const score = this.calculateScore(issues);
      const summary = this.generateSummary(issues, score);

      const reviewArtifact: ResultArtifact = {
        id: `artifact-${Date.now()}`,
        type: 'code_review',
        name: 'Code Review Report',
        content: {
          issues,
          score,
          summary,
          reviewedAt: new Date().toISOString(),
        },
        metadata: {
          linesOfCode: sourceCode.split('\n').length,
          issueCount: issues.length,
        },
      };

      const output = {
        issues,
        score,
        summary,
        recommendations: this.generateRecommendations(issues),
        approved: score >= 7 && !issues.some((i) => i.severity === 'critical'),
      };

      return createResult({
        taskId: task.id,
        status: 'success',
        output,
        agentId: this.id,
        agentName: this.name,
        metrics: {
          durationMs: Date.now() - startTime,
          linesReviewed: sourceCode.split('\n').length,
          issueCount: issues.length,
          score,
        },
        artifacts: [reviewArtifact],
      });
    } catch (error) {
      return createResult({
        taskId: task.id,
        status: 'failure',
        output: null,
        error: error instanceof Error ? error.message : String(error),
        agentId: this.id,
        agentName: this.name,
        metrics: { durationMs: Date.now() - startTime },
      });
    }
  }

  private performReview(code: string, context: Record<string, unknown>): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/\bconsole\.(log|debug)\s*\(/.test(line)) {
        issues.push({
          severity: 'minor',
          category: 'best-practices',
          message: 'Avoid console statements in production code',
          line: i + 1,
          suggestion: 'Use a proper logging solution',
        });
      }

      if (/\bany\b/.test(line)) {
        issues.push({
          severity: 'major',
          category: 'typescript',
          message: 'Avoid using "any" type',
          line: i + 1,
          suggestion: 'Use specific types or unknown with type guards',
        });
      }

      if (line.includes('// TODO') || line.includes('// FIXME')) {
        issues.push({
          severity: 'info',
          category: 'maintainability',
          message: 'Found unfinished work marker',
          line: i + 1,
          suggestion: 'Address or create tracking issue',
        });
      }
    }

    if (!code.includes('useEffect') && !code.includes('useState') && context.needsHooks) {
      issues.push({
        severity: 'critical',
        category: 'react-hooks',
        message: 'Component requires state or effects but does not implement them',
        suggestion: 'Implement useState or useEffect as needed',
      });
    }

    return issues;
  }

  private calculateScore(issues: ReviewIssue[]): number {
    let score = 10;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 3;
          break;
        case 'major':
          score -= 1.5;
          break;
        case 'minor':
          score -= 0.5;
          break;
        case 'info':
          score -= 0.1;
          break;
      }
    }
    return Math.max(0, Math.min(10, score));
  }

  private generateSummary(issues: ReviewIssue[], score: number): string {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const major = issues.filter((i) => i.severity === 'major').length;
    const minor = issues.filter((i) => i.severity === 'minor').length;

    return `Code review complete. Score: ${score.toFixed(1)}/10. Found ${issues.length} issues (${critical} critical, ${major} major, ${minor} minor).`;
  }

  private generateRecommendations(issues: ReviewIssue[]): string[] {
    const recommendations: string[] = [];
    const categories = new Set(issues.map((i) => i.category));

    if (categories.has('typescript')) {
      recommendations.push('Strongly type all variables and function signatures');
    }
    if (categories.has('best-practices')) {
      recommendations.push('Remove debug code and console statements');
    }
    if (categories.has('security')) {
      recommendations.push('Review for potential security vulnerabilities');
    }

    recommendations.push('Run linter and formatter before next review');
    recommendations.push('Add unit tests for uncovered code paths');

    return recommendations;
  }
}