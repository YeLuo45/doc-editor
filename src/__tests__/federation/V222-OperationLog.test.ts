import { describe, it, expect } from 'vitest';
import {
  createOperationLogState, logOp, getEntry, getEntriesByDoc, getEntriesByDevice,
  getEntriesByUser, getRecentEntries, clearOperationLog, getOperationLogReport,
} from '../../federation/V222-OperationLog';

describe('V222 OperationLog', () => {
  it('should create empty log', () => {
    const s = createOperationLogState();
    expect(s.entries).toHaveLength(0);
  });

  it('should log op', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', path: '/a', value: 'x', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    expect(s.entries).toHaveLength(1);
  });

  it('should get entry by id', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    const id = s.entries[0].id;
    expect(getEntry(s, id)).toBeDefined();
  });

  it('should get entries by doc', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    s = logOp(s, { docId: 'd1', opType: 'update', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    s = logOp(s, { docId: 'd2', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    expect(getEntriesByDoc(s, 'd1')).toHaveLength(2);
  });

  it('should get entries by device', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev2', userId: 'u1', vectorClock: {} });
    expect(getEntriesByDevice(s, 'dev1')).toHaveLength(1);
  });

  it('should get entries by user', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev1', userId: 'u2', vectorClock: {} });
    expect(getEntriesByUser(s, 'u1')).toHaveLength(1);
  });

  it('should get recent entries', () => {
    let s = createOperationLogState();
    for (let i = 0; i < 20; i++) s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'd', userId: 'u', vectorClock: {} });
    expect(getRecentEntries(s, 5)).toHaveLength(5);
  });

  it('should clear log', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'd', userId: 'u', vectorClock: {} });
    s = clearOperationLog(s);
    expect(s.entries).toHaveLength(0);
  });

  it('should cap at 5000 entries', () => {
    let s = createOperationLogState();
    for (let i = 0; i < 6000; i++) s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'd', userId: 'u', vectorClock: {} });
    expect(s.entries).toHaveLength(5000);
  });

  it('should produce report', () => {
    let s = createOperationLogState();
    s = logOp(s, { docId: 'd1', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    s = logOp(s, { docId: 'd2', opType: 'insert', deviceId: 'dev1', userId: 'u1', vectorClock: {} });
    const r = getOperationLogReport(s);
    expect(r.total).toBe(2);
    expect(r.byDoc.d1).toBe(1);
  });
});
