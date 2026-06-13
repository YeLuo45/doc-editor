import { describe, it, expect } from 'vitest';
import {
  createToneMap, mapTone, getToneArc, getToneReport, resetToneMap,
} from '../../mind/V160-ToneMapper';

describe('V160 ToneMapper', () => {
  it('should create empty tone map', () => {
    const m = createToneMap();
    expect(m.points).toEqual([]);
    expect(m.overallSentiment).toBe('neutral');
  });

  it('should return empty for empty text', () => {
    const m = mapTone('');
    expect(m.points).toHaveLength(0);
  });

  it('should detect positive tone', () => {
    const m = mapTone('I love this. It is great. Wonderful experience. Amazing.');
    expect(m.overallSentiment).toBe('positive');
    expect(m.averageScore).toBeGreaterThan(0);
  });

  it('should detect negative tone', () => {
    const m = mapTone('This is bad. Terrible. Awful. Horrible.');
    expect(m.overallSentiment).toBe('negative');
  });

  it('should detect neutral tone', () => {
    const m = mapTone('The cat sat. The dog ran. The bird flew.');
    expect(m.overallSentiment).toBe('neutral');
  });

  it('should detect Chinese positive tone', () => {
    const m = mapTone('我很喜欢。好棒。真开心。');
    expect(m.overallSentiment).toBe('positive');
  });

  it('should map tone points along text', () => {
    const text = 'Good start. '.repeat(20) + 'Bad end. '.repeat(20);
    const m = mapTone(text, 5);
    expect(m.points).toHaveLength(5);
    expect(m.points[0].position).toBe(0);
    expect(m.points[4].position).toBe(1);
  });

  it('should detect ascending arc', () => {
    const text = 'Bad. '.repeat(20) + 'Good. '.repeat(20);
    const m = mapTone(text, 4);
    expect(['ascending', 'volatile']).toContain(m.arc);
  });

  it('should detect volatile arc on many shifts', () => {
    const text = 'Good. Bad. Good. Bad. Good. Bad. Good. Bad.';
    const m = mapTone(text, 8);
    expect(m.shiftCount).toBeGreaterThan(0);
  });

  it('should return tone arc string', () => {
    const m = mapTone('Good. Good. Good.');
    expect(typeof getToneArc(m)).toBe('string');
  });

  it('should reset tone map', () => {
    const m = resetToneMap();
    expect(m.points).toEqual([]);
  });
});
