/**
 * V287 TrustRegistry - Direction E Trust Verification (Iter 13/30)
 * nanobot: Registry of trust authorities/issuers
 */
export type AuthorityType = 'root_ca' | 'intermediate' | 'ocsp' | 'custom';

export interface TrustAuthority {
  id: string;
  name: string;
  type: AuthorityType;
  publicKey?: string;
  valid: boolean;
  registeredAt: number;
  metadata: Record<string, any>;
}

export interface TrustRegistryState {
  authorities: Map<string, TrustAuthority>;
  nextId: number;
  totalRegistered: number;
}

export function createTrustRegistryState(): TrustRegistryState {
  return { authorities: new Map(), nextId: 1, totalRegistered: 0 };
}

export function registerAuthority(state: TrustRegistryState, name: string, type: AuthorityType, publicKey?: string, metadata: Record<string, any> = {}): { state: TrustRegistryState; authorityId: string } {
  const id = `auth-${state.nextId}`;
  const authority: TrustAuthority = { id, name, type, publicKey, valid: true, registeredAt: Date.now(), metadata };
  return { state: { ...state, authorities: new Map(state.authorities).set(id, authority), nextId: state.nextId + 1, totalRegistered: state.totalRegistered + 1 }, authorityId: id };
}

export function revokeAuthority(state: TrustRegistryState, authorityId: string): TrustRegistryState {
  const auth = state.authorities.get(authorityId);
  if (!auth) return state;
  return { ...state, authorities: new Map(state.authorities).set(authorityId, { ...auth, valid: false }) };
}

export function getAuthority(state: TrustRegistryState, authorityId: string): TrustAuthority | undefined {
  return state.authorities.get(authorityId);
}

export function getAuthoritiesByType(state: TrustRegistryState, type: AuthorityType): TrustAuthority[] {
  return Array.from(state.authorities.values()).filter(a => a.type === type);
}

export function getValidAuthorities(state: TrustRegistryState): TrustAuthority[] {
  return Array.from(state.authorities.values()).filter(a => a.valid);
}

export function isAuthorityValid(state: TrustRegistryState, authorityId: string): boolean {
  const auth = state.authorities.get(authorityId);
  return auth ? auth.valid : false;
}

export function clearTrustRegistry(state: TrustRegistryState): TrustRegistryState {
  return createTrustRegistryState();
}

export function getTrustRegistryReport(state: TrustRegistryState): { total: number; valid: number; revoked: number; byType: Record<string, number> } {
  const valid = getValidAuthorities(state).length;
  const byType: Record<string, number> = {};
  for (const a of state.authorities.values()) byType[a.type] = (byType[a.type] || 0) + 1;
  return { total: state.totalRegistered, valid, revoked: state.totalRegistered - valid, byType };
}
