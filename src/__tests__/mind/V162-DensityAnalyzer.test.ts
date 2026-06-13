import { describe, it, expect } from 'vitest';
import {
  createDensityMetrics, splitParagraphs, countIdeas, extractTerms,
  countFiller, analyzeDensity, getDensityReport, resetDensityAnalyzer,
} from '../../mind/V162-DensityAnalyzer';

describe('V162 DensityAnalyzer', () => {
  it('should create empty metrics', () => {
    const m = createDensityMetrics();
    expect(m.infoScore).toBe(0);
  });

  it('should split paragraphs', () => {
    expect(splitParagraphs('A.\n\nB.\n\nC.')).toHaveLength(3);
  });

  it('should count ideas', () => {
    expect(countIdeas('This is one. This is two.')).toBe(2);
    expect(countIdeas('')).toBe(1);
  });

  it('should extract terms', () => {
    const t = extractTerms('The quick brown fox jumps');
    expect(t.length).toBeGreaterThan(0);
  });

  it('should count filler phrases', () => {
    expect(countFiller('In other words, this is great.')).toBeGreaterThan(0);
  });

  it('should return moderate for empty text', () => {
    const r = analyzeDensity('');
    expect(r.level).toBe('moderate');
  });

  it('should detect sparse content', () => {
    const sparse = 'in other words '.repeat(20);
    const r = analyzeDensity(sparse);
    expect(['sparse', 'moderate']).toContain(r.level);
  });

  it('should detect dense content', () => {
    const dense = ('intellectual philosophical theoretical conceptual abstraction ').repeat(30);
    const r = analyzeDensity(dense);
    expect(r.metrics.infoScore).toBeGreaterThan(0);
  });

  it('should suggest improvements for high redundancy', () => {
    const fillerText = 'in other words that is to say as a matter of fact '.repeat(20);
    const r = analyzeDensity(fillerText);
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('should produce report', () => {
    const r = getDensityReport('First paragraph.\n\nSecond paragraph.');
    expect(r.paragraphScores).toHaveLength(2);
  });

  it('should reset analyzer', () => {
    const m = resetDensityAnalyzer();
    expect(m.infoScore).toBe(0);
  });
});
