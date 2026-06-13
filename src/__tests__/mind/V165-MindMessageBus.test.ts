import { describe, it, expect } from 'vitest';
import {
  createMindBus, publish, subscribe, unsubscribe, getMessages,
  getSubscriptionsByTopic, getBusReport, clearBus,
} from '../../mind/V165-MindMessageBus';

describe('V165 MindMessageBus', () => {
  it('should create empty bus', () => {
    const s = createMindBus();
    expect(s.messages).toHaveLength(0);
    expect(s.subscriptions).toHaveLength(0);
    expect(s.totalPublished).toBe(0);
  });

  it('should publish message', () => {
    let s = createMindBus();
    s = publish(s, 'edit', { text: 'hi' }, 'editor');
    expect(s.messages).toHaveLength(1);
    expect(s.totalPublished).toBe(1);
  });

  it('should subscribe and return id', () => {
    const s = createMindBus();
    const cb = () => {};
    const { state, id } = subscribe(s, 'edit', cb);
    expect(state.subscriptions).toHaveLength(1);
    expect(id).toMatch(/^sub-/);
  });

  it('should unsubscribe', () => {
    let s = createMindBus();
    const { state, id } = subscribe(s, 'edit', () => {});
    s = unsubscribe(state, id);
    expect(s.subscriptions).toHaveLength(0);
  });

  it('should count deliveries to subscribers', () => {
    let s = createMindBus();
    const { state: s1 } = subscribe(s, 'edit', () => {});
    const { state: s2 } = subscribe(s1, 'edit', () => {});
    s = publish(s2, 'edit', {}, 'x');
    expect(s.totalDelivered).toBe(2);
  });

  it('should match wildcard subscribers', () => {
    let s = createMindBus();
    const { state: s1 } = subscribe(s, '*', () => {});
    s = publish(s1, 'edit', {}, 'x');
    expect(s.totalDelivered).toBe(1);
  });

  it('should get messages by topic', () => {
    let s = createMindBus();
    s = publish(s, 'edit', { i: 1 }, 'x');
    s = publish(s, 'save', { i: 2 }, 'y');
    const edits = getMessages(s, 'edit');
    expect(edits).toHaveLength(1);
    expect(edits[0].payload).toEqual({ i: 1 });
  });

  it('should cap messages at 500', () => {
    let s = createMindBus();
    for (let i = 0; i < 600; i++) s = publish(s, 'edit', { i }, 'x');
    expect(s.messages).toHaveLength(500);
  });

  it('should get subscriptions by topic', () => {
    let s = createMindBus();
    const { state: s1 } = subscribe(s, 'edit', () => {});
    const { state: s2 } = subscribe(s1, 'save', () => {});
    const { state: s3 } = subscribe(s2, 'edit', () => {});
    const editSubs = getSubscriptionsByTopic(s3, 'edit');
    expect(editSubs).toHaveLength(2);
  });

  it('should produce report', () => {
    let s = createMindBus();
    s = publish(s, 'edit', {}, 'x');
    s = publish(s, 'save', {}, 'x');
    const r = getBusReport(s);
    expect(r.published).toBe(2);
    expect(r.topics).toContain('edit');
    expect(r.topics).toContain('save');
  });

  it('should clear bus', () => {
    let s = createMindBus();
    s = publish(s, 'edit', {}, 'x');
    s = clearBus(s);
    expect(s.messages).toHaveLength(0);
  });
});
