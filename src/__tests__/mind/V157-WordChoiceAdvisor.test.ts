import { describe, it, expect } from 'vitest';
import {
  createWordStats, tokenize, analyzeWordStats, detectWeakVerbs,
  detectOverusedWords, detectJargon, generateAdvice, getWordStatsReport,
} from '../../mind/V157-WordChoiceAdvisor';

describe('V157 WordChoiceAdvisor', () => {
  it('should create empty stats', () => {
    const s = createWordStats();
    expect(s.total).toBe(0);
    expect(s.unique).toBe(0);
  });

  it('should tokenize text', () => {
    expect(tokenize('Hello world')).toEqual(['Hello', 'world']);
    expect(tokenize('你好 世界')).toEqual(['你好', '世界']);
  });

  it('should return zero stats for empty text', () => {
    const s = analyzeWordStats('');
    expect(s.total).toBe(0);
  });

  it('should count unique words', () => {
    const s = analyzeWordStats('the cat sat on the mat');
    expect(s.total).toBe(6);
    expect(s.unique).toBe(5);
  });

  it('should detect weak verbs in English', () => {
    const issues = detectWeakVerbs('I will make this and do that.');
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues[0].level).toBe('weak');
  });

  it('should detect weak verbs in Chinese', () => {
    const issues = detectWeakVerbs('我做这个，也做那个');
    expect(issues.length).toBeGreaterThanOrEqual(1);
  });

  it('should detect overused words', () => {
    const text = 'really really really nice. very very good.';
    const issues = detectOverusedWords(text, 2);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should detect jargon (long words)', () => {
    const text = 'The antidisestablishmentarianism is a word.';
    const issues = detectJargon(text);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('should generate combined advice', () => {
    const advice = generateAdvice('I make this. really really really. The internationalization of the application is done.');
    expect(advice.length).toBeGreaterThan(0);
  });

  it('should report stats', () => {
    const r = getWordStatsReport('make make make nice nice');
    expect(r.weakVerbs).toBeGreaterThan(0);
  });

  it('should limit issues per detector', () => {
    const text = 'make '.repeat(30);
    const issues = detectWeakVerbs(text);
    expect(issues.length).toBeLessThanOrEqual(20);
  });
});
