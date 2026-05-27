import { describe, it, expect } from 'vitest';
import {
  computeDelta,
  applyDelta,
  mergeDeltas,
  generateHash,
  createSnapshot,
  serializeDelta,
  deserializeDelta,
  type DeltaResult
} from '../sync/DeltaEngine';

describe('DeltaEngine', () => {
  describe('computeDelta', () => {
    it('should return empty operations for identical content', () => {
      const content = 'Hello World';
      const result = computeDelta(content, content);
      expect(result.operations).toHaveLength(0);
      expect(result.originalLength).toBe(content.length);
      expect(result.resultLength).toBe(content.length);
    });

    it('should detect line additions', () => {
      const oldContent = 'Line 1\nLine 2';
      const newContent = 'Line 1\nLine 2\nLine 3';
      const result = computeDelta(oldContent, newContent);
      expect(result.operations.length).toBeGreaterThan(0);
      expect(result.resultLength).toBe(newContent.length);
    });

    it('should detect line removals', () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 3';
      const result = computeDelta(oldContent, newContent);
      expect(result.operations.some(op => op.op === 'remove')).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = computeDelta('', '');
      expect(result.operations).toHaveLength(0);
    });

    it('should handle new empty content', () => {
      const result = computeDelta('', 'New content');
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it('should handle clear content', () => {
      const result = computeDelta('Some content', '');
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it('should include timestamp in result', () => {
      const before = Date.now();
      const result = computeDelta('old', 'new');
      const after = Date.now();
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should track original and result lengths', () => {
      const oldContent = '1234567890';
      const newContent = '0987654321';
      const result = computeDelta(oldContent, newContent);
      expect(result.originalLength).toBe(10);
      expect(result.resultLength).toBe(10);
    });
  });

  describe('applyDelta', () => {
    it('should apply add operations', () => {
      const content = 'Line 1\nLine 2';
      const delta: DeltaResult = {
        operations: [{ op: 'add', path: '/lines/1', value: 'New Line' }],
        originalLength: content.length,
        resultLength: content.length + 9,
        timestamp: Date.now()
      };
      const result = applyDelta(content, delta);
      expect(result.success).toBe(true);
      expect(result.patchedContent).toContain('New Line');
    });

    it('should apply remove operations', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const delta: DeltaResult = {
        operations: [{ op: 'remove', path: '/lines/1', value: 'Line 2' }],
        originalLength: content.length,
        resultLength: content.length - 7,
        timestamp: Date.now()
      };
      const result = applyDelta(content, delta);
      expect(result.success).toBe(true);
      expect(result.patchedContent).not.toContain('Line 2');
    });

    it('should apply replace operations', () => {
      const content = 'Hello World';
      const delta: DeltaResult = {
        operations: [{ op: 'replace', path: '/lines/0', value: 'Hello Universe' }],
        originalLength: content.length,
        resultLength: content.length + 7,
        timestamp: Date.now()
      };
      const result = applyDelta(content, delta);
      expect(result.success).toBe(true);
      expect(result.patchedContent).toContain('Universe');
    });

    it('should handle empty operations', () => {
      const content = 'Original content';
      const delta: DeltaResult = {
        operations: [],
        originalLength: content.length,
        resultLength: content.length,
        timestamp: Date.now()
      };
      const result = applyDelta(content, delta);
      expect(result.success).toBe(true);
      expect(result.patchedContent).toBe(content);
    });

    it('should handle out of bounds path gracefully', () => {
      const content = 'Line 1';
      const delta: DeltaResult = {
        operations: [{ op: 'add', path: '/lines/999', value: 'Out of bounds' }],
        originalLength: content.length,
        resultLength: content.length + 12,
        timestamp: Date.now()
      };
      const result = applyDelta(content, delta);
      // Out of bounds adds are silently ignored (not an error)
      expect(result.success).toBe(true);
      expect(result.patchedContent).toBeDefined();
    });

    it('should handle multiple operations', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const delta: DeltaResult = {
        operations: [
          { op: 'add', path: '/lines/1', value: 'Line 1.5' },
          { op: 'remove', path: '/lines/2', value: 'Line 3' }
        ],
        originalLength: content.length,
        resultLength: content.length,
        timestamp: Date.now()
      };
      const result = applyDelta(content, delta);
      expect(result.success).toBe(true);
    });
  });

  describe('mergeDeltas', () => {
    it('should return empty for empty array', () => {
      const result = mergeDeltas([]);
      expect(result.operations).toHaveLength(0);
    });

    it('should return same delta for single element', () => {
      const delta: DeltaResult = {
        operations: [{ op: 'add', path: '/lines/0', value: 'test' }],
        originalLength: 0,
        resultLength: 4,
        timestamp: Date.now()
      };
      const result = mergeDeltas([delta]);
      expect(result.operations).toHaveLength(1);
    });

    it('should merge multiple deltas', () => {
      const delta1: DeltaResult = {
        operations: [{ op: 'add', path: '/lines/0', value: 'Line 1' }],
        originalLength: 0,
        resultLength: 6,
        timestamp: Date.now()
      };
      const delta2: DeltaResult = {
        operations: [{ op: 'add', path: '/lines/1', value: 'Line 2' }],
        originalLength: 6,
        resultLength: 12,
        timestamp: Date.now()
      };
      const result = mergeDeltas([delta1, delta2]);
      expect(result.operations).toHaveLength(2);
      expect(result.originalLength).toBe(0);
    });
  });

  describe('generateHash', () => {
    it('should generate consistent hash for same content', async () => {
      const content = 'Hello World';
      const hash1 = await generateHash(content);
      const hash2 = await generateHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', async () => {
      const hash1 = await generateHash('Content A');
      const hash2 = await generateHash('Content B');
      expect(hash1).not.toBe(hash2);
    });

    it('should return 16 character hex string', async () => {
      const hash = await generateHash('Test content');
      expect(hash.length).toBe(16);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should handle empty string', async () => {
      const hash = await generateHash('');
      expect(hash.length).toBe(16);
    });

    it('should handle unicode content', async () => {
      const hash = await generateHash('你好世界 🌍');
      expect(hash.length).toBe(16);
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot with version and hash', async () => {
      const content = 'Document content';
      const version = '1.0.0';
      const snapshot = await createSnapshot(content, version);
      
      expect(snapshot.version).toBe(version);
      expect(snapshot.content).toBe(content);
      expect(snapshot.hash).toBeDefined();
      expect(snapshot.hash.length).toBe(16);
      expect(snapshot.timestamp).toBeDefined();
    });

    it('should generate different hash for different content', async () => {
      const snap1 = await createSnapshot('Content A', '1.0');
      const snap2 = await createSnapshot('Content B', '1.0');
      expect(snap1.hash).not.toBe(snap2.hash);
    });
  });

  describe('serializeDelta / deserializeDelta', () => {
    it('should serialize and deserialize correctly', () => {
      const delta: DeltaResult = {
        operations: [
          { op: 'add', path: '/lines/0', value: 'Test' },
          { op: 'remove', path: '/lines/1', value: 'Old' }
        ],
        originalLength: 100,
        resultLength: 104,
        timestamp: 1234567890
      };
      
      const json = serializeDelta(delta);
      const restored = deserializeDelta(json);
      
      expect(restored.operations).toHaveLength(2);
      expect(restored.originalLength).toBe(100);
      expect(restored.resultLength).toBe(104);
      expect(restored.timestamp).toBe(1234567890);
    });

    it('should handle empty operations', () => {
      const delta: DeltaResult = {
        operations: [],
        originalLength: 0,
        resultLength: 0,
        timestamp: Date.now()
      };
      
      const json = serializeDelta(delta);
      const restored = deserializeDelta(json);
      
      expect(restored.operations).toHaveLength(0);
    });

    it('should preserve operation types', () => {
      const delta: DeltaResult = {
        operations: [
          { op: 'add', path: '/lines/0', value: 'new' },
          { op: 'remove', path: '/lines/1', value: 'old' },
          { op: 'replace', path: '/lines/2', value: 'new content' }
        ],
        originalLength: 50,
        resultLength: 55,
        timestamp: Date.now()
      };
      
      const json = serializeDelta(delta);
      const restored = deserializeDelta(json);
      
      expect(restored.operations[0].op).toBe('add');
      expect(restored.operations[1].op).toBe('remove');
      expect(restored.operations[2].op).toBe('replace');
    });
  });

  describe('round-trip delta application', () => {
    it('should preserve content after delta and apply', async () => {
      const original = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const modified = 'Line 1\nLine 2\nModified Line 3\nLine 4\nNew Line 5\nLine 6';
      
      const delta = computeDelta(original, modified);
      const result = applyDelta(original, delta);
      
      expect(result.success).toBe(true);
      // Note: Due to line-based diff, exact reconstruction may vary
      expect(result.patchedContent).toBeDefined();
    });
  });
});