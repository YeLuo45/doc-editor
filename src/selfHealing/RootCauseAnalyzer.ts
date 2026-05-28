/**
 * RootCauseAnalyzer - Analyzes failure patterns and builds fix rules
 * Pattern recognition + rule generation for autonomous repair
 */

import type {
  IssuePattern,
  FixRule,
  FixAction,
  AnalysisResult,
  PatternMatch,
  DocumentIssue,
  IssueSeverity,
} from './types';

const PATTERN_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_PATTERN_FREQUENCY = 2;
const MAX_PATTERNS = 50;

export class RootCauseAnalyzer {
  private patterns: IssuePattern[] = [];
  private fixRules: FixRule[] = [];
  private issueHistory: DocumentIssue[] = [];
  private ruleIdCounter = 0;

  constructor() {
    this.loadPatterns();
  }

  // ---- Pattern Management ----

  analyzeIssue(issue: DocumentIssue): AnalysisResult {
    const relatedPatterns = this.findMatchingPatterns(issue);
    const rootCauses = this.extractRootCauses(issue, relatedPatterns);

    const suggestedFix = this.deriveFixAction(issue, relatedPatterns);

    const confidence = this.calculateConfidence(rootCauses, relatedPatterns);

    // Record pattern
    this.recordPattern(issue);

    return {
      rootCauses,
      confidence,
      suggestedFix,
      relatedPatterns: relatedPatterns.map((p) => p.pattern.id),
    };
  }

  recordPattern(issue: DocumentIssue): void {
    const patternKey = this.createPatternKey(issue);

    const existing = this.patterns.find((p) => p.pattern === patternKey);
    if (existing) {
      existing.frequency += 1;
      existing.lastOccurrence = Date.now();
    } else {
      if (this.patterns.length >= MAX_PATTERNS) {
        // Remove least frequent pattern
        this.patterns.sort((a, b) => a.frequency - b.frequency);
        this.patterns = this.patterns.slice(1);
      }

      this.patterns.push({
        id: `pattern-${this.patterns.length + 1}`,
        pattern: patternKey,
        frequency: 1,
        lastOccurrence: Date.now(),
        description: issue.description,
      });
    }

    this.issueHistory.push(issue);
    this.pruneOldHistory();
  }

  findMatchingPatterns(issue: DocumentIssue): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const issueKey = this.createPatternKey(issue);

    for (const p of this.patterns) {
      let score = 0;
      const matchedFields: string[] = [];

      if (p.pattern === issueKey) {
        score = 1.0;
        matchedFields.push('exact');
      } else if (issueKey.includes(p.pattern) || p.pattern.includes(issueKey)) {
        score = 0.7;
        matchedFields.push('partial');
      } else if (this.fuzzyMatch(p.pattern, issueKey) > 0.6) {
        score = this.fuzzyMatch(p.pattern, issueKey);
        matchedFields.push('fuzzy');
      }

      if (issue.type === p.id.split('-')[0]) {
        score = Math.max(score, 0.4);
        matchedFields.push('type');
      }

      if (score > 0) {
        matches.push({ pattern: p, matchScore: score, matchedFields });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ---- Fix Rule Management ----

  buildFixRule(issueType: string, action: FixAction, confidence: number): FixRule {
    const rule: FixRule = {
      id: `rule-${++this.ruleIdCounter}`,
      issuePattern: issueType,
      fixAction: action,
      confidence,
      createdAt: Date.now(),
      successCount: 0,
      failureCount: 0,
    };

    this.fixRules.push(rule);
    return rule;
  }

  getFixRule(issueId: string): FixRule | undefined {
    return this.fixRules.find(
      (r) => r.issuePattern === issueId || r.issuePattern.includes(issueId)
    );
  }

  getAllFixRules(): FixRule[] {
    return [...this.fixRules];
  }

  updateRuleStats(ruleId: string, success: boolean): void {
    const rule = this.fixRules.find((r) => r.id === ruleId);
    if (!rule) return;

    if (success) {
      rule.successCount += 1;
      rule.lastUsed = Date.now();
    } else {
      rule.failureCount += 1;
    }

    // Adjust confidence based on success rate
    const total = rule.successCount + rule.failureCount;
    if (total >= 3) {
      rule.confidence = rule.successCount / total;
    }
  }

  matchRuleForIssue(issueType: string): FixRule | undefined {
    // Find best matching rule
    let best: FixRule | undefined;
    let bestScore = 0;

    for (const rule of this.fixRules) {
      const score = this.fuzzyMatch(rule.issuePattern, issueType);
      if (score > bestScore) {
        bestScore = score;
        best = rule;
      }
    }

    return bestScore > 0.5 ? best : undefined;
  }

  // ---- Pattern Cleanup ----

  pruneOldPatterns(): void {
    const cutoff = Date.now() - PATTERN_WINDOW_MS;
    this.patterns = this.patterns.filter(
      (p) => p.lastOccurrence > cutoff && p.frequency >= MIN_PATTERN_FREQUENCY
    );
  }

  // ---- Accessors for tests ----

  _getPatterns(): IssuePattern[] {
    return [...this.patterns];
  }

  _getFixRules(): FixRule[] {
    return [...this.fixRules];
  }

  _getIssueHistory(): DocumentIssue[] {
    return [...this.issueHistory];
  }

  // ---- Private Helpers ----

  private createPatternKey(issue: DocumentIssue): string {
    return `${issue.type}:${issue.severity}`;
  }

  private extractRootCauses(
    issue: DocumentIssue,
    patterns: PatternMatch[]
  ): string[] {
    const causes: string[] = [];

    if (patterns.length > 0) {
      causes.push(`Recurring pattern (${patterns[0].pattern.frequency}x)`);
    }

    if (issue.stackTrace) {
      const match = issue.stackTrace.match(/at\s+(\w+)/);
      if (match) {
        causes.push(`Source: ${match[1]}`);
      }
    }

    if (issue.sourceLocation) {
      causes.push(`Location: ${issue.sourceLocation}`);
    }

    causes.push(`Severity: ${issue.severity}`);

    return causes;
  }

  private deriveFixAction(issue: DocumentIssue, patterns: PatternMatch[]): FixAction | undefined {
    // Find rule with matching pattern
    for (const pm of patterns) {
      const rule = this.fixRules.find(
        (r) => r.issuePattern === pm.pattern.pattern || r.issuePattern === pm.pattern.id
      );
      if (rule) return rule.fixAction;
    }

    // Default fix actions by severity
    const defaults: Record<IssueSeverity, FixAction> = {
      low: { type: 'patch' },
      medium: { type: 'replace' },
      high: { type: 'revert' },
      critical: { type: 'rebuild' },
    };

    return defaults[issue.severity] ?? { type: 'patch' };
  }

  private calculateConfidence(causes: string[], patterns: PatternMatch[]): number {
    let conf = 0.3; // base

    if (causes.length > 0) conf += 0.1;
    if (patterns.length > 0) {
      conf += patterns.reduce((s, p) => s + p.matchScore, 0) / patterns.length * 0.4;
    }
    if (patterns.some((p) => p.matchScore > 0.8)) conf += 0.2;

    return Math.min(1, conf);
  }

  private fuzzyMatch(a: string, b: string): number {
    if (a === b) return 1;
    if (!a || !b) return 0;

    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();

    if (aLower === bLower) return 1;
    if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.7;

    // Simple character-based similarity
    let matches = 0;
    const shorter = aLower.length < bLower.length ? aLower : bLower;
    for (const char of shorter) {
      if (aLower.includes(char) && bLower.includes(char)) matches++;
    }

    return matches / Math.max(aLower.length, bLower.length);
  }

  private pruneOldHistory(): void {
    const cutoff = Date.now() - PATTERN_WINDOW_MS;
    this.issueHistory = this.issueHistory.filter((i) => i.detectedAt > cutoff);
  }

  private loadPatterns(): void {
    // Load from localStorage if available (stub for persistence)
  }
}

export function createRootCauseAnalyzer(): RootCauseAnalyzer {
  return new RootCauseAnalyzer();
}