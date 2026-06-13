import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStyleFingerprint, analyzeText, updateFingerprint, getStyleFingerprint, resetFingerprint,
  type StyleFingerprint,
} from '../../mind/V156-StyleFingerprint';

describe('V156 StyleFingerprint', () => {
  let fp: StyleFingerprint;
  beforeEach(() => { fp = createStyleFingerprint('test'); });

  it('should create default fingerprint', () => {
    expect(fp.id).toBe('test');
    expect(fp.confidence).toBe(0);
    expect(fp.sampleSize).toBe(0);
  });

  it('should analyze text', () => {
    const m = analyzeText('Hello world. This is a test. Another sentence.');
    expect(m.avgSentenceLength).toBeGreaterThan(0);
    expect(m.vocabDiversity).toBeGreaterThan(0);
  });

  it('should return zeros for empty text', () => {
    const m = analyzeText('');
    expect(m.avgSentenceLength).toBe(0);
    expect(m.vocabDiversity).toBe(0);
  });

  it('should detect passive voice in English', () => {
    const m = analyzeText('The book was read. The work was done. She was helped.');
    expect(m.passiveVoiceRatio).toBeGreaterThan(0);
  });

  it('should update fingerprint with new text', () => {
    const updated = updateFingerprint(fp, 'Long descriptive sentence with many words in it.');
    expect(updated.sampleSize).toBeGreaterThan(0);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(fp.updatedAt);
  });

  it('should detect concise style for short sentences', () => {
    let f = createStyleFingerprint('c');
    for (let i = 0; i < 20; i++) f = updateFingerprint(f, 'Hi. Yes. OK. No. Stop. Go. Wait. Run. Jump. Fly.');
    expect(['concise', 'conversational']).toContain(f.primary);
  });

  it('should snapshot fingerprint', () => {
    const snap = getStyleFingerprint(fp);
    expect(snap).not.toBe(fp);
    expect(snap.metrics).not.toBe(fp.metrics);
  });

  it('should reset fingerprint', () => {
    const updated = updateFingerprint(fp, 'Some text here.');
    const fresh = resetFingerprint('c');
    expect(fresh.sampleSize).toBe(0);
    expect(updated.sampleSize).toBeGreaterThan(0);
  });

  it('should grow confidence with more text', () => {
    let f = fp;
    const longText = 'word '.repeat(500);
    f = updateFingerprint(f, longText);
    expect(f.confidence).toBeGreaterThan(0);
  });

  it('should handle Chinese text', () => {
    const m = analyzeText('今天天气真好。我出去散步。看见一只小狗。它在公园里跑来跑去。');
    expect(m.avgSentenceLength).toBeGreaterThan(0);
    expect(m.vocabDiversity).toBeGreaterThan(0);
  });

  it('should detect question ratio', () => {
    const m = analyzeText('Is this real? Are you sure? Why?');
    expect(m.questionRatio).toBeGreaterThan(0);
  });
});
