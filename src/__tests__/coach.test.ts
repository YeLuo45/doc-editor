/**
 * Coach Module Tests
 * V24 Self-Evolution Writing Coach
 * Tests for WritingCoach, WritingStyle, WritingFeedback, WritingGoals, WritingPlan, WritingSession
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WritingCoach } from '../coach/WritingCoach';
import { WritingStyle } from '../coach/WritingStyle';
import { WritingFeedback } from '../coach/WritingFeedback';
import { WritingGoals } from '../coach/WritingGoals';
import { WritingPlan } from '../coach/WritingPlan';
import { WritingSession } from '../coach/WritingSession';

// ============================================
// WritingCoach Tests
// ============================================

describe('WritingCoach', () => {
  let coach: WritingCoach;

  beforeEach(() => {
    coach = new WritingCoach();
  });

  it('should create WritingCoach instance', () => {
    expect(coach).toBeDefined();
  });

  it('should analyze text and return TextAnalysis', () => {
    const text = 'This is a test sentence. Here is another one.';
    const result = coach.analyze(text);
    expect(result).toHaveProperty('wordCount');
    expect(result).toHaveProperty('sentenceCount');
    expect(result).toHaveProperty('readabilityScore');
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it('should generate suggestions based on text', () => {
    const text = 'This is a very long sentence that goes on and on with many words and ideas packed into a single line of text that might be difficult to read and understand quickly.';
    const suggestions = coach.getSuggestions(text);
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should improve text based on suggestions', () => {
    const text = 'This is a test.';
    const improved = coach.improve(text);
    expect(typeof improved).toBe('string');
    expect(improved.length).toBeGreaterThan(0);
  });

  it('should get snapshot with analysis count', () => {
    const snapshot = coach.getSnapshot();
    expect(snapshot).toHaveProperty('analysisCount');
    expect(snapshot).toHaveProperty('sessionId');
    expect(typeof snapshot.sessionId).toBe('string');
  });

  it('should reset coach state', () => {
    coach.analyze('test text');
    coach.reset();
    const snapshot = coach.getSnapshot();
    expect(snapshot.analysisCount).toBe(0);
  });

  it('should generate report with metrics', () => {
    const report = coach.getReport();
    expect(report).toHaveProperty('totalAnalyses');
    expect(report).toHaveProperty('totalSuggestions');
    expect(report).toHaveProperty('generatedAt');
  });

  it('should export metrics', () => {
    const metrics = coach.exportMetrics();
    expect(metrics).toHaveProperty('analysesPerformed');
    expect(metrics).toHaveProperty('suggestionsGenerated');
    expect(metrics).toHaveProperty('timestamp');
  });
});

// ============================================
// WritingStyle Tests
// ============================================

describe('WritingStyle', () => {
  let style: WritingStyle;

  beforeEach(() => {
    style = new WritingStyle();
  });

  it('should create WritingStyle instance', () => {
    expect(style).toBeDefined();
  });

  it('should analyze tone of text', () => {
    const text = 'Therefore, we should consider the implications carefully. Furthermore, the evidence suggests otherwise.';
    const tone = style.analyzeTone(text);
    expect(tone).toHaveProperty('score');
    expect(tone).toHaveProperty('category');
    expect(['formal', 'informal', 'neutral', 'mixed']).toContain(tone.category);
  });

  it('should analyze clarity of text', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const clarity = style.analyzeClarity(text);
    expect(clarity).toHaveProperty('score');
    expect(clarity).toHaveProperty('readabilityLevel');
    expect(['easy', 'moderate', 'difficult']).toContain(clarity.readabilityLevel);
  });

  it('should analyze structure of text', () => {
    const text = 'First paragraph content here.\n\nSecond paragraph content here.';
    const structure = style.analyzeStructure(text);
    expect(structure).toHaveProperty('score');
    expect(structure).toHaveProperty('paragraphCount');
    expect(structure).toHaveProperty('flowRating');
  });

  it('should perform full analysis combining tone, clarity, structure', () => {
    const text = 'This is a test paragraph. It has multiple sentences. We should analyze it thoroughly.';
    const result = style.analyze(text);
    expect(result).toHaveProperty('tone');
    expect(result).toHaveProperty('clarity');
    expect(result).toHaveProperty('structure');
  });

  it('should get snapshot with analysis counts', () => {
    const snapshot = style.getSnapshot();
    expect(snapshot).toHaveProperty('toneAnalyses');
    expect(snapshot).toHaveProperty('clarityAnalyses');
    expect(snapshot).toHaveProperty('structureAnalyses');
  });

  it('should reset style state', () => {
    style.analyzeTone('test');
    style.reset();
    const snapshot = style.getSnapshot();
    expect(snapshot.toneAnalyses).toBe(0);
  });

  it('should generate report with average scores', () => {
    const report = style.getReport();
    expect(report).toHaveProperty('averageScores');
    expect(report.averageScores).toHaveProperty('tone');
    expect(report.averageScores).toHaveProperty('clarity');
    expect(report.averageScores).toHaveProperty('structure');
  });

  it('should export metrics', () => {
    const metrics = style.exportMetrics();
    expect(metrics).toHaveProperty('analysesPerformed');
    expect(metrics).toHaveProperty('averageScore');
    expect(metrics).toHaveProperty('timestamp');
  });
});

// ============================================
// WritingFeedback Tests
// ============================================

describe('WritingFeedback', () => {
  let feedback: WritingFeedback;

  beforeEach(() => {
    feedback = new WritingFeedback();
  });

  it('should create WritingFeedback instance', () => {
    expect(feedback).toBeDefined();
  });

  it('should generate feedback items', () => {
    const text = 'This is a test sentence. And another one.';
    const items = feedback.generateFeedback(text);
    expect(Array.isArray(items)).toBe(true);
  });

  it('should prioritize feedback by severity', () => {
    const items = [
      { id: '1', category: 'clarity' as const, message: 'Test', severity: 'low' as const, editable: true, timestamp: Date.now() },
      { id: '2', category: 'style' as const, message: 'Test', severity: 'high' as const, editable: true, timestamp: Date.now() },
    ];
    const prioritized = feedback.prioritizeFeedback(items);
    expect(prioritized.items[0].severity).toBe('high');
  });

  it('should get snapshot with feedback count', () => {
    const snapshot = feedback.getSnapshot();
    expect(snapshot).toHaveProperty('feedbackGenerated');
    expect(snapshot).toHaveProperty('categoriesTracked');
  });

  it('should reset feedback state', () => {
    feedback.generateFeedback('test');
    feedback.reset();
    const snapshot = feedback.getSnapshot();
    expect(snapshot.feedbackGenerated).toBe(0);
  });

  it('should generate report with category breakdown', () => {
    const report = feedback.getReport();
    expect(report).toHaveProperty('totalFeedback');
    expect(report).toHaveProperty('byCategory');
    expect(report).toHaveProperty('bySeverity');
  });

  it('should export metrics', () => {
    const metrics = feedback.exportMetrics();
    expect(metrics).toHaveProperty('itemsGenerated');
    expect(metrics).toHaveProperty('categoriesCovered');
    expect(metrics).toHaveProperty('highPriorityCount');
  });

  it('should filter feedback by category', () => {
    const text = 'This is a test with some issues.';
    const items = feedback.generateFeedback(text, { categories: ['clarity'] });
    expect(items.every(i => i.category === 'clarity')).toBe(true);
  });
});

// ============================================
// WritingGoals Tests
// ============================================

describe('WritingGoals', () => {
  let goals: WritingGoals;

  beforeEach(() => {
    goals = new WritingGoals();
  });

  it('should create WritingGoals instance', () => {
    expect(goals).toBeDefined();
  });

  it('should set a new goal', () => {
    const goal = goals.setGoal({
      type: 'word_count',
      title: 'Write 1000 words',
      description: 'Daily writing target',
      target: 1000,
      unit: 'words',
    });
    expect(goal).toHaveProperty('id');
    expect(goal.title).toBe('Write 1000 words');
    expect(goal.status).toBe('active');
  });

  it('should track progress on a goal', () => {
    const goal = goals.setGoal({
      type: 'word_count',
      title: 'Write 500 words',
      description: 'Daily target',
      target: 500,
      unit: 'words',
    });
    const progress = goals.trackProgress(goal.id, 100);
    expect(progress).toBeDefined();
    expect(progress!.percentComplete).toBe(20);
  });

  it('should evaluate goal completion', () => {
    const goal = goals.setGoal({
      type: 'clarity',
      title: 'Improve clarity',
      description: 'Target score',
      target: 80,
      unit: 'score',
    });
    goals.trackProgress(goal.id, 80);
    const evaluation = goals.evaluateGoal(goal.id);
    expect(evaluation).toBeDefined();
    expect(evaluation!.achieved).toBe(true);
  });

  it('should get snapshot with goal statistics', () => {
    const snapshot = goals.getSnapshot();
    expect(snapshot).toHaveProperty('totalGoals');
    expect(snapshot).toHaveProperty('activeGoals');
    expect(snapshot).toHaveProperty('averageProgress');
  });

  it('should reset goals state', () => {
    goals.setGoal({
      type: 'time',
      title: '30 min writing',
      description: 'Time goal',
      target: 30,
      unit: 'minutes',
    });
    goals.reset();
    const snapshot = goals.getSnapshot();
    expect(snapshot.totalGoals).toBe(0);
  });

  it('should generate report with completion rate', () => {
    const report = goals.getReport();
    expect(report).toHaveProperty('totalGoals');
    expect(report).toHaveProperty('completionRate');
    expect(report).toHaveProperty('recommendations');
  });

  it('should export metrics', () => {
    const metrics = goals.exportMetrics();
    expect(metrics).toHaveProperty('goalsSet');
    expect(metrics).toHaveProperty('goalsAchieved');
    expect(metrics).toHaveProperty('averageProgress');
  });
});

// ============================================
// WritingPlan Tests
// ============================================

describe('WritingPlan', () => {
  let plan: WritingPlan;

  beforeEach(() => {
    plan = new WritingPlan();
  });

  it('should create WritingPlan instance', () => {
    expect(plan).toBeDefined();
  });

  it('should create a writing plan with items', () => {
    const created = plan.createPlan({
      name: 'Essay Plan',
      description: 'Write an essay',
      items: [
        { phase: 'outline', title: 'Create outline', description: 'Draft outline', estimatedMinutes: 15 },
        { phase: 'draft', title: 'Write draft', description: 'Write content', targetWords: 500 },
      ],
    });
    expect(created).toHaveProperty('id');
    expect(created.items.length).toBe(2);
  });

  it('should update plan status', () => {
    const created = plan.createPlan({
      name: 'Test Plan',
      description: 'Test',
      items: [{ phase: 'outline', title: 'Outline', description: 'Do it' }],
    });
    const updated = plan.updatePlan(created.id, { itemId: created.items[0].id, status: 'in_progress' });
    expect(updated).toBeDefined();
    expect(updated!.items[0].status).toBe('in_progress');
  });

  it('should get plan summary', () => {
    const created = plan.createPlan({
      name: 'Summary Test',
      description: 'Test',
      items: [
        { phase: 'outline', title: '1', description: 'A' },
        { phase: 'draft', title: '2', description: 'B' },
      ],
    });
    const summary = plan.getPlanSummary(created.id);
    expect(summary).toHaveProperty('progress');
    expect(summary).toHaveProperty('totalItems');
  });

  it('should get snapshot with plan statistics', () => {
    const snapshot = plan.getSnapshot();
    expect(snapshot).toHaveProperty('plansCreated');
    expect(snapshot).toHaveProperty('totalItems');
    expect(snapshot).toHaveProperty('completedItems');
  });

  it('should reset plan state', () => {
    plan.createPlan({
      name: 'Reset Test',
      description: 'Test',
      items: [{ phase: 'outline', title: 'T', description: 'D' }],
    });
    plan.reset();
    const snapshot = plan.getSnapshot();
    expect(snapshot.plansCreated).toBe(0);
  });

  it('should generate report with completion rate', () => {
    const report = plan.getReport();
    expect(report).toHaveProperty('totalPlans');
    expect(report).toHaveProperty('completionRate');
    expect(report).toHaveProperty('phasesCompleted');
  });

  it('should export metrics', () => {
    const metrics = plan.exportMetrics();
    expect(metrics).toHaveProperty('plansCreated');
    expect(metrics).toHaveProperty('itemsCompleted');
    expect(metrics).toHaveProperty('averageItemsPerPlan');
  });
});

// ============================================
// WritingSession Tests
// ============================================

describe('WritingSession', () => {
  let session: WritingSession;

  beforeEach(() => {
    session = new WritingSession();
  });

  it('should create WritingSession instance', () => {
    expect(session).toBeDefined();
  });

  it('should start a new session', () => {
    const started = session.start('Initial content');
    expect(started).toHaveProperty('id');
    expect(started.status).toBe('active');
    expect(started.content).toContain('Initial content');
  });

  it('should pause and resume session', () => {
    session.start();
    const paused = session.pause();
    expect(paused).toBeDefined();
    expect(paused!.status).toBe('paused');

    const resumed = session.resume();
    expect(resumed).toBeDefined();
    expect(resumed!.status).toBe('active');
  });

  it('should complete session and return metrics', () => {
    const started = session.start('Test content');
    const completed = session.complete();
    expect(completed).toBeDefined();
    expect(completed!.status).toBe('completed');
    expect(completed!.metrics).toHaveProperty('wordsWritten');
  });

  it('should add content during session', () => {
    session.start('Initial content');
    session.addContent('More content here.');
    const current = session.getCurrentSession();
    expect(current!.content.length).toBe(2);
  });

  it('should get snapshot with session stats', () => {
    session.start();
    const snapshot = session.getSnapshot();
    expect(snapshot).toHaveProperty('currentSession');
    expect(snapshot).toHaveProperty('totalSessions');
    expect(snapshot).toHaveProperty('completedSessions');
  });

  it('should reset session state', () => {
    session.start();
    session.complete();
    session.reset();
    const snapshot = session.getSnapshot();
    expect(snapshot.totalSessions).toBe(0);
    expect(snapshot.currentSession).toBeNull();
  });

  it('should generate report with average duration', () => {
    session.start();
    session.complete();
    const report = session.getReport();
    expect(report).toHaveProperty('totalSessions');
    expect(report).toHaveProperty('completedSessions');
    expect(report).toHaveProperty('completionRate');
  });

  it('should export metrics', () => {
    const metrics = session.exportMetrics();
    expect(metrics).toHaveProperty('totalSessions');
    expect(metrics).toHaveProperty('totalWordsWritten');
    expect(metrics).toHaveProperty('sessionsByStatus');
  });

  it('should track session history', () => {
    session.start('First');
    session.complete();
    session.start('Second');
    session.complete();
    const history = session.getSessionHistory();
    expect(history.length).toBe(2);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Coach Integration', () => {
  it('should work together across modules', () => {
    const coach = new WritingCoach();
    const style = new WritingStyle();
    const feedback = new WritingFeedback();

    const text = 'This is a test paragraph with some content that needs analysis.';

    const analysis = coach.analyze(text);
    expect(analysis.wordCount).toBeGreaterThan(0);

    const styleResult = style.analyze(text);
    expect(styleResult.tone).toBeDefined();

    const feedbackItems = feedback.generateFeedback(text);
    expect(Array.isArray(feedbackItems)).toBe(true);
  });

  it('should export metrics from all modules', () => {
    const coach = new WritingCoach();
    const style = new WritingStyle();
    const feedback = new WritingFeedback();
    const goals = new WritingGoals();
    const plan = new WritingPlan();
    const session = new WritingSession();

    coach.analyze('test');
    style.analyzeTone('test');
    feedback.generateFeedback('test');
    goals.setGoal({ type: 'word_count', title: 'T', description: 'D', target: 100, unit: 'w' });
    plan.createPlan({ name: 'N', description: 'D', items: [] });
    session.start();

    const coachMetrics = coach.exportMetrics();
    const styleMetrics = style.exportMetrics();
    const feedbackMetrics = feedback.exportMetrics();
    const goalsMetrics = goals.exportMetrics();
    const planMetrics = plan.exportMetrics();
    const sessionMetrics = session.exportMetrics();

    expect(coachMetrics.timestamp).toBeDefined();
    expect(styleMetrics.timestamp).toBeDefined();
    expect(feedbackMetrics.timestamp).toBeDefined();
    expect(goalsMetrics.timestamp).toBeDefined();
    expect(planMetrics.timestamp).toBeDefined();
    expect(sessionMetrics.timestamp).toBeDefined();
  });

  it('should reset all modules independently', () => {
    const modules = [
      new WritingCoach(),
      new WritingStyle(),
      new WritingFeedback(),
      new WritingGoals(),
      new WritingPlan(),
      new WritingSession(),
    ];

    modules.forEach(m => {
      m.analyze?.('test');
      m.analyzeTone?.('test');
      m.generateFeedback?.('test');
      m.setGoal?.({ type: 'word_count', title: 'T', description: 'D', target: 100, unit: 'w' });
      m.createPlan?.({ name: 'N', description: 'D', items: [] });
      m.start?.();

      m.reset();

      const snapshot = m.getSnapshot();
      expect(snapshot).toBeDefined();
    });
  });

  it('should generate reports from all modules', () => {
    const coach = new WritingCoach();
    const style = new WritingStyle();
    const feedback = new WritingFeedback();
    const goals = new WritingGoals();
    const plan = new WritingPlan();
    const session = new WritingSession();

    const reports = [
      coach.getReport(),
      style.getReport(),
      feedback.getReport(),
      goals.getReport(),
      plan.getReport(),
      session.getReport(),
    ];

    reports.forEach(report => {
      expect(report).toHaveProperty('generatedAt');
    });
  });
});