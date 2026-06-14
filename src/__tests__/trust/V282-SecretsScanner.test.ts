import { describe, it, expect } from 'vitest';
import {
  createSecretsScannerState, scanForSecrets, getScanResult,
  getDocsWithSecrets, getDetectionsBySeverity, clearSecretScans, getSecretsScannerReport,
} from '../../trust/V282-SecretsScanner';

describe('V282 SecretsScanner', () => {
  it('should create empty state', () => {
    const s = createSecretsScannerState();
    expect(s.results.size).toBe(0);
  });

  it('should detect AWS key', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF');
    expect(r.result.detections.some(d => d.type === 'aws_key')).toBe(true);
  });

  it('should detect GitHub token', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', 'ghp_abcdefghijklmnopqrstuvwxyz0123456789');
    expect(r.result.detections.some(d => d.type === 'github_token')).toBe(true);
  });

  it('should detect private key', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', '-----BEGIN RSA PRIVATE KEY-----');
    expect(r.result.detections.some(d => d.type === 'private_key')).toBe(true);
  });

  it('should detect password', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', 'password: supersecret123');
    expect(r.result.detections.some(d => d.type === 'password')).toBe(true);
  });

  it('should detect JWT', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', 'Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.abc123def456');
    expect(r.result.detections.some(d => d.type === 'jwt')).toBe(true);
  });

  it('should mask secrets', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF');
    expect(r.result.detections[0].masked).toContain('****');
  });

  it('should mark hasSecrets', () => {
    let s = createSecretsScannerState();
    const r1 = scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF');
    expect(r1.result.hasSecrets).toBe(true);
    const r2 = scanForSecrets(s, 'd2', 'clean content');
    expect(r2.result.hasSecrets).toBe(false);
  });

  it('should get docs with secrets', () => {
    let s = createSecretsScannerState();
    s = scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF').state;
    s = scanForSecrets(s, 'd2', 'clean').state;
    expect(getDocsWithSecrets(s)).toHaveLength(1);
  });

  it('should get by severity', () => {
    let s = createSecretsScannerState();
    s = scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF').state;
    expect(getDetectionsBySeverity(s, 'critical')).toHaveLength(1);
  });

  it('should clear scans', () => {
    let s = createSecretsScannerState();
    scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF');
    s = clearSecretScans(s);
    expect(s.results.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createSecretsScannerState();
    const r = scanForSecrets(s, 'd1', 'AKIA1234567890ABCDEF');
    const report = getSecretsScannerReport(r.state);
    expect(report.totalSecrets).toBe(1);
    expect(report.bySeverity.critical).toBe(1);
  });
});
