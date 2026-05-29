/**
 * V61 Search Index Engine - Test Suite
 * Tests for SearchIndex, InvertedIndex, Tokenizer, QueryEngine
 */

import { SearchIndex } from '../search-index/SearchIndex';
import { InvertedIndex } from '../search-index/InvertedIndex';
import { Tokenizer } from '../search-index/Tokenizer';
import { QueryEngine } from '../search-index/QueryEngine';

describe('SearchIndex', () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex({ caseSensitive: false, minWordLength: 2 });
  });

  afterEach(() => {
    index.reset();
  });

  test('should index a document', () => {
    index.index('doc1', 'Hello world test document');
    expect(index.getIndexedCount()).toBe(1);
  });

  test('should add and retrieve document', () => {
    index.add('doc1', 'Test content for search');
    const results = index.search('test');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].docId).toBe('doc1');
  });

  test('should remove document', () => {
    index.add('doc1', 'Test content');
    expect(index.remove('doc1')).toBe(true);
    expect(index.getIndexedCount()).toBe(0);
  });

  test('should return false when removing non-existent doc', () => {
    expect(index.remove('nonexistent')).toBe(false);
  });

  test('should search multiple documents', () => {
    index.add('doc1', 'JavaScript programming');
    index.add('doc2', 'TypeScript design patterns');
    index.add('doc3', 'Python machine learning');
    const results = index.search('programming');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('should handle empty query', () => {
    index.add('doc1', 'Test content');
    const results = index.search('');
    expect(results).toEqual([]);
  });

  test('should get snapshot metrics', () => {
    index.add('doc1', 'Test content');
    const snapshot = index.getSnapshot();
    expect(snapshot.metrics.documentCount).toBe(1);
  });

  test('should reset index', () => {
    index.add('doc1', 'Test content');
    index.reset();
    expect(index.getIndexedCount()).toBe(0);
  });

  test('should generate report', () => {
    const report = index.getReport();
    expect(report).toContain('SearchIndex Report');
  });

  test('should export metrics with version', () => {
    const metrics = index.exportMetrics();
    expect(metrics.version).toBe('V61-SearchIndex');
  });
});

describe('InvertedIndex', () => {
  let invertedIndex: InvertedIndex;

  beforeEach(() => {
    invertedIndex = new InvertedIndex({ caseSensitive: false });
  });

  afterEach(() => {
    invertedIndex.reset();
  });

  test('should build index from documents', () => {
    const docs = new Map<string, string>([
      ['doc1', 'Hello world'],
      ['doc2', 'Hello there'],
    ]);
    invertedIndex.build(docs);
    expect(invertedIndex.getTotalTerms()).toBeGreaterThan(0);
  });

  test('should insert term posting', () => {
    invertedIndex.insert('test', 'doc1', [0, 5]);
    const postings = invertedIndex.getPostings('test');
    expect(postings.length).toBe(1);
    expect(postings[0].docId).toBe('doc1');
  });

  test('should lookup term', () => {
    invertedIndex.insert('search', 'doc1', [0]);
    const docIds = invertedIndex.lookup('search');
    expect(docIds).toContain('doc1');
  });

  test('should return empty array for unknown term', () => {
    const docIds = invertedIndex.lookup('unknown');
    expect(docIds).toEqual([]);
  });

  test('should get document frequency', () => {
    invertedIndex.insert('test', 'doc1', [0]);
    invertedIndex.insert('test', 'doc2', [0]);
    expect(invertedIndex.getDocumentFrequency('test')).toBe(2);
  });

  test('should get total postings', () => {
    invertedIndex.insert('a', 'doc1', [0]);
    invertedIndex.insert('b', 'doc1', [0]);
    expect(invertedIndex.getTotalPostings()).toBe(2);
  });

  test('should get snapshot', () => {
    const snapshot = invertedIndex.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset index', () => {
    invertedIndex.insert('test', 'doc1', [0]);
    invertedIndex.reset();
    expect(invertedIndex.getTotalTerms()).toBe(0);
  });

  test('should generate report', () => {
    const report = invertedIndex.getReport();
    expect(report).toContain('InvertedIndex Report');
  });

  test('should export metrics with version', () => {
    const metrics = invertedIndex.exportMetrics();
    expect(metrics.version).toBe('V61-InvertedIndex');
  });
});

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer({ caseSensitive: false, removeStopWords: true });
  });

  afterEach(() => {
    tokenizer.reset();
  });

  test('should tokenize text', () => {
    const tokens = tokenizer.tokenize('Hello world test document');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).toContain('hello');
  });

  test('should normalize tokens', () => {
    const normalized = tokenizer.normalize('  TEST  ');
    expect(normalized).toBe('test');
  });

  test('should stem tokens', () => {
    const stemmed = tokenizer.stem('running');
    expect(stemmed).toBe('run');
  });

  test('should get stop words', () => {
    const stopWords = tokenizer.getStopWords();
    expect(stopWords).toContain('the');
    expect(stopWords.length).toBeGreaterThan(40);
  });

  test('should filter stop words', () => {
    const tokens = tokenizer.tokenize('the quick brown fox');
    expect(tokens).not.toContain('the');
  });

  test('should check if token is stop word', () => {
    expect(tokenizer.isStopWord('the')).toBe(true);
    expect(tokenizer.isStopWord('test')).toBe(false);
  });

  test('should get token count', () => {
    const count = tokenizer.getTokenCount('one two three four five');
    expect(count).toBe(5);
  });

  test('should get unique tokens', () => {
    const tokens = tokenizer.getUniqueTokens('test document test content');
    expect(tokens).toContain('test');
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  test('should get snapshot', () => {
    const snapshot = tokenizer.getSnapshot();
    expect(snapshot.metrics.stopWordCount).toBeGreaterThan(0);
  });

  test('should generate report', () => {
    const report = tokenizer.getReport();
    expect(report).toContain('Tokenizer Report');
  });

  test('should export metrics with version', () => {
    const metrics = tokenizer.exportMetrics();
    expect(metrics.version).toBe('V61-Tokenizer');
  });
});

describe('QueryEngine', () => {
  let tokenizer: Tokenizer;
  let invertedIndex: InvertedIndex;
  let queryEngine: QueryEngine;

  beforeEach(() => {
    tokenizer = new Tokenizer();
    invertedIndex = new InvertedIndex();
    queryEngine = new QueryEngine(tokenizer, invertedIndex);
  });

  afterEach(() => {
    queryEngine.reset();
  });

  test('should parse simple term query', () => {
    const tree = queryEngine.parse('test');
    expect(tree.type).toBe('term');
  });

  test('should parse AND query', () => {
    const tree = queryEngine.parse('term1 AND term2');
    expect(tree.type).toBe('and');
  });

  test('should parse OR query', () => {
    const tree = queryEngine.parse('term1 OR term2');
    expect(tree.type).toBe('or');
  });

  test('should execute simple query', () => {
    invertedIndex.insert('test', 'doc1', [0]);
    const result = queryEngine.execute('test');
    expect(result.docIds).toContain('doc1');
  });

  test('should execute AND query', () => {
    invertedIndex.insert('hello', 'doc1', [0]);
    invertedIndex.insert('world', 'doc1', [1]);
    const result = queryEngine.execute('hello AND world');
    expect(result.docIds).toContain('doc1');
  });

  test('should execute OR query', () => {
    invertedIndex.insert('hello', 'doc1', [0]);
    invertedIndex.insert('world', 'doc2', [0]);
    const result = queryEngine.execute('hello OR world');
    expect(result.docIds.length).toBe(2);
  });

  test('should get results with max limit', () => {
    for (let i = 0; i < 150; i++) {
      invertedIndex.insert('test', `doc${i}`, [0]);
    }
    const results = queryEngine.getResults('test');
    expect(results.length).toBeLessThanOrEqual(100);
  });

  test('should get snapshot', () => {
    const snapshot = queryEngine.getSnapshot();
    expect(snapshot.metrics.defaultOperator).toBe('OR');
  });

  test('should generate report', () => {
    const report = queryEngine.getReport();
    expect(report).toContain('QueryEngine Report');
  });

  test('should export metrics with version', () => {
    const metrics = queryEngine.exportMetrics();
    expect(metrics.version).toBe('V61-QueryEngine');
  });
});