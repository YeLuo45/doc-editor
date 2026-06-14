import { describe, it, expect } from 'vitest';
import {
  createTrustRegistryState, registerAuthority, revokeAuthority, getAuthority,
  getAuthoritiesByType, getValidAuthorities, isAuthorityValid, clearTrustRegistry, getTrustRegistryReport,
} from '../../trust/V287-TrustRegistry';

describe('V287 TrustRegistry', () => {
  it('should create empty registry', () => {
    const s = createTrustRegistryState();
    expect(s.authorities.size).toBe(0);
  });

  it('should register authority', () => {
    const s = createTrustRegistryState();
    const r = registerAuthority(s, 'CA1', 'root_ca', 'key1');
    expect(r.state.authorities.size).toBe(1);
  });

  it('should revoke authority', () => {
    let s = createTrustRegistryState();
    const r = registerAuthority(s, 'CA1', 'root_ca', 'key1');
    s = revokeAuthority(r.state, r.authorityId);
    expect(s.authorities.get(r.authorityId)!.valid).toBe(false);
  });

  it('should get authority', () => {
    let s = createTrustRegistryState();
    const r = registerAuthority(s, 'CA1', 'root_ca', 'key1');
    s = r.state;
    expect(getAuthority(s, r.authorityId)).toBeDefined();
  });

  it('should get by type', () => {
    let s = createTrustRegistryState();
    s = registerAuthority(s, 'CA1', 'root_ca', 'k1').state;
    s = registerAuthority(s, 'CA2', 'intermediate', 'k2').state;
    s = registerAuthority(s, 'OCSP1', 'ocsp', 'k3').state;
    expect(getAuthoritiesByType(s, 'root_ca')).toHaveLength(1);
  });

  it('should get valid authorities', () => {
    let s = createTrustRegistryState();
    const r1 = registerAuthority(s, 'CA1', 'root_ca', 'k1');
    s = r1.state;
    const r2 = registerAuthority(s, 'CA2', 'root_ca', 'k2');
    s = r2.state;
    s = revokeAuthority(s, r1.authorityId);
    expect(getValidAuthorities(s)).toHaveLength(1);
  });

  it('should check isAuthorityValid', () => {
    let s = createTrustRegistryState();
    const r = registerAuthority(s, 'CA1', 'root_ca', 'k1');
    s = r.state;
    expect(isAuthorityValid(s, r.authorityId)).toBe(true);
  });

  it('should return false for unknown authority', () => {
    const s = createTrustRegistryState();
    expect(isAuthorityValid(s, 'unknown')).toBe(false);
  });

  it('should clear registry', () => {
    let s = createTrustRegistryState();
    s = registerAuthority(s, 'CA1', 'root_ca', 'k1').state;
    s = clearTrustRegistry(s);
    expect(s.authorities.size).toBe(0);
  });

  it('should track metadata', () => {
    const s = createTrustRegistryState();
    const r = registerAuthority(s, 'CA1', 'root_ca', 'k1', { country: 'US' });
    expect(r.state.authorities.get(r.authorityId)!.metadata.country).toBe('US');
  });

  it('should produce report', () => {
    let s = createTrustRegistryState();
    s = registerAuthority(s, 'CA1', 'root_ca', 'k1').state;
    s = registerAuthority(s, 'CA2', 'intermediate', 'k2').state;
    const r = getTrustRegistryReport(s);
    expect(r.total).toBe(2);
    expect(r.valid).toBe(2);
  });
});
