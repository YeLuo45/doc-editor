import { describe, it, expect } from 'vitest';
import {
  createVoiceMetrics, analyzeVoice, getVoiceReport, resetVoiceMetrics,
} from '../../mind/V159-VoiceConsistency';

describe('V159 VoiceConsistency', () => {
  it('should create empty metrics', () => {
    const m = createVoiceMetrics();
    expect(m.consistencyScore).toBe(1);
    expect(m.passiveRatio).toBe(0);
  });

  it('should detect first person', () => {
    const r = analyzeVoice('I went to the store. I bought milk.');
    expect(r.dominantPerson).toBe('first');
  });

  it('should detect second person', () => {
    const r = analyzeVoice('You should try this. You will like it.');
    expect(r.dominantPerson).toBe('second');
  });

  it('should detect third person', () => {
    const r = analyzeVoice('He went there. She arrived. They left.');
    expect(r.dominantPerson).toBe('third');
  });

  it('should detect past tense', () => {
    const r = analyzeVoice('She walked. They talked. He danced.');
    expect(r.dominantTense).toBe('past');
  });

  it('should warn on person shifts', () => {
    const r = analyzeVoice('I went there. You should come. He arrived.');
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.metrics.consistencyScore).toBeLessThan(1);
  });

  it('should detect passive voice', () => {
    const r = analyzeVoice('The book was read. The work was done. The task was completed.');
    expect(r.voiceType).toBe('passive');
    expect(r.metrics.passiveRatio).toBeGreaterThan(0);
  });

  it('should detect Chinese person shifts', () => {
    const r = analyzeVoice('我去了商店。你来了。他走了。');
    expect(r.shiftCount).toBeGreaterThan(0);
  });

  it('should report complete voice analysis', () => {
    const r = getVoiceReport('I am writing this. You are reading.');
    expect(r.metrics).toBeDefined();
    expect(r.warnings).toBeDefined();
  });

  it('should reset metrics', () => {
    const m = resetVoiceMetrics();
    expect(m.consistencyScore).toBe(1);
  });

  it('should handle empty text', () => {
    const r = analyzeVoice('');
    expect(r.shiftCount).toBe(0);
    expect(r.warnings).toHaveLength(0);
  });
});
