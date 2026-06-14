import { describe, it, expect } from 'vitest';
import {
  createPerfStreamState, publishPerfEvent, subscribePerf, unsubscribePerf,
  getEventsByTopic, getSubscriptionsForTopic, clearPerfStream, getPerfStreamReport,
} from '../../perf/V253-PerfStream';

describe('V253 PerfStream', () => {
  it('should create empty stream', () => {
    const s = createPerfStreamState();
    expect(s.events).toHaveLength(0);
  });

  it('should publish event', () => {
    let s = createPerfStreamState();
    s = publishPerfEvent(s, 'fps', { value: 60 });
    expect(s.totalPublished).toBe(1);
  });

  it('should subscribe and receive', () => {
    let s = createPerfStreamState();
    let received = 0;
    s = subscribePerf(s, 'fps', () => { received++; }).state;
    s = publishPerfEvent(s, 'fps', { value: 60 });
    expect(received).toBe(1);
  });

  it('should unsubscribe', () => {
    let s = createPerfStreamState();
    const r = subscribePerf(s, 'fps', () => {});
    s = unsubscribePerf(r.state, r.subId);
    expect(s.subscriptions).toHaveLength(0);
  });

  it('should support wildcard subscription', () => {
    let s = createPerfStreamState();
    let received = 0;
    s = subscribePerf(s, '*', () => { received++; }).state;
    s = publishPerfEvent(s, 'fps', {});
    s = publishPerfEvent(s, 'memory', {});
    expect(received).toBe(2);
  });

  it('should get events by topic', () => {
    let s = createPerfStreamState();
    s = publishPerfEvent(s, 'fps', {});
    s = publishPerfEvent(s, 'memory', {});
    expect(getEventsByTopic(s, 'fps')).toHaveLength(1);
  });

  it('should get subscriptions for topic', () => {
    let s = createPerfStreamState();
    s = subscribePerf(s, 'fps', () => {}).state;
    s = subscribePerf(s, 'memory', () => {}).state;
    expect(getSubscriptionsForTopic(s, 'fps')).toHaveLength(1);
  });

  it('should clear stream', () => {
    let s = createPerfStreamState();
    s = publishPerfEvent(s, 'fps', {});
    s = clearPerfStream(s);
    expect(s.events).toHaveLength(0);
  });

  it('should cap events at 500', () => {
    let s = createPerfStreamState();
    for (let i = 0; i < 600; i++) s = publishPerfEvent(s, 'fps', { i });
    expect(s.events).toHaveLength(500);
  });

  it('should produce report', () => {
    let s = createPerfStreamState();
    s = publishPerfEvent(s, 'fps', {});
    s = publishPerfEvent(s, 'memory', {});
    const r = getPerfStreamReport(s);
    expect(r.published).toBe(2);
    expect(r.topics).toBe(2);
  });
});
