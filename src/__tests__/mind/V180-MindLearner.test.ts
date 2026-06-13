import { describe, it, expect } from 'vitest';
import {
  createLearnerState, recordFeedback, getAcceptRate, getAgentScore, getPreferenceWeight, getLearnerReport,
} from '../../mind/V180-MindLearner';

describe('V180 MindLearner', () => {
  it('should create empty state', () => {
    const s = createLearnerState();
    expect(s.events).toHaveLength(0);
    expect(s.totalFeedback).toBe(0);
  });

  it('should record accept', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'accept', 'style', 'editor', 0.9);
    expect(s.totalFeedback).toBe(1);
  });

  it('should record reject', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'reject', 'grammar', 'reviewer', 0.5);
    expect(s.events[0].type).toBe('reject');
  });

  it('should record modify', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'modify', 'word', 'editor', 0.7);
    expect(s.events[0].type).toBe('modify');
  });

  it('should get accept rate', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'accept', 'style', 'a', 0.5);
    s = recordFeedback(s, 'accept', 'style', 'a', 0.5);
    s = recordFeedback(s, 'reject', 'style', 'a', 0.5);
    expect(getAcceptRate(s, 'style')).toBeCloseTo(0.666, 2);
  });

  it('should default accept rate to 0.5', () => {
    const s = createLearnerState();
    expect(getAcceptRate(s, 'unknown')).toBe(0.5);
  });

  it('should update agent score on accept', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'accept', 'a', 'editor', 0.5);
    expect(getAgentScore(s, 'editor')).toBeGreaterThan(0.5);
  });

  it('should update agent score on reject', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'reject', 'a', 'editor', 0.5);
    expect(getAgentScore(s, 'editor')).toBeLessThan(0.5);
  });

  it('should get preference weight', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'accept', 'style', 'a', 0.5);
    expect(getPreferenceWeight(s, 'style')).toBeGreaterThan(0.5);
  });

  it('should clamp agent score to [0,1]', () => {
    let s = createLearnerState();
    for (let i = 0; i < 20; i++) s = recordFeedback(s, 'accept', 'a', 'editor', 0.5);
    expect(getAgentScore(s, 'editor')).toBeLessThanOrEqual(1);
  });

  it('should produce report', () => {
    let s = createLearnerState();
    s = recordFeedback(s, 'accept', 'style', 'editor', 0.5);
    const r = getLearnerReport(s);
    expect(r.total).toBe(1);
    expect(r.agentScores.editor).toBeDefined();
  });

  it('should cap events at 500', () => {
    let s = createLearnerState();
    for (let i = 0; i < 600; i++) s = recordFeedback(s, 'accept', 'a', 'b', 0.5);
    expect(s.events).toHaveLength(500);
  });
});
