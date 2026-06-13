import { describe, it, expect } from 'vitest';
import {
  createOutputChannel, enqueue, deliver, getLastDelivered, suppress,
  getPendingByType, getPendingByPriority, getOutputReport, clearOutput,
} from '../../mind/V164-MindChannelOutput';

describe('V164 MindChannelOutput', () => {
  it('should create empty channel', () => {
    const c = createOutputChannel();
    expect(c.pending).toHaveLength(0);
    expect(c.delivered).toHaveLength(0);
  });

  it('should enqueue message', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'normal', 'try this', 'editor');
    expect(c.pending).toHaveLength(1);
    expect(c.pending[0].delivered).toBe(false);
  });

  it('should sort by priority (critical first)', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'low', 'low msg', 'x');
    c = enqueue(c, 'warning', 'critical', 'critical msg', 'x');
    c = enqueue(c, 'insight', 'normal', 'normal msg', 'x');
    expect(c.pending[0].priority).toBe('critical');
  });

  it('should deliver messages', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'normal', 'msg1', 'x');
    c = enqueue(c, 'suggestion', 'normal', 'msg2', 'x');
    c = deliver(c, 5);
    expect(c.delivered).toHaveLength(2);
    expect(c.pending).toHaveLength(0);
    expect(c.delivered[0].delivered).toBe(true);
  });

  it('should respect maxItems limit', () => {
    let c = createOutputChannel();
    for (let i = 0; i < 10; i++) c = enqueue(c, 'suggestion', 'normal', `m${i}`, 'x');
    c = deliver(c, 3);
    expect(c.delivered).toHaveLength(3);
    expect(c.pending).toHaveLength(7);
  });

  it('should suppress messages', () => {
    let c = createOutputChannel();
    c = suppress(c, 5);
    expect(c.suppressed).toBe(5);
  });

  it('should filter pending by type', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'normal', 'a', 'x');
    c = enqueue(c, 'warning', 'normal', 'b', 'x');
    expect(getPendingByType(c, 'warning')).toHaveLength(1);
  });

  it('should filter pending by priority', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'high', 'a', 'x');
    c = enqueue(c, 'warning', 'low', 'b', 'x');
    expect(getPendingByPriority(c, 'high')).toHaveLength(1);
  });

  it('should produce report', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'normal', 'a', 'x');
    c = deliver(c);
    const r = getOutputReport(c);
    expect(r.delivered).toBe(1);
    expect(r.byType.suggestion).toBe(1);
  });

  it('should clear channel', () => {
    let c = createOutputChannel();
    c = enqueue(c, 'suggestion', 'normal', 'a', 'x');
    c = clearOutput(c);
    expect(c.pending).toHaveLength(0);
  });

  it('should cap delivered at 200', () => {
    let c = createOutputChannel();
    for (let i = 0; i < 250; i++) {
      c = enqueue(c, 'suggestion', 'normal', `m${i}`, 'x');
      c = deliver(c, 1);
    }
    expect(c.delivered.length).toBeLessThanOrEqual(200);
  });
});
