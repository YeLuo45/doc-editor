import { describe, it, expect } from 'vitest';
import {
  createHasherState, hashContent, getRecord, getHistoryForDoc, getHashForDoc,
  clearHasherState, getHasherReport,
} from '../../trust/V275-DocHasher';

describe('V275 DocHasher', () => {
  it('should create empty state', () => {
    const s = createHasherState();
    expect(s.records.size).toBe(0);
  });

  it('should hash content', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'hello world');
    expect(s.records.size).toBe(1);
  });

  it('should produce different hashes for different content', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'hello');
    s = await hashContent(s, 'd2', 'world');
    expect(getHashForDoc(s, 'd1')).not.toBe(getHashForDoc(s, 'd2'));
  });

  it('should produce same hash for same content', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'test');
    const h1 = getHashForDoc(s, 'd1');
    s = await hashContent(s, 'd2', 'test');
    const h2 = getHashForDoc(s, 'd2');
    expect(h1).toBe(h2);
  });

  it('should increment version', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'v1');
    s = await hashContent(s, 'd1', 'v2');
    expect(s.records.get('d1')!.version).toBe(2);
  });

  it('should track history', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'v1');
    s = await hashContent(s, 'd1', 'v2');
    expect(getHistoryForDoc(s, 'd1')).toHaveLength(2);
  });

  it('should get record by docId', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'test');
    expect(getRecord(s, 'd1')).toBeDefined();
  });

  it('should use different algorithms', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'test', 'sha256');
    s = await hashContent(s, 'd2', 'test', 'sha1');
    const r = getHasherReport(s);
    expect(r.byAlgorithm.sha256).toBe(1);
    expect(r.byAlgorithm.sha1).toBe(1);
  });

  it('should support crc32 algorithm', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'test', 'crc32');
    expect(getHashForDoc(s, 'd1')!.length).toBe(8);
  });

  it('should clear state', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'test');
    s = clearHasherState(s);
    expect(s.records.size).toBe(0);
  });

  it('should produce report', async () => {
    let s = createHasherState();
    s = await hashContent(s, 'd1', 'test');
    const r = getHasherReport(s);
    expect(r.totalHashes).toBe(1);
    expect(r.docsTracked).toBe(1);
  });
});
