/**
 * DocumentGraph Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentGraphImpl } from '../DocumentGraph';

describe('DocumentGraph', () => {
  let graph: DocumentGraphImpl;

  beforeEach(() => {
    graph = new DocumentGraphImpl();
  });

  describe('addDocument', () => {
    it('should add a document as a node', () => {
      graph.addDocument({ id: 'doc1', title: 'Test Doc', content: 'Content here' });

      expect(graph.nodes.size).toBe(1);
      expect(graph.nodes.get('doc1')).toBeDefined();
      expect(graph.nodes.get('doc1')?.title).toBe('Test Doc');
    });

    it('should initialize empty edges array', () => {
      graph.addDocument({ id: 'doc1', title: 'Test', content: 'Content' });

      expect(graph.edges.get('doc1')).toEqual([]);
    });

    it('should set createdAt and updatedAt', () => {
      const before = Date.now();
      graph.addDocument({ id: 'doc1', title: 'Test', content: 'Content' });
      const after = Date.now();

      const node = graph.nodes.get('doc1');
      expect(node?.createdAt).toBeGreaterThanOrEqual(before);
      expect(node?.createdAt).toBeLessThanOrEqual(after);
      expect(node?.updatedAt).toBeGreaterThanOrEqual(before);
      expect(node?.updatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('removeDocument', () => {
    it('should remove document and its edges', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addReference('doc1', 'doc2');

      graph.removeDocument('doc1');

      expect(graph.nodes.has('doc1')).toBe(false);
      expect(graph.nodes.has('doc2')).toBe(true);
      expect(graph.edges.has('doc1')).toBe(false);
      expect(graph.edges.get('doc2')).toEqual([]);
    });
  });

  describe('updateDocument', () => {
    it('should update document properties', () => {
      graph.addDocument({ id: 'doc1', title: 'Original', content: 'Content' });
      graph.updateDocument('doc1', { title: 'Updated', tags: ['tag1'] });

      const node = graph.nodes.get('doc1');
      expect(node?.title).toBe('Updated');
      expect(node?.tags).toEqual(['tag1']);
      expect(node?.content).toBe('Content');
    });

    it('should update updatedAt timestamp', () => {
      graph.addDocument({ id: 'doc1', title: 'Test', content: 'Content' });
      const originalUpdatedAt = graph.nodes.get('doc1')!.updatedAt;

      // Force different timestamp by using Date.now + 1
      graph.updateDocument('doc1', { title: 'Updated', updatedAt: originalUpdatedAt + 1 });

      expect(graph.nodes.get('doc1')!.updatedAt).toBeGreaterThan(originalUpdatedAt);
    });

    it('should not update non-existent document', () => {
      graph.updateDocument('nonexistent', { title: 'Test' });
      expect(graph.nodes.size).toBe(0);
    });
  });

  describe('addReference', () => {
    it('should add reference edge between documents', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      const result = graph.addReference('doc1', 'doc2', 0.8);

      expect(result).toBe(true);
      const edges = graph.edges.get('doc1');
      expect(edges?.length).toBe(1);
      expect(edges?.[0].target).toBe('doc2');
      expect(edges?.[0].weight).toBe(0.8);
      expect(edges?.[0].type).toBe('reference');
    });

    it('should update weight for existing reference', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addReference('doc1', 'doc2', 0.5);
      graph.addReference('doc1', 'doc2', 0.9);

      const edges = graph.edges.get('doc1');
      expect(edges?.length).toBe(1);
      expect(edges?.[0].weight).toBe(0.9);
    });

    it('should fail for non-existent documents', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      const result = graph.addReference('doc1', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('buildSimilarityEdges', () => {
    it('should create similarity edges for similar documents', () => {
      graph.addDocument({ id: 'doc1', title: 'React Tutorial', content: 'Learn React with this tutorial. React is a JavaScript library.' });
      graph.addDocument({ id: 'doc2', title: 'Vue Guide', content: 'Learn Vue with this guide. Vue is a JavaScript framework.' });

      graph.buildSimilarityEdges();

      const edges = graph.edges.get('doc1');
      const hasSimilarity = edges?.some(e => e.target === 'doc2' && e.type === 'similarity');
      expect(hasSimilarity).toBe(true);
    });

    it('should not create edges for dissimilar documents', () => {
      graph.addDocument({ id: 'doc1', title: 'Code', content: 'function test() { return 1; }' });
      graph.addDocument({ id: 'doc2', title: 'Recipe', content: 'Mix flour and sugar. Bake at 350 degrees.' });

      graph.buildSimilarityEdges();

      const edges = graph.edges.get('doc1');
      const hasSimilarity = edges?.some(e => e.target === 'doc2' && e.type === 'similarity');
      expect(hasSimilarity).toBe(false);
    });
  });

  describe('getRelated', () => {
    it('should return related documents sorted by weight', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addDocument({ id: 'doc3', title: 'Test 3', content: 'Content 3' });
      graph.addReference('doc1', 'doc2', 0.5);
      graph.addReference('doc1', 'doc3', 0.8);

      const related = graph.getRelated('doc1');

      expect(related.length).toBe(2);
      expect(related[0].target).toBe('doc3');
      expect(related[1].target).toBe('doc2');
    });

    it('should filter by minimum weight', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addReference('doc1', 'doc2', 0.3);

      const related = graph.getRelated('doc1', 0.5);

      expect(related.length).toBe(0);
    });

    it('should return empty array for non-existent document', () => {
      const related = graph.getRelated('nonexistent');
      expect(related).toEqual([]);
    });
  });

  describe('findPath', () => {
    it('should find direct path', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addReference('doc1', 'doc2');

      const path = graph.findPath('doc1', 'doc2');

      expect(path).toEqual(['doc1', 'doc2']);
    });

    it('should find indirect path', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addDocument({ id: 'doc3', title: 'Test 3', content: 'Content 3' });
      graph.addReference('doc1', 'doc2');
      graph.addReference('doc2', 'doc3');

      const path = graph.findPath('doc1', 'doc3');

      expect(path).toEqual(['doc1', 'doc2', 'doc3']);
    });

    it('should return null for no path', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });

      const path = graph.findPath('doc1', 'doc2');

      expect(path).toBeNull();
    });

    it('should return null for non-existent documents', () => {
      const path = graph.findPath('nonexistent1', 'nonexistent2');
      expect(path).toBeNull();
    });

    it('should return same document for same start and end', () => {
      graph.addDocument({ id: 'doc1', title: 'Test', content: 'Content' });
      const path = graph.findPath('doc1', 'doc1');
      expect(path).toEqual(['doc1']);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addDocument({ id: 'doc3', title: 'Test 3', content: 'Content 3' });
      graph.addReference('doc1', 'doc2');
      graph.addReference('doc1', 'doc3');

      const stats = graph.getStats();

      expect(stats.totalNodes).toBe(3);
      expect(stats.totalEdges).toBe(3);
      expect(stats.averageConnections).toBeGreaterThan(0);
    });
  });

  describe('export/import', () => {
    it('should export and import graph', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1', tags: ['tag1'] });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addReference('doc1', 'doc2', 0.7);

      const exported = graph.export();

      const newGraph = new DocumentGraphImpl();
      newGraph.import(exported);

      expect(newGraph.nodes.size).toBe(2);
      expect(newGraph.edges.get('doc1')?.length).toBe(1);
      expect(newGraph.edges.get('doc1')?.[0].weight).toBe(0.7);
    });
  });

  describe('clear', () => {
    it('should clear all nodes and edges', () => {
      graph.addDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      graph.addDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });
      graph.addReference('doc1', 'doc2');

      graph.clear();

      expect(graph.nodes.size).toBe(0);
      expect(graph.edges.size).toBe(0);
    });
  });
});