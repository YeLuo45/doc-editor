import { describe, it, expect } from 'vitest';
import {
  createMarketplaceState, publishItem, installItem, uninstallItem,
  rateItem, searchByTag, searchByName, topRated, mostDownloaded, isInstalled, getMarketplaceReport,
  type MarketplaceItem,
} from '../../forge/V194-AgentMarketplace';

describe('V194 AgentMarketplace', () => {
  const item: MarketplaceItem = { id: 'm1', name: 'MyAgent', description: 'A great agent', author: 'me', version: '1.0', rating: 4.5, downloads: 100, tags: ['editor'], publishedAt: Date.now() };

  it('should create empty state', () => {
    const s = createMarketplaceState();
    expect(s.items.size).toBe(0);
  });

  it('should publish item', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    expect(s.items.size).toBe(1);
  });

  it('should install item', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    s = installItem(s, 'm1');
    expect(isInstalled(s, 'm1')).toBe(true);
  });

  it('should track failed install', () => {
    let s = createMarketplaceState();
    s = installItem(s, 'nonexistent');
    expect(s.failed).toBe(1);
  });

  it('should uninstall item', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    s = installItem(s, 'm1');
    s = uninstallItem(s, 'm1');
    expect(isInstalled(s, 'm1')).toBe(false);
  });

  it('should rate item', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    s = rateItem(s, 'm1', 5);
    expect(s.items.get('m1')!.rating).toBe(5);
  });

  it('should search by tag', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    s = publishItem(s, { ...item, id: 'm2', tags: ['reviewer'] });
    expect(searchByTag(s, 'editor')).toHaveLength(1);
  });

  it('should search by name', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    expect(searchByName(s, 'my')).toHaveLength(1);
  });

  it('should get top rated', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    s = publishItem(s, { ...item, id: 'm2', rating: 5 });
    const top = topRated(s);
    expect(top[0].rating).toBe(5);
  });

  it('should get most downloaded', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    s = publishItem(s, { ...item, id: 'm2', downloads: 200 });
    const top = mostDownloaded(s);
    expect(top[0].downloads).toBe(200);
  });

  it('should produce report', () => {
    let s = createMarketplaceState();
    s = publishItem(s, item);
    const r = getMarketplaceReport(s);
    expect(r.items).toBe(1);
    expect(r.avgRating).toBe(4.5);
  });
});
