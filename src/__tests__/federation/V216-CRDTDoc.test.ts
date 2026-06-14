import { describe, it, expect } from 'vitest';
import {
  createCRDTDocState, lwwSet, lwwDelete, lwwGet, orsetAdd, orsetRemove, orsetHas, orsetList, mergeCRDT, getCRDTDocReport,
} from '../../federation/V216-CRDTDoc';

describe('V216 CRDTDoc', () => {
  it('should create CRDT doc', () => {
    const s = createCRDTDocState('d1', 'dev1');
    expect(s.lww.size).toBe(0);
    expect(s.orset.size).toBe(0);
  });

  it('should lww set and get', () => {
    let s = createCRDTDocState('d1', 'dev1');
    s = lwwSet(s, 'title', 'Hello');
    expect(lwwGet(s, 'title')).toBe('Hello');
  });

  it('should lww delete (tombstone)', () => {
    let s = createCRDTDocState('d1', 'dev1');
    s = lwwSet(s, 'k', 'v');
    s = lwwDelete(s, 'k');
    expect(lwwGet(s, 'k')).toBeUndefined();
  });

  it('should orset add and has', () => {
    let s = createCRDTDocState('d1', 'dev1');
    s = orsetAdd(s, 'tag1');
    expect(orsetHas(s, 'tag1')).toBe(true);
  });

  it('should orset remove', () => {
    let s = createCRDTDocState('d1', 'dev1');
    s = orsetAdd(s, 'tag1');
    s = orsetRemove(s, 'tag1');
    expect(orsetHas(s, 'tag1')).toBe(false);
  });

  it('should orset list', () => {
    let s = createCRDTDocState('d1', 'dev1');
    s = orsetAdd(s, 'a');
    s = orsetAdd(s, 'b');
    s = orsetAdd(s, 'c');
    s = orsetRemove(s, 'b');
    expect(orsetList(s)).toEqual(['a', 'c']);
  });

  it('should merge two CRDT docs (LWW)', async () => {
    let s1 = createCRDTDocState('d1', 'dev1');
    let s2 = createCRDTDocState('d1', 'dev2');
    s1 = lwwSet(s1, 'k', 'v1');
    await new Promise(r => setTimeout(r, 5));
    s2 = lwwSet(s2, 'k', 'v2');
    const merged = mergeCRDT(s1, s2);
    // Last write wins (s2's v2 is newer)
    expect(lwwGet(merged, 'k')).toBe('v2');
  });

  it('should merge two CRDT docs (ORSet)', () => {
    let s1 = createCRDTDocState('d1', 'dev1');
    let s2 = createCRDTDocState('d1', 'dev2');
    s1 = orsetAdd(s1, 'a');
    s2 = orsetAdd(s2, 'b');
    const merged = mergeCRDT(s1, s2);
    expect(orsetHas(merged, 'a')).toBe(true);
    expect(orsetHas(merged, 'b')).toBe(true);
  });

  it('should handle delete wins in OR-Set merge', async () => {
    let s1 = createCRDTDocState('d1', 'dev1');
    let s2 = createCRDTDocState('d1', 'dev2');
    s1 = orsetAdd(s1, 'a');
    await new Promise(r => setTimeout(r, 5));
    s2 = orsetRemove(s2, 'a');
    // s2 doesn't have the add, so merge needs to handle cross-device
    const merged = mergeCRDT(s1, s2);
    // The entry in merged.orset should be from s1 with removed info from s2 if newer
    expect(orsetHas(merged, 'a')).toBe(false);
  });

  it('should produce report', () => {
    let s = createCRDTDocState('d1', 'dev1');
    s = lwwSet(s, 'k', 'v');
    s = orsetAdd(s, 'a');
    const r = getCRDTDocReport(s);
    expect(r.lwwSize).toBe(1);
    expect(r.orsetSize).toBe(1);
  });
});
