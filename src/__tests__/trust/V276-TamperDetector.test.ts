import { describe, it, expect } from 'vitest';
import {
  createTamperDetectorState, sealDocument, checkTamper, unsealDocument,
  getSeal, getEventsForDoc, getRecentEvents, clearTamperState, getTamperReport,
} from '../../trust/V276-TamperDetector';

describe('V276 TamperDetector', () => {
  it('should create empty state', () => {
    const s = createTamperDetectorState();
    expect(s.seals.size).toBe(0);
  });

  it('should seal document', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    expect(s.seals.size).toBe(1);
  });

  it('should detect unmodified', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    const r = checkTamper(s, 'd1', 'hash123', 100);
    expect(r.status).toBe('unmodified');
  });

  it('should detect tampered', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    const r = checkTamper(s, 'd1', 'DIFFERENT', 100);
    expect(r.status).toBe('tampered');
    expect(r.severity).toBe('critical');
  });

  it('should detect modified length', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    const r = checkTamper(s, 'd1', 'hash123', 200);
    expect(r.status).toBe('modified');
    expect(r.severity).toBe('high');
  });

  it('should return unknown for unsealed doc', () => {
    const s = createTamperDetectorState();
    const r = checkTamper(s, 'unknown', 'hash', 100);
    expect(r.status).toBe('unknown');
  });

  it('should unseal document', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    s = unsealDocument(s, 'd1');
    expect(s.seals.size).toBe(0);
  });

  it('should get seal', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    expect(getSeal(s, 'd1')).toBeDefined();
  });

  it('should track events', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash123', 100, 'admin');
    const r = checkTamper(s, 'd1', 'WRONG', 100);
    s = r.state;
    expect(getEventsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get recent events', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash', 100, 'a');
    for (let i = 0; i < 5; i++) {
      const r = checkTamper(s, 'd1', 'WRONG_' + i, 100);
      s = r.state;
    }
    expect(getRecentEvents(s, 3)).toHaveLength(3);
  });

  it('should clear state', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash', 100, 'a');
    s = clearTamperState(s);
    expect(s.seals.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createTamperDetectorState();
    s = sealDocument(s, 'd1', 'hash', 100, 'a');
    const r = checkTamper(s, 'd1', 'WRONG', 100);
    const report = getTamperReport(r.state);
    expect(report.totalSeals).toBe(1);
    expect(report.totalTampered).toBe(1);
  });
});
