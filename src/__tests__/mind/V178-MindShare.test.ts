import { describe, it, expect } from 'vitest';
import {
  createShareState, share, accessShare, revokeShare,
  getSharesByResource, getSharesByOwner, pruneExpiredShares, getShareReport,
} from '../../mind/V178-MindShare';

describe('V178 MindShare', () => {
  it('should create empty state', () => {
    const s = createShareState();
    expect(s.items.size).toBe(0);
  });

  it('should share item', () => {
    const s = createShareState();
    const { state, id } = share(s, 'context', 'public', 'editor', { data: 'x' });
    expect(state.items.size).toBe(1);
    expect(id).toMatch(/^share-/);
  });

  it('should access shared item', () => {
    let s = createShareState();
    const r = share(s, 'context', 'public', 'editor', { data: 'x' });
    const result = accessShare(r.state, r.id, 'reviewer');
    expect(result.item).toBeDefined();
    expect(result.item!.accessCount).toBe(1);
  });

  it('should reject access to private item', () => {
    let s = createShareState();
    const r = share(s, 'context', 'private', 'editor', { data: 'x' });
    const result = accessShare(r.state, r.id, 'reviewer');
    expect(result.error).toBe('forbidden');
    expect(result.item).toBeUndefined();
  });

  it('should allow access to own private item', () => {
    let s = createShareState();
    const r = share(s, 'context', 'private', 'editor', { data: 'x' });
    const result = accessShare(r.state, r.id, 'editor');
    expect(result.item).toBeDefined();
  });

  it('should reject access to expired item', async () => {
    let s = createShareState();
    const r = share(s, 'context', 'public', 'editor', { data: 'x' }, 10);
    await new Promise(r => setTimeout(r, 20));
    const result = accessShare(r.state, r.id, 'reviewer');
    expect(result.error).toBe('expired');
  });

  it('should revoke share', () => {
    let s = createShareState();
    const r = share(s, 'context', 'public', 'editor', {});
    s = revokeShare(r.state, r.id);
    expect(s.items.size).toBe(0);
  });

  it('should get shares by resource', () => {
    let s = createShareState();
    s = share(s, 'context', 'public', 'a', {}).state;
    s = share(s, 'findings', 'public', 'a', {}).state;
    s = share(s, 'context', 'public', 'b', {}).state;
    expect(getSharesByResource(s, 'context')).toHaveLength(2);
  });

  it('should get shares by owner', () => {
    let s = createShareState();
    s = share(s, 'context', 'public', 'a', {}).state;
    s = share(s, 'context', 'public', 'b', {}).state;
    s = share(s, 'context', 'public', 'a', {}).state;
    expect(getSharesByOwner(s, 'a')).toHaveLength(2);
  });

  it('should prune expired shares', async () => {
    let s = createShareState();
    s = share(s, 'context', 'public', 'a', {}, 10).state;
    s = share(s, 'context', 'public', 'b', {}, 100000).state;
    await new Promise(r => setTimeout(r, 20));
    s = pruneExpiredShares(s);
    expect(s.items.size).toBe(1);
  });

  it('should produce report', () => {
    let s = createShareState();
    s = share(s, 'context', 'public', 'a', {}).state;
    s = share(s, 'findings', 'private', 'b', {}).state;
    const r = getShareReport(s);
    expect(r.total).toBe(2);
    expect(r.byResource.context).toBe(1);
  });
});
