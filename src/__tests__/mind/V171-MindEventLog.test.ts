import { describe, it, expect } from 'vitest';
import {
  createEventLog, logEvent, logDebug, logInfo, logWarn, logError,
  setLevelFilter, setCategoryFilter, clearFilter,
  getEventsByLevel, getEventsByCategory, getRecentEvents, getLogReport,
} from '../../mind/V171-MindEventLog';

describe('V171 MindEventLog', () => {
  it('should create empty log', () => {
    const s = createEventLog();
    expect(s.events).toHaveLength(0);
    expect(s.nextId).toBe(1);
  });

  it('should log event with auto-incrementing id', () => {
    let s = createEventLog();
    s = logEvent(s, 'info', 'edit', 'first');
    s = logEvent(s, 'info', 'edit', 'second');
    expect(s.events[0].id).toBe(1);
    expect(s.events[1].id).toBe(2);
  });

  it('should log all levels', () => {
    let s = createEventLog();
    s = logDebug(s, 'a', 'd');
    s = logInfo(s, 'a', 'i');
    s = logWarn(s, 'a', 'w');
    s = logError(s, 'a', 'e');
    expect(s.events).toHaveLength(4);
  });

  it('should filter by level', () => {
    let s = createEventLog();
    s = setLevelFilter(s, 'warn');
    s = logDebug(s, 'a', 'd');
    s = logInfo(s, 'a', 'i');
    s = logError(s, 'a', 'e');
    expect(getEventsByLevel(s, 'info')).toHaveLength(0);
    expect(s.droppedCount).toBe(2);
  });

  it('should filter by category', () => {
    let s = createEventLog();
    s = setCategoryFilter(s, 'edit');
    s = logInfo(s, 'edit', 'a');
    s = logInfo(s, 'save', 'b');
    expect(s.events).toHaveLength(1);
    expect(s.droppedCount).toBe(1);
  });

  it('should clear filter', () => {
    let s = createEventLog();
    s = setCategoryFilter(s, 'edit');
    s = clearFilter(s);
    s = logInfo(s, 'save', 'a');
    expect(s.events).toHaveLength(1);
  });

  it('should get events by level', () => {
    let s = createEventLog();
    s = logError(s, 'a', 'e1');
    s = logError(s, 'b', 'e2');
    s = logInfo(s, 'c', 'i1');
    expect(getEventsByLevel(s, 'error')).toHaveLength(2);
  });

  it('should get events by category', () => {
    let s = createEventLog();
    s = logInfo(s, 'edit', 'a');
    s = logInfo(s, 'save', 'b');
    s = logInfo(s, 'edit', 'c');
    expect(getEventsByCategory(s, 'edit')).toHaveLength(2);
  });

  it('should get recent events', () => {
    let s = createEventLog();
    for (let i = 0; i < 20; i++) s = logInfo(s, 'x', `m${i}`);
    expect(getRecentEvents(s, 5)).toHaveLength(5);
  });

  it('should produce report', () => {
    let s = createEventLog();
    s = logInfo(s, 'edit', 'a');
    s = logError(s, 'save', 'b');
    const r = getLogReport(s);
    expect(r.total).toBe(2);
    expect(r.byLevel.info).toBe(1);
    expect(r.byLevel.error).toBe(1);
  });

  it('should cap events at 1000', () => {
    let s = createEventLog();
    for (let i = 0; i < 1500; i++) s = logInfo(s, 'x', `m${i}`);
    expect(s.events).toHaveLength(1000);
  });
});
