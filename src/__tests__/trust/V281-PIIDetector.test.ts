import { describe, it, expect } from 'vitest';
import {
  createPIIDetectorState, setEnabledTypes, scanDocument, redactPII,
  getPIIResult, getDocsWithPII, getPIIDetectionsByType, clearPIIScans, getPIIDetectorReport,
} from '../../trust/V281-PIIDetector';

describe('V281 PIIDetector', () => {
  it('should create empty state', () => {
    const s = createPIIDetectorState();
    expect(s.results.size).toBe(0);
  });

  it('should detect email', () => {
    let s = createPIIDetectorState();
    const r = scanDocument(s, 'd1', 'Contact: test@example.com');
    expect(r.result.detections.length).toBe(1);
    expect(r.result.detections[0].type).toBe('email');
  });

  it('should detect phone', () => {
    let s = createPIIDetectorState();
    const r = scanDocument(s, 'd1', 'Call 555-123-4567');
    expect(r.result.detections.some(d => d.type === 'phone')).toBe(true);
  });

  it('should detect SSN', () => {
    let s = createPIIDetectorState();
    const r = scanDocument(s, 'd1', 'SSN: 123-45-6789');
    expect(r.result.detections.some(d => d.type === 'ssn')).toBe(true);
  });

  it('should redact PII', () => {
    let s = createPIIDetectorState();
    const r = scanDocument(s, 'd1', 'Email: test@example.com');
    const redacted = redactPII(r.result, 'Email: test@example.com');
    expect(redacted).toContain('[REDACTED]');
    expect(redacted).not.toContain('test@example.com');
  });

  it('should set enabled types', () => {
    let s = createPIIDetectorState();
    s = setEnabledTypes(s, ['email']);
    const r = scanDocument(s, 'd1', 'Email: a@b.com Phone: 555-123-4567');
    expect(r.result.detections.every(d => d.type === 'email')).toBe(true);
  });

  it('should get docs with PII', () => {
    let s = createPIIDetectorState();
    s = scanDocument(s, 'd1', 'test@example.com').state;
    s = scanDocument(s, 'd2', 'no pii here').state;
    expect(getDocsWithPII(s)).toHaveLength(1);
  });

  it('should get detections by type', () => {
    let s = createPIIDetectorState();
    s = scanDocument(s, 'd1', 'a@b.com c@d.com').state;
    expect(getPIIDetectionsByType(s, 'email')).toHaveLength(2);
  });

  it('should clear scans', () => {
    let s = createPIIDetectorState();
    scanDocument(s, 'd1', 'a@b.com');
    s = clearPIIScans(s);
    expect(s.results.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createPIIDetectorState();
    const r = scanDocument(s, 'd1', 'a@b.com');
    const report = getPIIDetectorReport(r.state);
    expect(report.byType.email).toBe(1);
  });

  it('should mark hasPII correctly', () => {
    let s = createPIIDetectorState();
    const r1 = scanDocument(s, 'd1', 'a@b.com');
    expect(r1.result.hasPII).toBe(true);
    const r2 = scanDocument(s, 'd2', 'no pii');
    expect(r2.result.hasPII).toBe(false);
  });
});
