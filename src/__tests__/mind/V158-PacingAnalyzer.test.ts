import { describe, it, expect } from 'vitest';
import {
  createPaceAnalyzer, splitSentences, splitParagraphs, analyzePacing,
  getPaceLevel, getPacingReport, resetPaceAnalyzer,
} from '../../mind/V158-PacingAnalyzer';

describe('V158 PacingAnalyzer', () => {
  it('should create empty analyzer', () => {
    const a = createPaceAnalyzer();
    expect(a.avgSentenceLength).toBe(0);
  });

  it('should split sentences', () => {
    expect(splitSentences('Hi. Hello! How are you?')).toHaveLength(3);
  });

  it('should split paragraphs', () => {
    const p = splitParagraphs('Para 1.\n\nPara 2.\n\nPara 3.');
    expect(p).toHaveLength(3);
  });

  it('should return moderate for empty text', () => {
    const r = analyzePacing('');
    expect(r.level).toBe('moderate');
    expect(r.suggestions).toContain('Add more content to analyze');
  });

  it('should detect rushed pacing', () => {
    const r = analyzePacing('Go. Run. Stop. Wait. Hi. Bye. Yes. No. OK.');
    expect(['rushed', 'fast']).toContain(r.level);
  });

  it('should detect slow pacing', () => {
    const long = 'word '.repeat(50) + '. ' + 'word '.repeat(50) + '.';
    const r = analyzePacing(long);
    expect(['slow', 'glacial']).toContain(r.level);
  });

  it('should give high score to varied sentences', () => {
    const varied = 'Hi. ' + 'word '.repeat(20) + '. ' + 'OK. ' + 'sentence '.repeat(30) + '. Bye.';
    const r = analyzePacing(varied);
    expect(r.score).toBeGreaterThan(0);
  });

  it('should suggest improvements for monotone', () => {
    const monotone = 'word word word word word. '.repeat(10);
    const r = analyzePacing(monotone);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('should map pace level from average length', () => {
    expect(getPaceLevel(20)).toBe('rushed');
    expect(getPaceLevel(40)).toBe('fast');
    expect(getPaceLevel(80)).toBe('moderate');
    expect(getPaceLevel(120)).toBe('slow');
    expect(getPaceLevel(200)).toBe('glacial');
  });

  it('should produce report', () => {
    const r = getPacingReport('First. Second. Third.');
    expect(r.metrics).toBeDefined();
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('should reset analyzer', () => {
    const a = resetPaceAnalyzer();
    expect(a.avgSentenceLength).toBe(0);
  });
});
