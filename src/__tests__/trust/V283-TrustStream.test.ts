import { describe, it, expect } from 'vitest';
import {
  createTrustStreamState, publishTrustEvent, subscribeTrust, unsubscribeTrust,
  getTrustEventsByTopic, getTrustSubscriptions, clearTrustStream, getTrustStreamReport,
} from '../../trust/V283-TrustStream';

describe('V283 TrustStream', () => {
  it('should create empty stream', () => {
    const s = createTrustStreamState();
    expect(s.events).toHaveLength(0);
  });

  it('should publish event', () => {
    let s = createTrustStreamState();
    s = publishTrustEvent(s, 'trust.score', { value: 0.9 });
    expect(s.totalPublished).toBe(1);
  });

  it('should subscribe and receive', () => {
    let s = createTrustStreamState();
    let received = 0;
    s = subscribeTrust(s, 'trust.score', () => { received++; }).state;
    s = publishTrustEvent(s, 'trust.score', {});
    expect(received).toBe(1);
  });

  it('should unsubscribe', () => {
    let s = createTrustStreamState();
    const r = subscribeTrust(s, 'trust.score', () => {});
    s = unsubscribeTrust(r.state, r.subId);
    expect(s.subscriptions).toHaveLength(0);
  });

  it('should support wildcard', () => {
    let s = createTrustStreamState();
    let received = 0;
    s = subscribeTrust(s, '*', () => { received++; }).state;
    s = publishTrustEvent(s, 'a', {});
    s = publishTrustEvent(s, 'b', {});
    expect(received).toBe(2);
  });

  it('should get events by topic', () => {
    let s = createTrustStreamState();
    s = publishTrustEvent(s, 'a', {});
    s = publishTrustEvent(s, 'b', {});
    expect(getTrustEventsByTopic(s, 'a')).toHaveLength(1);
  });

  it('should get subscriptions', () => {
    let s = createTrustStreamState();
    s = subscribeTrust(s, 'a', () => {}).state;
    expect(getTrustSubscriptions(s)).toHaveLength(1);
  });

  it('should clear stream', () => {
    let s = createTrustStreamState();
    s = publishTrustEvent(s, 'a', {});
    s = clearTrustStream(s);
    expect(s.events).toHaveLength(0);
  });

  it('should cap events at 500', () => {
    let s = createTrustStreamState();
    for (let i = 0; i < 600; i++) s = publishTrustEvent(s, 'a', { i });
    expect(s.events).toHaveLength(500);
  });

  it('should produce report', () => {
    let s = createTrustStreamState();
    s = publishTrustEvent(s, 'a', {});
    s = publishTrustEvent(s, 'b', {});
    const r = getTrustStreamReport(s);
    expect(r.topics).toBe(2);
  });

  it('should count delivered', () => {
    let s = createTrustStreamState();
    s = subscribeTrust(s, 'a', () => {}).state;
    s = subscribeTrust(s, '*', () => {}).state;
    s = publishTrustEvent(s, 'a', {});
    expect(s.totalDelivered).toBe(2);
  });
});
