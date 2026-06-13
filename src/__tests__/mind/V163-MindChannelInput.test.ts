import { describe, it, expect } from 'vitest';
import {
  createChannelState, ingestEvent, subscribe, unsubscribe,
  getRecentEvents, filterEvents, pauseChannel, resumeChannel,
  getChannelReport, clearChannel, type InputEventType,
} from '../../mind/V163-MindChannelInput';

describe('V163 MindChannelInput', () => {
  it('should create empty channel', () => {
    const s = createChannelState();
    expect(s.events).toHaveLength(0);
    expect(s.paused).toBe(false);
    expect(s.totalReceived).toBe(0);
  });

  it('should ingest edit event', () => {
    const s = createChannelState();
    const next = ingestEvent(s, 'edit', 'editor', { text: 'hello' });
    expect(next.events).toHaveLength(1);
    expect(next.totalReceived).toBe(1);
  });

  it('should not ingest when paused', () => {
    let s = createChannelState();
    s = pauseChannel(s);
    s = ingestEvent(s, 'edit', 'x', {});
    expect(s.events).toHaveLength(0);
    expect(s.totalReceived).toBe(0);
  });

  it('should resume after pause', () => {
    let s = createChannelState();
    s = pauseChannel(s);
    s = resumeChannel(s);
    s = ingestEvent(s, 'edit', 'x', {});
    expect(s.events).toHaveLength(1);
  });

  it('should subscribe and unsubscribe', () => {
    let s = createChannelState();
    s = subscribe(s, 'sub1');
    s = subscribe(s, 'sub2');
    expect(s.subscribers.size).toBe(2);
    s = unsubscribe(s, 'sub1');
    expect(s.subscribers.size).toBe(1);
  });

  it('should get recent events', () => {
    let s = createChannelState();
    for (let i = 0; i < 20; i++) s = ingestEvent(s, 'edit', 'x', { i });
    const recent = getRecentEvents(s, 5);
    expect(recent).toHaveLength(5);
  });

  it('should filter events by type', () => {
    let s = createChannelState();
    s = ingestEvent(s, 'edit', 'x', {});
    s = ingestEvent(s, 'voice', 'y', {});
    s = ingestEvent(s, 'edit', 'x', {});
    const edits = filterEvents(s, 'edit');
    expect(edits).toHaveLength(2);
  });

  it('should generate report', () => {
    let s = createChannelState();
    s = ingestEvent(s, 'edit', 'x', {});
    s = ingestEvent(s, 'voice', 'y', {});
    s = subscribe(s, 'a');
    const r = getChannelReport(s);
    expect(r.total).toBe(2);
    expect(r.byType.edit).toBe(1);
    expect(r.byType.voice).toBe(1);
    expect(r.subscribers).toBe(1);
  });

  it('should clear channel', () => {
    let s = createChannelState();
    s = ingestEvent(s, 'edit', 'x', {});
    s = subscribe(s, 'a');
    s = clearChannel(s);
    expect(s.events).toHaveLength(0);
    expect(s.subscribers.size).toBe(0);
  });

  it('should cap events at 500', () => {
    let s = createChannelState();
    for (let i = 0; i < 600; i++) s = ingestEvent(s, 'edit', 'x', { i });
    expect(s.events).toHaveLength(500);
  });
});
