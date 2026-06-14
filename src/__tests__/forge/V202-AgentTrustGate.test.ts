import { describe, it, expect } from 'vitest';
import {
  createTrustState, addTrustedAuthor, addBlockedAuthor, assessAgent,
  isAllowed, getAssessment, getTrustReport,
} from '../../forge/V202-AgentTrustGate';

describe('V202 AgentTrustGate', () => {
  it('should create empty state', () => {
    const s = createTrustState();
    expect(s.assessments.size).toBe(0);
  });

  it('should add trusted author', () => {
    let s = createTrustState();
    s = addTrustedAuthor(s, 'author1');
    expect(s.trustedAuthors.has('author1')).toBe(true);
  });

  it('should add blocked author', () => {
    let s = createTrustState();
    s = addBlockedAuthor(s, 'badactor');
    expect(s.blockedAuthors.has('badactor')).toBe(true);
  });

  it('should assess blocked author', () => {
    let s = createTrustState();
    s = addBlockedAuthor(s, 'bad');
    s = assessAgent(s, 'a', 'bad', 'sig', 0.5, true);
    expect(getAssessment(s, 'a')!.level).toBe('blocked');
  });

  it('should assess trusted agent', () => {
    let s = createTrustState();
    s = addTrustedAuthor(s, 'good');
    s = assessAgent(s, 'a', 'good', 'longenoughsignature', 0.8, true);
    expect(getAssessment(s, 'a')!.level).toBe('trusted');
  });

  it('should fail on short signature', () => {
    let s = createTrustState();
    s = assessAgent(s, 'a', 'a', 'short', 0.8, true);
    expect(getAssessment(s, 'a')!.level).toBe('untrusted');
  });

  it('should warn on low reputation', () => {
    let s = createTrustState();
    s = assessAgent(s, 'a', 'a', 'longenoughsig', 0.4, true);
    const a = getAssessment(s, 'a')!;
    expect(a.checks.some(c => c.name === 'reputation' && c.result === 'warn')).toBe(true);
  });

  it('should warn on missing metadata', () => {
    let s = createTrustState();
    s = assessAgent(s, 'a', 'a', 'longenoughsig', 0.8, false);
    expect(getAssessment(s, 'a')!.checks.some(c => c.name === 'metadata' && c.result === 'warn')).toBe(true);
  });

  it('should check isAllowed', () => {
    let s = createTrustState();
    s = addTrustedAuthor(s, 'good');
    s = assessAgent(s, 'a', 'good', 'longenoughsig', 0.8, true);
    expect(isAllowed(s, 'a')).toBe(true);
  });

  it('should reject blocked from isAllowed', () => {
    let s = createTrustState();
    s = addBlockedAuthor(s, 'bad');
    s = assessAgent(s, 'a', 'bad', 'sig', 0.5, true);
    expect(isAllowed(s, 'a')).toBe(false);
  });

  it('should return undefined for unassessed agent', () => {
    const s = createTrustState();
    expect(getAssessment(s, 'unknown')).toBeUndefined();
  });

  it('should produce report', () => {
    let s = createTrustState();
    s = addTrustedAuthor(s, 'a');
    s = addBlockedAuthor(s, 'b');
    s = assessAgent(s, 'x', 'a', 'longenoughsig', 0.8, true);
    const r = getTrustReport(s);
    expect(r.trustedAuthors).toBe(1);
    expect(r.blockedAuthors).toBe(1);
    expect(r.assessments).toBe(1);
  });
});
