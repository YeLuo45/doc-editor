/**
 * V302 TrustAdapter - Direction E Trust Verification (Iter 28/30)
 * generic-agent: Adapt trust to organization/policy
 */
export type OrgPolicy = 'strict' | 'standard' | 'relaxed';
export type IndustryType = 'finance' | 'healthcare' | 'tech' | 'government' | 'other';

export interface OrgProfile {
  orgId: string;
  policy: OrgPolicy;
  industry: IndustryType;
  requireMultiFactor: boolean;
  allowedAlgorithms: string[];
  dataRetentionDays: number;
}

export interface TrustAdaptation {
  id: string;
  orgId: string;
  thresholdHigh: number;
  thresholdLow: number;
  algorithm: string;
  reason: string;
  timestamp: number;
}

export interface TrustAdapterState {
  adaptations: Map<string, TrustAdaptation>;
  profiles: Map<string, OrgProfile>;
  nextId: number;
}

export function createTrustAdapterState(): TrustAdapterState {
  return { adaptations: new Map(), profiles: new Map(), nextId: 1 };
}

export function setOrgProfile(state: TrustAdapterState, profile: OrgProfile): TrustAdapterState {
  return { ...state, profiles: new Map(state.profiles).set(profile.orgId, profile) };
}

export function adaptTrustForOrg(state: TrustAdapterState, orgId: string): TrustAdapterState {
  const profile = state.profiles.get(orgId);
  if (!profile) return state;
  let thresholdHigh = 0.7;
  let thresholdLow = 0.3;
  let algorithm = 'sha256';
  if (profile.policy === 'strict') {
    thresholdHigh = 0.9;
    thresholdLow = 0.5;
    algorithm = 'sha256';
  } else if (profile.policy === 'relaxed') {
    thresholdHigh = 0.5;
    thresholdLow = 0.1;
    algorithm = 'sha1';
  }
  if (profile.industry === 'finance' || profile.industry === 'healthcare') {
    thresholdHigh = Math.max(thresholdHigh, 0.85);
  }
  if (profile.industry === 'government') {
    algorithm = 'sha256';
  }
  if (profile.allowedAlgorithms.length > 0 && !profile.allowedAlgorithms.includes(algorithm)) {
    algorithm = profile.allowedAlgorithms[0];
  }
  const reason = `${profile.policy} policy / ${profile.industry} industry / ${profile.requireMultiFactor ? 'mfa' : 'no-mfa'}`;
  const id = `tadapt-${state.nextId}`;
  const adaptation: TrustAdaptation = { id, orgId, thresholdHigh, thresholdLow, algorithm, reason, timestamp: Date.now() };
  return { ...state, adaptations: new Map(state.adaptations).set(orgId, adaptation), nextId: state.nextId + 1 };
}

export function getAdaptationForOrg(state: TrustAdapterState, orgId: string): TrustAdaptation | undefined {
  return state.adaptations.get(orgId);
}

export function getProfile(state: TrustAdapterState, orgId: string): OrgProfile | undefined {
  return state.profiles.get(orgId);
}

export function clearTrustAdaptations(state: TrustAdapterState): TrustAdapterState {
  return { ...state, adaptations: new Map() };
}

export function getTrustAdapterReport(state: TrustAdapterState): { profiles: number; adaptations: number; byPolicy: Record<string, number> } {
  const byPolicy: Record<string, number> = {};
  for (const p of state.profiles.values()) byPolicy[p.policy] = (byPolicy[p.policy] || 0) + 1;
  return { profiles: state.profiles.size, adaptations: state.adaptations.size, byPolicy };
}
