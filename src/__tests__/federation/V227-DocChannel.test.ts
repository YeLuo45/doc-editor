import { describe, it, expect } from 'vitest';
import {
  createDocChannelState, openChannel, closeChannel, pauseChannel, subscribeChannel,
  unsubscribeChannel, pushMessage, flushBuffer, getChannel, getChannelsByState, getDocChannelReport,
} from '../../federation/V227-DocChannel';

describe('V227 DocChannel', () => {
  it('should create empty state', () => {
    const s = createDocChannelState();
    expect(s.channels.size).toBe(0);
  });

  it('should open channel', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    expect(getChannel(s, 'd1')!.state).toBe('open');
  });

  it('should close channel', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = closeChannel(s, 'd1');
    expect(getChannel(s, 'd1')!.state).toBe('closed');
  });

  it('should pause channel', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = pauseChannel(s, 'd1');
    expect(getChannel(s, 'd1')!.state).toBe('paused');
  });

  it('should subscribe', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = subscribeChannel(s, 'd1');
    s = subscribeChannel(s, 'd1');
    expect(getChannel(s, 'd1')!.subscriberCount).toBe(2);
  });

  it('should unsubscribe', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = subscribeChannel(s, 'd1');
    s = unsubscribeChannel(s, 'd1');
    expect(getChannel(s, 'd1')!.subscriberCount).toBe(0);
  });

  it('should push message and count', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = pushMessage(s, 'd1', 5);
    expect(getChannel(s, 'd1')!.messageCount).toBe(5);
    expect(getChannel(s, 'd1')!.bufferSize).toBe(5);
  });

  it('should overflow on large buffer', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = pushMessage(s, 'd1', 1500);
    expect(getChannel(s, 'd1')!.state).toBe('overflow');
  });

  it('should flush buffer and recover from overflow', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = pushMessage(s, 'd1', 1500);
    s = flushBuffer(s, 'd1');
    expect(getChannel(s, 'd1')!.bufferSize).toBe(0);
    expect(getChannel(s, 'd1')!.state).toBe('open');
  });

  it('should get channels by state', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = openChannel(s, 'd2');
    s = closeChannel(s, 'd2');
    expect(getChannelsByState(s, 'open')).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createDocChannelState();
    s = openChannel(s, 'd1');
    s = pushMessage(s, 'd1', 5);
    const r = getDocChannelReport(s);
    expect(r.total).toBe(1);
    expect(r.totalMessages).toBe(5);
  });
});
