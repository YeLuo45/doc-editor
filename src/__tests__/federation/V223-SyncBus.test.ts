import { describe, it, expect } from 'vitest';
import {
  createSyncBusState, publishSync, subscribeSync, unsubscribeSync,
  getMessagesByTopic, getMessagesByDoc, getSubscriptionsByTopic, clearBus, getSyncBusReport,
} from '../../federation/V223-SyncBus';

describe('V223 SyncBus', () => {
  it('should create empty bus', () => {
    const s = createSyncBusState();
    expect(s.messages).toHaveLength(0);
  });

  it('should publish message', () => {
    let s = createSyncBusState();
    s = publishSync(s, 'doc.update', 'd1', { x: 1 }, 'dev1').state;
    expect(s.totalPublished).toBe(1);
  });

  it('should subscribe and receive', () => {
    let s = createSyncBusState();
    let received = 0;
    s = subscribeSync(s, 'doc.update', 'sub1', () => { received++; }).state;
    s = publishSync(s, 'doc.update', 'd1', { x: 1 }, 'dev1').state;
    expect(received).toBe(1);
    expect(s.totalDelivered).toBe(1);
  });

  it('should unsubscribe', () => {
    let s = createSyncBusState();
    const r = subscribeSync(s, 'topic', 'sub', () => {});
    s = unsubscribeSync(r.state, r.subId);
    expect(s.subscriptions).toHaveLength(0);
  });

  it('should support wildcard subscription', () => {
    let s = createSyncBusState();
    let received = 0;
    s = subscribeSync(s, '*', 'sub1', () => { received++; }).state;
    s = publishSync(s, 'topic.a', 'd1', {}, 'dev').state;
    s = publishSync(s, 'topic.b', 'd1', {}, 'dev').state;
    expect(received).toBe(2);
  });

  it('should get messages by topic', () => {
    let s = createSyncBusState();
    s = publishSync(s, 'a', 'd1', {}, 'dev').state;
    s = publishSync(s, 'a', 'd1', {}, 'dev').state;
    s = publishSync(s, 'b', 'd1', {}, 'dev').state;
    expect(getMessagesByTopic(s, 'a')).toHaveLength(2);
  });

  it('should get messages by doc', () => {
    let s = createSyncBusState();
    s = publishSync(s, 'a', 'd1', {}, 'dev').state;
    s = publishSync(s, 'a', 'd2', {}, 'dev').state;
    expect(getMessagesByDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get subscriptions by topic', () => {
    let s = createSyncBusState();
    s = subscribeSync(s, 'topic', 'sub', () => {}).state;
    expect(getSubscriptionsByTopic(s, 'topic')).toHaveLength(1);
  });

  it('should clear bus', () => {
    let s = createSyncBusState();
    s = publishSync(s, 'a', 'd1', {}, 'dev').state;
    s = clearBus(s);
    expect(s.messages).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createSyncBusState();
    s = publishSync(s, 'a', 'd1', {}, 'dev').state;
    s = publishSync(s, 'b', 'd1', {}, 'dev').state;
    const r = getSyncBusReport(s);
    expect(r.published).toBe(2);
    expect(r.topics).toBe(2);
  });

  it('should cap messages at 500', () => {
    let s = createSyncBusState();
    for (let i = 0; i < 600; i++) s = publishSync(s, 'a', 'd1', { i }, 'dev').state;
    expect(s.messages).toHaveLength(500);
  });
});
