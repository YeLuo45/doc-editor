import { describe, it, expect } from 'vitest';
import {
  createTrustEventBus, emitTrustEvent, getEventsByType, getEventsForDoc,
  getHighSeverityEvents, getRecentEvents, clearTrustEvents, getTrustEventReport,
} from '../../trust/V294-TrustEvent';

describe('V294 TrustEvent', () => {
  it('should create empty bus', () => {
    const s = createTrustEventBus();
    expect(s.events).toHaveLength(0);
  });

  it('should emit event', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1');
    expect(s.events).toHaveLength(1);
  });

  it('should get by type', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1');
    s = emitTrustEvent(s, 'tampered', 'd2');
    expect(getEventsByType(s, 'verified')).toHaveLength(1);
  });

  it('should get for doc', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1');
    s = emitTrustEvent(s, 'verified', 'd2');
    expect(getEventsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get high severity', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1', 'low');
    s = emitTrustEvent(s, 'tampered', 'd2', 'high');
    expect(getHighSeverityEvents(s)).toHaveLength(1);
  });

  it('should get recent events', () => {
    let s = createTrustEventBus();
    for (let i = 0; i < 20; i++) s = emitTrustEvent(s, 'verified', 'd1');
    expect(getRecentEvents(s, 5)).toHaveLength(5);
  });

  it('should clear events', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1');
    s = clearTrustEvents(s);
    expect(s.events).toHaveLength(0);
  });

  it('should track actor and metadata', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1', 'low', 'admin', { ip: '127.0.0.1' });
    expect(s.events[0].actorId).toBe('admin');
    expect(s.events[0].metadata.ip).toBe('127.0.0.1');
  });

  it('should cap at 500', () => {
    let s = createTrustEventBus();
    for (let i = 0; i < 600; i++) s = emitTrustEvent(s, 'verified', 'd1');
    expect(s.events).toHaveLength(500);
  });

  it('should produce report', () => {
    let s = createTrustEventBus();
    s = emitTrustEvent(s, 'verified', 'd1', 'low');
    s = emitTrustEvent(s, 'tampered', 'd2', 'high');
    const r = getTrustEventReport(s);
    expect(r.total).toBe(2);
    expect(r.bySeverity.high).toBe(1);
  });
});
