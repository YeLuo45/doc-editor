/**
 * TagExtractor Tests
 */

import { describe, it, expect } from 'vitest';
import { extractTags, extractTopics, extractEntities, generateSummary, extractFromDocument } from '../TagExtractor';

describe('TagExtractor', () => {
  describe('extractTags', () => {
    it('should extract keywords as tags', () => {
      const content = 'JavaScript is a programming language. JavaScript is used for web development. JavaScript has many frameworks.';
      const tags = extractTags(content, { maxTags: 5 });

      expect(tags.length).toBeGreaterThan(0);
      expect(tags.length).toBeLessThanOrEqual(5);
      expect(tags[0].term).toBe('javascript');
    });

    it('should include frequency and relevance scores', () => {
      const content = 'React is a library for building user interfaces. React is popular.';
      const tags = extractTags(content);

      for (const tag of tags) {
        expect(tag).toHaveProperty('term');
        expect(tag).toHaveProperty('frequency');
        expect(tag).toHaveProperty('relevance');
        expect(tag.frequency).toBeGreaterThan(0);
        expect(tag.relevance).toBeGreaterThan(0);
      }
    });

    it('should filter by minimum frequency', () => {
      const content = 'word1 word2 word3 word1 word2 word3 word1 word2 word3 word1 word2 word3 word1 word2 word3 word1';
      const tags = extractTags(content, { minTagFrequency: 0.6 });

      // All words have same frequency, so filter applies
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const tags = extractTags('');
      expect(tags).toEqual([]);
    });

    it('should remove stop words', () => {
      const content = 'the a an and or but in on at to for of with by from is are was were';
      const tags = extractTags(content, { maxTags: 20 });

      expect(tags.length).toBe(0);
    });
  });

  describe('extractTopics', () => {
    it('should identify programming topic', () => {
      const content = 'I wrote a function in Python that processes data. The algorithm uses variables and methods.';
      const topics = extractTopics(content);

      expect(topics).toContain('programming');
    });

    it('should identify web topic', () => {
      const content = 'The HTTP server handles API requests and responses. The URL endpoint is defined.';
      const topics = extractTopics(content);

      expect(topics).toContain('web');
    });

    it('should return empty array for no matches', () => {
      const content = 'Hello world this is just some random text with no specific topic.';
      const topics = extractTopics(content);

      expect(topics.length).toBe(0);
    });

    it('should respect maxTags option', () => {
      const content = 'I wrote a function in Python that uses JavaScript to build a web API server with database queries.';
      const topics = extractTopics(content, { maxTags: 2 });

      expect(topics.length).toBeLessThanOrEqual(2);
    });
  });

  describe('extractEntities', () => {
    it('should extract URLs', () => {
      const content = 'Check out https://example.com and http://test.org for more info.';
      const entities = extractEntities(content);

      expect(entities.some(e => e.includes('https://example.com'))).toBe(true);
    });

    it('should extract dates', () => {
      const content = 'The event was scheduled for 2024-01-15 and completed on 2024-01-20.';
      const entities = extractEntities(content);

      expect(entities.some(e => e.includes('2024-01-15'))).toBe(true);
    });

    it('should extract mentions', () => {
      const content = 'Thanks @john and @jane for the help!';
      const entities = extractEntities(content);

      expect(entities).toContain('@john');
      expect(entities).toContain('@jane');
    });

    it('should extract hashtags', () => {
      const content = 'The project uses #JavaScript and #TypeScript.';
      const entities = extractEntities(content);

      expect(entities).toContain('#JavaScript');
      expect(entities).toContain('#TypeScript');
    });
  });

  describe('generateSummary', () => {
    it('should truncate long content', () => {
      const content = 'This is a short sentence. Here is another one. And yet another sentence that goes on for quite a while and contains many words.';
      const summary = generateSummary(content, 50);

      expect(summary.length).toBeLessThanOrEqual(53); // 50 + '...'
    });

    it('should use first sentence for short content', () => {
      const content = 'Short content. Second sentence.';
      const summary = generateSummary(content, 100);

      expect(summary).toContain('Short content');
    });

    it('should handle single short sentence', () => {
      const content = 'Very short.';
      const summary = generateSummary(content, 50);

      expect(summary).toBe('Very short.');
    });

    it('should handle empty content', () => {
      const content = '';
      const summary = generateSummary(content);

      expect(summary).toBe('');
    });
  });

  describe('extractFromDocument', () => {
    it('should extract all components', () => {
      const content = 'React is a JavaScript library for building user interfaces. It was developed by Facebook.';
      const result = extractFromDocument(content);

      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('topics');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.tags)).toBe(true);
      expect(Array.isArray(result.topics)).toBe(true);
      expect(Array.isArray(result.entities)).toBe(true);
      expect(typeof result.summary).toBe('string');
    });

    it('should respect options', () => {
      const content = 'JavaScript function and code development with algorithms and data structures.';
      const result = extractFromDocument(content, { maxTags: 3, extractEntities: false });

      expect(result.tags.length).toBeLessThanOrEqual(3);
      // topics may have multiple matches, just check it's an array
      expect(Array.isArray(result.topics)).toBe(true);
    });

    it('should disable entities when option is false', () => {
      const content = 'Check https://example.com for more info @user';
      const result = extractFromDocument(content, { extractEntities: false });

      expect(result.entities).toEqual([]);
    });
  });
});