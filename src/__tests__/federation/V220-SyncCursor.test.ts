import { describe, it, expect } from 'vitest';
import {
  createCursorState, updateCursor, removeCursor, getCursor, getCursorsForDoc,
  getCursorsForUser, clearStaleCursors, getCursorReport,
  type CursorPosition,
} from '../../federation/V220-SyncCursor';

describe('V220 SyncCursor', () => {
  const cursor = (overrides: Partial<CursorPosition>): CursorPosition => ({ docId: 'd1', userId: 'u1', deviceId: 'dev1', line: 1, column: 1, timestamp: Date.now(), ...overrides });

  it('should create empty state', () => {
    const s = createCursorState();
    expect(s.cursors.size).toBe(0);
  });

  it('should update cursor', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({ line: 5 }));
    expect(getCursor(s, 'u1', 'dev1')!.line).toBe(5);
  });

  it('should remove cursor', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({}));
    s = removeCursor(s, 'u1', 'dev1');
    expect(s.cursors.size).toBe(0);
  });

  it('should get cursor by user+device', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({ column: 10 }));
    expect(getCursor(s, 'u1', 'dev1')!.column).toBe(10);
  });

  it('should get cursors for doc', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({ docId: 'd1', userId: 'u1' }));
    s = updateCursor(s, cursor({ docId: 'd1', userId: 'u2' }));
    s = updateCursor(s, cursor({ docId: 'd2', userId: 'u3' }));
    expect(getCursorsForDoc(s, 'd1')).toHaveLength(2);
  });

  it('should get cursors for user (multi-device)', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({ deviceId: 'dev1' }));
    s = updateCursor(s, cursor({ deviceId: 'dev2' }));
    expect(getCursorsForUser(s, 'u1')).toHaveLength(2);
  });

  it('should clear stale cursors', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({ timestamp: 1000 }));
    s = updateCursor(s, cursor({ deviceId: 'dev2', timestamp: Date.now() }));
    s = clearStaleCursors(s, 30000);
    expect(s.cursors.size).toBe(1);
  });

  it('should produce report', () => {
    let s = createCursorState();
    s = updateCursor(s, cursor({ docId: 'd1' }));
    s = updateCursor(s, cursor({ docId: 'd1', userId: 'u2' }));
    const r = getCursorReport(s);
    expect(r.totalCursors).toBe(2);
    expect(r.byDoc.d1).toBe(2);
  });
});
