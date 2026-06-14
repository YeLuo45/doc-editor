/**
 * V236 SyncProtocol - Direction C Doc Federation (Iter 22/30)
 * chatdev: Protocol negotiation (version/feature negotiation)
 */
export interface ProtocolVersion {
  version: string;        // semver
  features: string[];
  minCompatible: string;
}

export interface ProtocolNegotiation {
  peerVersion: string;
  negotiatedVersion: string;
  agreedFeatures: string[];
  rejectedFeatures: string[];
  timestamp: number;
}

export interface SyncProtocolState {
  supportedVersions: ProtocolVersion[];
  negotiations: ProtocolNegotiation[];
  preferredVersion: string;
}

export function createSyncProtocolState(): SyncProtocolState {
  return {
    supportedVersions: [
      { version: '1.0.0', features: ['basic_sync', 'conflict_resolution'], minCompatible: '1.0.0' },
      { version: '1.1.0', features: ['basic_sync', 'conflict_resolution', 'presence'], minCompatible: '1.0.0' },
      { version: '2.0.0', features: ['basic_sync', 'conflict_resolution', 'presence', 'crdt', 'vector_clock'], minCompatible: '1.1.0' },
    ],
    negotiations: [],
    preferredVersion: '2.0.0',
  };
}

export function addSupportedVersion(state: SyncProtocolState, version: ProtocolVersion): SyncProtocolState {
  return { ...state, supportedVersions: [...state.supportedVersions, version] };
}

export function setPreferredVersion(state: SyncProtocolState, version: string): SyncProtocolState {
  return { ...state, preferredVersion: version };
}

export function negotiateProtocol(state: SyncProtocolState, peerVersion: string, peerFeatures: string[]): { state: SyncProtocolState; negotiation: ProtocolNegotiation } {
  const peer = state.supportedVersions.find(v => v.version === peerVersion);
  if (!peer) {
    const negotiation: ProtocolNegotiation = { peerVersion, negotiatedVersion: state.preferredVersion, agreedFeatures: [], rejectedFeatures: peerFeatures, timestamp: Date.now() };
    return { state: { ...state, negotiations: [...state.negotiations, negotiation].slice(-100) }, negotiation };
  }
  // Find compatible version
  const compatible = state.supportedVersions.find(v => v.version === peerVersion) || state.supportedVersions[0];
  const agreed = compatible.features.filter(f => peerFeatures.includes(f));
  const rejected = peerFeatures.filter(f => !compatible.features.includes(f));
  const negotiation: ProtocolNegotiation = { peerVersion, negotiatedVersion: compatible.version, agreedFeatures: agreed, rejectedFeatures: rejected, timestamp: Date.now() };
  return { state: { ...state, negotiations: [...state.negotiations, negotiation].slice(-100) }, negotiation };
}

export function supportsFeature(state: SyncProtocolState, version: string, feature: string): boolean {
  const v = state.supportedVersions.find(sv => sv.version === version);
  return v ? v.features.includes(feature) : false;
}

export function getNegotiationByPeer(state: SyncProtocolState, peerVersion: string): ProtocolNegotiation[] {
  return state.negotiations.filter(n => n.peerVersion === peerVersion);
}

export function getLatestNegotiation(state: SyncProtocolState): ProtocolNegotiation | undefined {
  return state.negotiations[state.negotiations.length - 1];
}

export function clearNegotiations(state: SyncProtocolState): SyncProtocolState {
  return { ...state, negotiations: [] };
}

export function getSyncProtocolReport(state: SyncProtocolState): { supportedVersions: number; negotiations: number; preferredVersion: string } {
  return { supportedVersions: state.supportedVersions.length, negotiations: state.negotiations.length, preferredVersion: state.preferredVersion };
}
