import { describe, it, expect } from 'vitest';
import {
  createChunkerState, chunkText, getChunk, getChunksInRange, clearChunks, getChunkerReport,
} from '../../perf/V245-ContextChunker';

describe('V245 ContextChunker', () => {
  it('should create empty state', () => {
    const s = createChunkerState();
    expect(s.chunks.size).toBe(0);
  });

  it('should chunk fixed-size text', () => {
    let s = createChunkerState();
    const text = 'a'.repeat(250);
    s = chunkText(s, text, { type: 'fixed', maxChunkSize: 100, overlapSize: 20, preserveBoundaries: false });
    expect(s.chunks.size).toBeGreaterThan(1);
  });

  it('should chunk by sentence', () => {
    let s = createChunkerState();
    const text = 'First sentence. Second sentence. Third sentence.';
    s = chunkText(s, text, { type: 'sentence', maxChunkSize: 100, overlapSize: 0, preserveBoundaries: true });
    expect(s.chunks.size).toBeGreaterThan(1);
  });

  it('should return empty for empty text', () => {
    const s = createChunkerState();
    const newState = chunkText(s, '', { type: 'fixed', maxChunkSize: 100, overlapSize: 0, preserveBoundaries: false });
    expect(newState.chunks.size).toBe(0);
  });

  it('should track token estimates', () => {
    let s = createChunkerState();
    s = chunkText(s, 'a'.repeat(400), { type: 'fixed', maxChunkSize: 100, overlapSize: 0, preserveBoundaries: false });
    expect(s.totalTokens).toBe(100);
  });

  it('should compute overlaps', () => {
    let s = createChunkerState();
    s = chunkText(s, 'a'.repeat(250), { type: 'fixed', maxChunkSize: 100, overlapSize: 30, preserveBoundaries: false });
    const chunks = Array.from(s.chunks.values());
    const hasOverlap = chunks.some(c => c.overlapWith.length > 0);
    expect(hasOverlap).toBe(true);
  });

  it('should get chunk by id', () => {
    let s = createChunkerState();
    s = chunkText(s, 'hello world', { type: 'fixed', maxChunkSize: 5, overlapSize: 0, preserveBoundaries: false });
    const id = Array.from(s.chunks.keys())[0];
    expect(getChunk(s, id)).toBeDefined();
  });

  it('should get chunks in range', () => {
    let s = createChunkerState();
    s = chunkText(s, 'a'.repeat(500), { type: 'fixed', maxChunkSize: 100, overlapSize: 0, preserveBoundaries: false });
    const inRange = getChunksInRange(s, 50, 150);
    expect(inRange.length).toBeGreaterThan(0);
  });

  it('should clear chunks', () => {
    let s = createChunkerState();
    s = chunkText(s, 'hello', { type: 'fixed', maxChunkSize: 100, overlapSize: 0, preserveBoundaries: false });
    s = clearChunks(s);
    expect(s.chunks.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createChunkerState();
    s = chunkText(s, 'hello world', { type: 'fixed', maxChunkSize: 5, overlapSize: 0, preserveBoundaries: false });
    const r = getChunkerReport(s);
    expect(r.totalChunks).toBeGreaterThan(0);
  });
});
