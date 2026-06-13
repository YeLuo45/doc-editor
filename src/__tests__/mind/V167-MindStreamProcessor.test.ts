import { describe, it, expect } from 'vitest';
import {
  createStreamProcessor, addStep, processStream, processEvent,
  clearStream, getStreamStepCount,
} from '../../mind/V167-MindStreamProcessor';

describe('V167 MindStreamProcessor', () => {
  it('should create empty processor', () => {
    const p = createStreamProcessor();
    expect(p.steps).toHaveLength(0);
  });

  it('should add step', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'map', fn: (x: number) => x * 2 });
    expect(p.steps).toHaveLength(1);
  });

  it('should process map', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'map', fn: (x: number) => x * 2 });
    expect(processStream(p, [1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('should process filter', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'filter', fn: (x: number) => x > 2 });
    expect(processStream(p, [1, 2, 3, 4])).toEqual([3, 4]);
  });

  it('should process reduce', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'reduce', fn: (v: number, _i: number, acc: number) => (acc || 0) + v });
    expect(processStream(p, [1, 2, 3, 4])).toEqual([10]);
  });

  it('should process tap (side effect)', () => {
    let count = 0;
    let p = createStreamProcessor();
    p = addStep(p, { op: 'tap', fn: () => { count++; } });
    processStream(p, [1, 2, 3]);
    expect(count).toBe(3);
  });

  it('should process chained steps', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'map', fn: (x: number) => x * 2 });
    p = addStep(p, { op: 'filter', fn: (x: number) => x > 4 });
    expect(processStream(p, [1, 2, 3, 4])).toEqual([6, 8]);
  });

  it('should process single event', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'map', fn: (x: number) => x + 1 });
    const { processor, outputs } = processEvent(p, 5);
    expect(processor.buffer).toContain(5);
    expect(outputs[0]).toBe(6);
  });

  it('should cap buffer at 100', () => {
    let p = createStreamProcessor();
    for (let i = 0; i < 150; i++) {
      const r = processEvent(p, i);
      p = r.processor;
    }
    expect(p.buffer).toHaveLength(100);
  });

  it('should clear stream', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'map', fn: (x: any) => x });
    p = clearStream(p);
    expect(p.steps).toHaveLength(0);
  });

  it('should get step count', () => {
    let p = createStreamProcessor();
    p = addStep(p, { op: 'map', fn: (x: any) => x });
    p = addStep(p, { op: 'filter', fn: () => true });
    expect(getStreamStepCount(p)).toBe(2);
  });
});
