/**
 * Text Analysis Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import { wordCount, hasCodePatterns, hasConfigPatterns, extractKeywords, textSimilarity, truncateText } from '../utils/textAnalysis';

describe('Text Analysis Utilities', () => {
  describe('wordCount', () => {
    it('should count words correctly', () => {
      expect(wordCount('Hello world')).toBe(2);
      expect(wordCount('One two three four five')).toBe(5);
    });

    it('should handle empty string', () => {
      expect(wordCount('')).toBe(0);
    });

    it('should handle multiple spaces', () => {
      expect(wordCount('Hello   world')).toBe(2);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(wordCount('  Hello world  ')).toBe(2);
    });
  });

  describe('hasCodePatterns', () => {
    it('should detect function declarations', () => {
      expect(hasCodePatterns('function hello() { return 1; }')).toBe(true);
    });

    it('should detect const declarations', () => {
      expect(hasCodePatterns('const x = 5;')).toBe(true);
    });

    it('should detect let declarations', () => {
      expect(hasCodePatterns('let y = 10;')).toBe(true);
    });

    it('should detect class declarations', () => {
      expect(hasCodePatterns('class MyClass { }')).toBe(true);
    });

    it('should detect import statements', () => {
      expect(hasCodePatterns("import React from 'react';")).toBe(true);
    });

    it('should detect export statements', () => {
      expect(hasCodePatterns('export default App;')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasCodePatterns('This is just a normal sentence.')).toBe(false);
    });
  });

  describe('hasConfigPatterns', () => {
    it('should detect key-value patterns', () => {
      expect(hasConfigPatterns('"name": "value"')).toBe(true);
    });

    it('should detect array patterns', () => {
      expect(hasConfigPatterns('["item1", "item2"]')).toBe(true);
    });

    it('should detect boolean/null values', () => {
      expect(hasConfigPatterns('true, false, null')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasConfigPatterns('This is not a config.')).toBe(false);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'JavaScript is a programming language used for web development JavaScript';
      const keywords = extractKeywords(text, 3, 10);

      expect(keywords).toContain('javascript');
      expect(keywords).toContain('programming');
      expect(keywords).toContain('language');
      expect(keywords).toContain('development');
    });

    it('should filter by minimum length', () => {
      const keywords = extractKeywords('a ab abc abcd', 3, 10);

      expect(keywords).toContain('abc');
      expect(keywords).toContain('abcd');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('ab');
    });

    it('should respect maxCount', () => {
      const keywords = extractKeywords('word1 word2 word3 word4 word5 word6 word7 word8', 3, 3);

      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    it('should remove duplicates', () => {
      const keywords = extractKeywords('test test test test', 3, 10);

      expect(keywords.filter(k => k === 'test').length).toBe(1);
    });
  });

  describe('textSimilarity', () => {
    it('should return 1 for identical texts', () => {
      expect(textSimilarity('hello world', 'hello world')).toBe(1);
    });

    it('should return high similarity for similar texts', () => {
      const sim = textSimilarity('JavaScript is great', 'JavaScript is awesome');
      expect(sim).toBeGreaterThan(0.3);
    });

    it('should return low similarity for different texts', () => {
      const sim = textSimilarity('hello world', 'goodbye moon');
      expect(sim).toBeLessThan(0.2);
    });

    it('should return 0 for empty texts', () => {
      expect(textSimilarity('', 'hello')).toBe(0);
      expect(textSimilarity('hello', '')).toBe(0);
      expect(textSimilarity('', '')).toBe(0);
    });

    it('should be case insensitive', () => {
      const sim = textSimilarity('HELLO WORLD', 'hello world');
      expect(sim).toBe(1);
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate long text with suffix', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should use custom suffix', () => {
      expect(truncateText('Hello World', 8, '>>>')).toBe('Hello>>>');
    });

    it('should handle exact length', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });
  });
});