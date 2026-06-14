/**
 * V237 DocShare - Direction C Doc Federation (Iter 23/30)
 * chatdev: Document sharing permissions across devices
 */
export type SharePermission = 'read' | 'comment' | 'edit' | 'admin';

export interface ShareGrant {
  id: string;
  docId: string;
  granteeType: 'user' | 'device' | 'link';
  granteeId: string;
  permission: SharePermission;
  grantedAt: number;
  expiresAt?: number;
  revoked: boolean;
}

export interface DocShareState {
  grants: Map<string, ShareGrant>;
  nextId: number;
  totalGrants: number;
  activeGrants: number;
}

export function createDocShareState(): DocShareState {
  return { grants: new Map(), nextId: 1, totalGrants: 0, activeGrants: 0 };
}

export function grantAccess(state: DocShareState, docId: string, granteeType: 'user' | 'device' | 'link', granteeId: string, permission: SharePermission, expiresAt?: number): { state: DocShareState; grantId: string } {
  const id = `grant-${state.nextId}`;
  const grant: ShareGrant = { id, docId, granteeType, granteeId, permission, grantedAt: Date.now(), expiresAt, revoked: false };
  return { state: { ...state, grants: new Map(state.grants).set(id, grant), nextId: state.nextId + 1, totalGrants: state.totalGrants + 1, activeGrants: state.activeGrants + 1 }, grantId: id };
}

export function revokeAccess(state: DocShareState, grantId: string): DocShareState {
  const g = state.grants.get(grantId);
  if (!g || g.revoked) return state;
  return { ...state, grants: new Map(state.grants).set(grantId, { ...g, revoked: true }), activeGrants: Math.max(0, state.activeGrants - 1) };
}

export function checkPermission(state: DocShareState, docId: string, granteeId: string, permission: SharePermission): boolean {
  const grants = Array.from(state.grants.values()).filter(g => g.docId === docId && g.granteeId === granteeId && !g.revoked);
  if (grants.length === 0) return false;
  // Check expiry
  const now = Date.now();
  const valid = grants.filter(g => !g.expiresAt || g.expiresAt > now);
  if (valid.length === 0) return false;
  // Permission hierarchy: admin > edit > comment > read
  const levels: SharePermission[] = ['read', 'comment', 'edit', 'admin'];
  const required = levels.indexOf(permission);
  return valid.some(g => levels.indexOf(g.permission) >= required);
}

export function getGrantsForDoc(state: DocShareState, docId: string): ShareGrant[] {
  return Array.from(state.grants.values()).filter(g => g.docId === docId);
}

export function getGrantsForGrantee(state: DocShareState, granteeId: string): ShareGrant[] {
  return Array.from(state.grants.values()).filter(g => g.granteeId === granteeId);
}

export function getActiveGrants(state: DocShareState): ShareGrant[] {
  return Array.from(state.grants.values()).filter(g => !g.revoked);
}

export function getDocShareReport(state: DocShareState): { total: number; active: number; byDoc: Record<string, number>; byPermission: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  const byPermission: Record<string, number> = {};
  for (const g of state.grants.values()) {
    if (!g.revoked) {
      byDoc[g.docId] = (byDoc[g.docId] || 0) + 1;
      byPermission[g.permission] = (byPermission[g.permission] || 0) + 1;
    }
  }
  return { total: state.totalGrants, active: state.activeGrants, byDoc, byPermission };
}
