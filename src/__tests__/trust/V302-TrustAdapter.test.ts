import { describe, it, expect } from 'vitest';
import {
  createTrustAdapterState, setOrgProfile, adaptTrustForOrg,
  getAdaptationForOrg, getProfile, clearTrustAdaptations, getTrustAdapterReport,
} from '../../trust/V302-TrustAdapter';

describe('V302 TrustAdapter', () => {
  it('should create empty state', () => {
    const s = createTrustAdapterState();
    expect(s.adaptations.size).toBe(0);
  });

  it('should set org profile', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'strict', industry: 'finance', requireMultiFactor: true, allowedAlgorithms: ['sha256'], dataRetentionDays: 365 });
    expect(s.profiles.size).toBe(1);
  });

  it('should adapt for strict policy', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'strict', industry: 'tech', requireMultiFactor: true, allowedAlgorithms: [], dataRetentionDays: 90 });
    s = adaptTrustForOrg(s, 'org1');
    const a = getAdaptationForOrg(s, 'org1')!;
    expect(a.thresholdHigh).toBeGreaterThanOrEqual(0.85);
  });

  it('should adapt for finance industry', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'standard', industry: 'finance', requireMultiFactor: false, allowedAlgorithms: [], dataRetentionDays: 365 });
    s = adaptTrustForOrg(s, 'org1');
    expect(getAdaptationForOrg(s, 'org1')!.thresholdHigh).toBeGreaterThanOrEqual(0.85);
  });

  it('should adapt for healthcare industry', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'standard', industry: 'healthcare', requireMultiFactor: false, allowedAlgorithms: [], dataRetentionDays: 365 });
    s = adaptTrustForOrg(s, 'org1');
    expect(getAdaptationForOrg(s, 'org1')!.thresholdHigh).toBeGreaterThanOrEqual(0.85);
  });

  it('should force allowed algorithm', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'strict', industry: 'tech', requireMultiFactor: true, allowedAlgorithms: ['ed25519'], dataRetentionDays: 90 });
    s = adaptTrustForOrg(s, 'org1');
    expect(getAdaptationForOrg(s, 'org1')!.algorithm).toBe('ed25519');
  });

  it('should use sha256 for government', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'standard', industry: 'government', requireMultiFactor: true, allowedAlgorithms: [], dataRetentionDays: 365 });
    s = adaptTrustForOrg(s, 'org1');
    expect(getAdaptationForOrg(s, 'org1')!.algorithm).toBe('sha256');
  });

  it('should get profile', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'standard', industry: 'tech', requireMultiFactor: true, allowedAlgorithms: [], dataRetentionDays: 90 });
    expect(getProfile(s, 'org1')).toBeDefined();
  });

  it('should clear adaptations', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'org1', policy: 'standard', industry: 'tech', requireMultiFactor: true, allowedAlgorithms: [], dataRetentionDays: 90 });
    s = adaptTrustForOrg(s, 'org1');
    s = clearTrustAdaptations(s);
    expect(s.adaptations.size).toBe(0);
  });

  it('should return undefined for missing org', () => {
    const s = createTrustAdapterState();
    expect(getAdaptationForOrg(s, 'unknown')).toBeUndefined();
  });

  it('should not adapt for missing org', () => {
    const s = createTrustAdapterState();
    expect(adaptTrustForOrg(s, 'unknown')).toBe(s);
  });

  it('should produce report', () => {
    let s = createTrustAdapterState();
    s = setOrgProfile(s, { orgId: 'o1', policy: 'strict', industry: 'finance', requireMultiFactor: true, allowedAlgorithms: [], dataRetentionDays: 365 });
    s = setOrgProfile(s, { orgId: 'o2', policy: 'relaxed', industry: 'tech', requireMultiFactor: false, allowedAlgorithms: [], dataRetentionDays: 30 });
    const r = getTrustAdapterReport(s);
    expect(r.profiles).toBe(2);
  });
});
