import { describe, it, expect } from 'vitest';
import {
  createReadabilityMetrics, tokenizeWords, splitSentences, calculateReadability,
  getReadabilityLevel, getReadabilityReport, resetReadability,
} from '../../mind/V161-ReadabilityStream';

describe('V161 ReadabilityStream', () => {
  it('should create empty metrics', () => {
    const m = createReadabilityMetrics();
    expect(m.fleschKincaid).toBe(0);
  });

  it('should tokenize words', () => {
    expect(tokenizeWords('Hello world foo')).toEqual(['Hello', 'world', 'foo']);
  });

  it('should split sentences', () => {
    expect(splitSentences('Hi. Hello! How?')).toHaveLength(3);
  });

  it('should handle empty text', () => {
    const r = calculateReadability('');
    expect(r.suggestions).toContain('Add text to analyze');
  });

  it('should calculate readability for simple text', () => {
    const r = calculateReadability('The cat sat. The dog ran. We played.');
    expect(r.score).toBeGreaterThan(0);
    expect(['elementary', 'middle']).toContain(r.level);
  });

  it('should detect complex text', () => {
    const complex = 'The antidisestablishmentarianism of the constitutional interpretation requires multidisciplinary consideration. '.repeat(5);
    const r = calculateReadability(complex);
    expect(['college', 'graduate', 'expert']).toContain(r.level);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('should map grade level to label', () => {
    expect(getReadabilityLevel(3)).toBe('elementary');
    expect(getReadabilityLevel(6)).toBe('middle');
    expect(getReadabilityLevel(10)).toBe('high_school');
    expect(getReadabilityLevel(14)).toBe('college');
    expect(getReadabilityLevel(18)).toBe('graduate');
    expect(getReadabilityLevel(25)).toBe('expert');
  });

  it('should give suggestions for long sentences', () => {
    const longSentence = 'word '.repeat(30) + '.';
    const r = calculateReadability(longSentence);
    expect(r.suggestions.some(s => s.includes('shorter'))).toBe(true);
  });

  it('should produce report', () => {
    const r = getReadabilityReport('Simple text here.');
    expect(r.metrics).toBeDefined();
  });

  it('should reset metrics', () => {
    const m = resetReadability();
    expect(m.fleschKincaid).toBe(0);
  });

  it('should detect Chinese readability', () => {
    const r = calculateReadability('今天天气真好。我出去散步。看见一只小狗。');
    expect(r.metrics.avgWordsPerSentence).toBeGreaterThan(0);
  });
});
