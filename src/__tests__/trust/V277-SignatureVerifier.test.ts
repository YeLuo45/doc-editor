import { describe, it, expect } from 'vitest';
import {
  createSignatureState, addTrustedKey, removeTrustedKey, attachSignature,
  verifySignature, getSignaturesForDoc, getVerificationsForDoc, isKeyTrusted,
  clearSignatures, getSignatureReport,
} from '../../trust/V277-SignatureVerifier';

describe('V277 SignatureVerifier', () => {
  it('should create empty state', () => {
    const s = createSignatureState();
    expect(s.signatures.size).toBe(0);
    expect(s.trustedKeys.size).toBe(0);
  });

  it('should add trusted key', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'key1');
    expect(isKeyTrusted(s, 'key1')).toBe(true);
  });

  it('should remove trusted key', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'key1');
    s = removeTrustedKey(s, 'key1');
    expect(isKeyTrusted(s, 'key1')).toBe(false);
  });

  it('should attach signature', () => {
    let s = createSignatureState();
    s = attachSignature(s, 'd1', { signerId: 's1', algorithm: 'rsa-sha256', signature: 'sig1', publicKeyId: 'k1', signedAt: Date.now() });
    expect(getSignaturesForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should verify signature with trusted key', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'k1');
    const r = verifySignature(s, 'd1', 's1', 'rsa-sha256', 'sig1', 'k1');
    expect(r.valid).toBe(true);
  });

  it('should reject with untrusted key', () => {
    const s = createSignatureState();
    const r = verifySignature(s, 'd1', 's1', 'rsa-sha256', 'sig1', 'unknown');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('untrusted_key');
  });

  it('should reject empty signature', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'k1');
    const r = verifySignature(s, 'd1', 's1', 'rsa-sha256', '', 'k1');
    expect(r.valid).toBe(false);
  });

  it('should track valid/invalid counts', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'k1');
    let r = verifySignature(s, 'd1', 's1', 'rsa-sha256', 'sig', 'k1');
    s = r.state;
    r = verifySignature(s, 'd1', 's1', 'rsa-sha256', 'sig', 'unknown');
    s = r.state;
    expect(s.totalValid).toBe(1);
    expect(s.totalInvalid).toBe(1);
  });

  it('should get verifications for doc', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'k1');
    let r = verifySignature(s, 'd1', 's1', 'rsa-sha256', 'sig', 'k1');
    s = r.state;
    expect(getVerificationsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should clear signatures', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'k1');
    s = attachSignature(s, 'd1', { signerId: 's1', algorithm: 'rsa-sha256', signature: 'sig', publicKeyId: 'k1', signedAt: Date.now() });
    s = clearSignatures(s);
    expect(s.signatures.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createSignatureState();
    s = addTrustedKey(s, 'k1');
    const r = verifySignature(s, 'd1', 's1', 'ed25519', 'sig', 'k1');
    s = r.state;
    const report = getSignatureReport(s);
    expect(report.totalValid).toBe(1);
    expect(report.trustedKeys).toBe(1);
  });
});
