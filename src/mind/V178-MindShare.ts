/**
 * V178 MindShare - Direction A Writing Mind (Iter 24/30)
 * chatdev: shared context between writing agents
 */
export type ShareScope = 'public' | 'role' | 'private';
export type ShareResource = 'context' | 'findings' | 'suggestions' | 'history' | 'style';

export interface SharedItem {
  id: string;
  resource: ShareResource;
  scope: ShareScope;
  owner: string;
  payload: any;
  sharedAt: number;
  accessCount: number;
  expiresAt?: number;
}

export interface ShareState {
  items: Map<string, SharedItem>;
  accessLog: Array<{ itemId: string; accessor: string; timestamp: number }>;
  nextId: number;
}

export function createShareState(): ShareState {
  return { items: new Map(), accessLog: [], nextId: 1 };
}

export function share(state: ShareState, resource: ShareResource, scope: ShareScope, owner: string, payload: any, ttlMs?: number): { state: ShareState; id: string } {
  const id = `share-${state.nextId}`;
  const item: SharedItem = { id, resource, scope, owner, payload, sharedAt: Date.now(), accessCount: 0, expiresAt: ttlMs ? Date.now() + ttlMs : undefined };
  return { state: { ...state, items: new Map(state.items).set(id, item), nextId: state.nextId + 1 }, id };
}

export function accessShare(state: ShareState, id: string, accessor: string): { state: ShareState; item?: SharedItem; error?: string } {
  const item = state.items.get(id);
  if (!item) return { state, error: 'not found' };
  if (item.expiresAt && item.expiresAt < Date.now()) return { state, error: 'expired' };
  if (item.scope === 'private' && accessor !== item.owner) return { state, error: 'forbidden' };
  if (item.scope === 'role' && accessor !== item.owner && !accessor.startsWith(item.owner + ':')) return { state, error: 'forbidden' };
  const items = new Map(state.items);
  const updated: SharedItem = { ...item, accessCount: item.accessCount + 1 };
  items.set(id, updated);
  return { state: { ...state, items, accessLog: [...state.accessLog, { itemId: id, accessor, timestamp: Date.now() }].slice(-500) }, item: updated };
}

export function revokeShare(state: ShareState, id: string): ShareState {
  const items = new Map(state.items);
  items.delete(id);
  return { ...state, items };
}

export function getSharesByResource(state: ShareState, resource: ShareResource): SharedItem[] {
  return Array.from(state.items.values()).filter(i => i.resource === resource);
}

export function getSharesByOwner(state: ShareState, owner: string): SharedItem[] {
  return Array.from(state.items.values()).filter(i => i.owner === owner);
}

export function pruneExpiredShares(state: ShareState): ShareState {
  const now = Date.now();
  const items = new Map(state.items);
  for (const [id, item] of Array.from(items.entries())) {
    if (item.expiresAt && item.expiresAt < now) items.delete(id);
  }
  return { ...state, items };
}

export function getShareReport(state: ShareState): { total: number; byResource: Record<string, number>; byScope: Record<string, number>; accessLogSize: number } {
  const byResource: Record<string, number> = {};
  const byScope: Record<string, number> = {};
  for (const i of state.items.values()) {
    byResource[i.resource] = (byResource[i.resource] || 0) + 1;
    byScope[i.scope] = (byScope[i.scope] || 0) + 1;
  }
  return { total: state.items.size, byResource, byScope, accessLogSize: state.accessLog.length };
}
