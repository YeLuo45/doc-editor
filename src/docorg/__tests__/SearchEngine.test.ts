/**
 * SearchEngine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngineImpl } from '../SearchEngine';

describe('SearchEngine', () => {
  let engine: SearchEngineImpl;

  beforeEach(() => {
    engine = new SearchEngineImpl();
  });

  describe('indexDocument', () => {
    it('should index a document', () => {
      engine.indexDocument({
        id: 'doc1',
        title: 'Test Document',
        content: 'This is test content about JavaScript',
        type: 'code',
        tags: ['javascript', 'tutorial'],
      });

      expect(engine.getDocumentCount()).toBe(1);
    });

    it('should be retrievable via search', () => {
      engine.indexDocument({
        id: 'doc1',
        title: 'React Tutorial',
        content: 'Learn how to build React apps',
      });

      const results = engine.search({ query: 'React' });
      expect(results.results.length).toBe(1);
      expect(results.results[0].document.id).toBe('doc1');
    });
  });

  describe('removeDocument', () => {
    it('should remove document from index', () => {
      engine.indexDocument({ id: 'doc1', title: 'Test', content: 'Content' });
      engine.removeDocument('doc1');

      expect(engine.getDocumentCount()).toBe(0);
      const results = engine.search({ query: 'Test' });
      expect(results.results.length).toBe(0);
    });
  });

  describe('updateDocument', () => {
    it('should update indexed document', () => {
      engine.indexDocument({ id: 'doc1', title: 'Original', content: 'Content' });
      engine.updateDocument('doc1', { title: 'Updated' });

      const results = engine.search({ query: 'Updated' });
      expect(results.results.length).toBe(1);
      expect(results.results[0].document.title).toBe('Updated');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      engine.indexDocument({ id: 'doc1', title: 'React Tutorial', content: 'Learn React.js framework for building UIs', type: 'doc', tags: ['react', 'javascript'] });
      engine.indexDocument({ id: 'doc2', title: 'Node.js Guide', content: 'Server-side JavaScript with Node.js', type: 'code', tags: ['node', 'javascript'] });
      engine.indexDocument({ id: 'doc3', title: 'Cooking Recipe', content: 'How to bake a delicious chocolate cake', type: 'doc', tags: ['cooking', 'baking'] });
    });

    it('should find documents by title', () => {
      const results = engine.search({ query: 'React' });

      expect(results.results.length).toBeGreaterThan(0);
      expect(results.results.some(r => r.document.id === 'doc1')).toBe(true);
    });

it('should find documents by content', () => {
      const results = engine.search({ query: 'JavaScript' });

      expect(results.results.length).toBe(1);
    });

    it('should find documents by tags', () => {
      const results = engine.search({ query: 'node' });

      expect(results.results.some(r => r.document.id === 'doc2')).toBe(true);
    });

    it('should include matched terms', () => {
      const results = engine.search({ query: 'React' });

      expect(results.results[0].matchedTerms.length).toBeGreaterThan(0);
    });

    it('should include highlights', () => {
      const results = engine.search({ query: 'React' });

      expect(results.results[0].highlights.length).toBeGreaterThan(0);
    });

    it('should respect limit option', () => {
      const results = engine.search({ query: 'JavaScript', limit: 1 });

      expect(results.results.length).toBe(1);
    });

    it('should respect offset option', () => {
      const allResults = engine.search({ query: 'JavaScript', limit: 10 });
      const offsetResults = engine.search({ query: 'JavaScript', limit: 10, offset: 1 });

      expect(allResults.results.length).toBe(offsetResults.results.length + 1);
    });

    it('should sort by relevance by default', () => {
      const results = engine.search({ query: 'React' });

      expect(results.results[0].document.id).toBe('doc1');
    });

    it('should sort by date', () => {
      const results = engine.search({ query: 'JavaScript', sortBy: 'date' });

      expect(results.results.length).toBe(1);
    });

    it('should sort by title', () => {
      const results = engine.search({ query: 'JavaScript', sortBy: 'title' });

      expect(results.results[0].document.id).toBe('doc2');
    });
  });

  describe('filters', () => {
    beforeEach(() => {
      engine.indexDocument({ id: 'doc1', title: 'React Tutorial', content: 'Learn React', type: 'doc', tags: ['react'], createdAt: 1000 });
      engine.indexDocument({ id: 'doc2', title: 'Node.js Guide', content: 'Server-side JS', type: 'code', tags: ['node'], createdAt: 2000 });
      engine.indexDocument({ id: 'doc3', title: 'Vue Guide', content: 'Learn Vue', type: 'doc', tags: ['vue'], createdAt: 3000 });
    });

    it('should filter by type', () => {
      const results = engine.search({ query: 'Guide', filters: { types: ['code'] } });

      expect(results.results.length).toBe(1);
      expect(results.results[0].document.id).toBe('doc2');
    });

    it('should filter by containsTags', () => {
      const results = engine.search({ query: 'Guide', filters: { containsTags: ['react'] } });

      expect(results.results.length).toBe(0);
    });

    it('should filter by date range', () => {
      const results = engine.search({
        query: 'Guide',
        filters: { dateFrom: 1500, dateTo: 2500 }
      });

      expect(results.results.length).toBe(1);
      expect(results.results[0].document.id).toBe('doc2');
    });

it('should apply multiple filters', () => {
      const results = engine.search({
        query: 'Guide',
        filters: { types: ['doc'], containsTags: ['react'] }
      });

      expect(results.results.length).toBe(0);
    });
  });

  describe('getSuggestions', () => {
    beforeEach(() => {
      engine.indexDocument({ id: 'doc1', title: 'React Tutorial', content: 'Learn React' });
      engine.indexDocument({ id: 'doc2', title: 'Redux Guide', content: 'State management' });
      engine.indexDocument({ id: 'doc3', title: 'React Native', content: 'Mobile development' });
    });

    it('should return suggestions for prefix', () => {
      const suggestions = engine.getSuggestions('re');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('react'))).toBe(true);
    });

    it('should return empty for short prefix', () => {
      const suggestions = engine.getSuggestions('r');

      expect(suggestions).toEqual([]);
    });

    it('should respect limit', () => {
      const suggestions = engine.getSuggestions('re', 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('stats', () => {
    it('should track filters applied', () => {
      engine.indexDocument({ id: 'doc1', title: 'Test', content: 'Content' });

      const results = engine.search({
        query: 'test',
        filters: { types: ['doc'] }
      });

      expect(results.stats.filtersApplied.length).toBeGreaterThan(0);
      expect(results.stats.filtersApplied[0]).toContain('types');
    });

    it('should track query time', () => {
      engine.indexDocument({ id: 'doc1', title: 'Test', content: 'Content' });

      const results = engine.search({ query: 'test' });

      expect(results.stats.queryTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllDocuments', () => {
    it('should return all indexed documents', () => {
      engine.indexDocument({ id: 'doc1', title: 'Test 1', content: 'Content 1' });
      engine.indexDocument({ id: 'doc2', title: 'Test 2', content: 'Content 2' });

      const docs = engine.getAllDocuments();

      expect(docs.length).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all documents', () => {
      engine.indexDocument({ id: 'doc1', title: 'Test', content: 'Content' });
      engine.clear();

      expect(engine.getDocumentCount()).toBe(0);
    });
  });
});