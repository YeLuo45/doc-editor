/**
 * V194 AgentMarketplace - Direction B Agent Forge (Iter 10/30)
 * nanobot: Browse/install community agent templates
 */
export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  rating: number;
  downloads: number;
  tags: string[];
  publishedAt: number;
}

export interface Installation {
  itemId: string;
  installedAt: number;
  version: string;
  status: 'installed' | 'failed' | 'pending';
}

export interface MarketplaceState {
  items: Map<string, MarketplaceItem>;
  installations: Map<string, Installation>;
  installed: Set<string>;
  failed: number;
}

export function createMarketplaceState(): MarketplaceState {
  return { items: new Map(), installations: new Map(), installed: new Set(), failed: 0 };
}

export function publishItem(state: MarketplaceState, item: MarketplaceItem): MarketplaceState {
  return { ...state, items: new Map(state.items).set(item.id, item) };
}

export function installItem(state: MarketplaceState, id: string): MarketplaceState {
  const item = state.items.get(id);
  if (!item) return { ...state, failed: state.failed + 1 };
  const installation: Installation = { itemId: id, installedAt: Date.now(), version: item.version, status: 'installed' };
  const installed = new Set(state.installed);
  installed.add(id);
  return { ...state, installations: new Map(state.installations).set(id, installation), installed };
}

export function uninstallItem(state: MarketplaceState, id: string): MarketplaceState {
  const installed = new Set(state.installed);
  installed.delete(id);
  return { ...state, installed };
}

export function rateItem(state: MarketplaceState, id: string, rating: number): MarketplaceState {
  const item = state.items.get(id);
  if (!item) return state;
  return { ...state, items: new Map(state.items).set(id, { ...item, rating }) };
}

export function searchByTag(state: MarketplaceState, tag: string): MarketplaceItem[] {
  return Array.from(state.items.values()).filter(i => i.tags.includes(tag));
}

export function searchByName(state: MarketplaceState, query: string): MarketplaceItem[] {
  const q = query.toLowerCase();
  return Array.from(state.items.values()).filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
}

export function topRated(state: MarketplaceState, limit: number = 10): MarketplaceItem[] {
  return Array.from(state.items.values()).sort((a, b) => b.rating - a.rating).slice(0, limit);
}

export function mostDownloaded(state: MarketplaceState, limit: number = 10): MarketplaceItem[] {
  return Array.from(state.items.values()).sort((a, b) => b.downloads - a.downloads).slice(0, limit);
}

export function isInstalled(state: MarketplaceState, id: string): boolean {
  return state.installed.has(id);
}

export function getMarketplaceReport(state: MarketplaceState): { items: number; installed: number; failed: number; avgRating: number } {
  const items = Array.from(state.items.values());
  const avgRating = items.length > 0 ? items.reduce((a, b) => a + b.rating, 0) / items.length : 0;
  return { items: items.length, installed: state.installed.size, failed: state.failed, avgRating };
}
