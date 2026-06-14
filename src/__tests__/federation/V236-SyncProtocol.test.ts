import { describe, it, expect } from 'vitest';
import {
  createSyncProtocolState, addSupportedVersion, setPreferredVersion, negotiateProtocol,
  supportsFeature, getNegotiationByPeer, getLatestNegotiation, clearNegotiations, getSyncProtocolReport,
} from '../../federation/V236-SyncProtocol';

describe('V236 SyncProtocol', () => {
  it('should create state with versions', () => {
    const s = createSyncProtocolState();
    expect(s.supportedVersions).toHaveLength(3);
  });

  it('should add version', () => {
    let s = createSyncProtocolState();
    s = addSupportedVersion(s, { version: '3.0.0', features: ['x'], minCompatible: '3.0.0' });
    expect(s.supportedVersions).toHaveLength(4);
  });

  it('should set preferred version', () => {
    let s = createSyncProtocolState();
    s = setPreferredVersion(s, '1.0.0');
    expect(s.preferredVersion).toBe('1.0.0');
  });

  it('should negotiate with known peer', () => {
    const s = createSyncProtocolState();
    const r = negotiateProtocol(s, '2.0.0', ['basic_sync', 'presence', 'unknown_feature']);
    expect(r.negotiation.negotiatedVersion).toBe('2.0.0');
    expect(r.negotiation.agreedFeatures).toContain('basic_sync');
    expect(r.negotiation.rejectedFeatures).toContain('unknown_feature');
  });

  it('should negotiate with unknown peer', () => {
    const s = createSyncProtocolState();
    const r = negotiateProtocol(s, '99.0.0', ['some_feature']);
    expect(r.negotiation.negotiatedVersion).toBe(s.preferredVersion);
  });

  it('should support feature', () => {
    const s = createSyncProtocolState();
    expect(supportsFeature(s, '2.0.0', 'crdt')).toBe(true);
    expect(supportsFeature(s, '1.0.0', 'crdt')).toBe(false);
  });

  it('should get negotiations by peer', () => {
    let s = createSyncProtocolState();
    s = negotiateProtocol(s, '2.0.0', ['basic_sync']).state;
    s = negotiateProtocol(s, '1.0.0', ['basic_sync']).state;
    expect(getNegotiationByPeer(s, '2.0.0')).toHaveLength(1);
  });

  it('should get latest negotiation', () => {
    let s = createSyncProtocolState();
    s = negotiateProtocol(s, '2.0.0', ['basic_sync']).state;
    s = negotiateProtocol(s, '1.0.0', ['basic_sync']).state;
    expect(getLatestNegotiation(s)!.peerVersion).toBe('1.0.0');
  });

  it('should clear negotiations', () => {
    let s = createSyncProtocolState();
    s = negotiateProtocol(s, '2.0.0', ['basic_sync']).state;
    s = clearNegotiations(s);
    expect(s.negotiations).toHaveLength(0);
  });

  it('should produce report', () => {
    const s = createSyncProtocolState();
    const r = getSyncProtocolReport(s);
    expect(r.supportedVersions).toBe(3);
    expect(r.preferredVersion).toBe('2.0.0');
  });
});
