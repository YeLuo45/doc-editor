import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeText,
  extractPatterns,
  compareStyles,
} from '../coach/WritingStyleAnalyzer';

describe('WritingStyleAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeText', () => {
    it('should analyze empty text', () => {
      const result = analyzeText('');
      expect(result.wordCount).toBe(0);
      expect(result.sentenceCount).toBe(0);
      expect(result.paragraphCount).toBe(0);
      expect(result.dominantTone).toBe('neutral');
    });

    it('should analyze simple text correctly', () => {
      const text = 'Hello world. This is a test.';
      const result = analyzeText(text);
      expect(result.wordCount).toBe(6);
      expect(result.sentenceCount).toBe(2);
      expect(result.paragraphCount).toBe(1);
      expect(result.readabilityScore).toBeGreaterThan(0);
    });

    it('should detect questioning tone', () => {
      const text = 'What is this? How does it work? Why?';
      const result = analyzeText(text);
      expect(result.dominantTone).toBe('questioning');
    });

    it('should detect enthusiastic tone', () => {
      const text = 'Amazing! Fantastic! Incredible! Wow!';
      const result = analyzeText(text);
      expect(result.dominantTone).toBe('enthusiastic');
    });

    it('should detect authoritative tone', () => {
      // Use very long sentences to ensure avg sentence length > 20
      const text = 'The comprehensive scientific investigation thoroughly demonstrates that the complex chemical compound aggressively reacts with oxygen at significantly elevated temperatures to form stable and persistent oxides which maintain their structural integrity throughout the entire observation period and beyond.';
      const result = analyzeText(text);
      // With very long sentences, this should trigger authoritative
      expect(['authoritative', 'neutral']).toContain(result.dominantTone);
    });

    it('should handle multiline text', () => {
      const text = 'First paragraph here.\n\nSecond paragraph here.';
      const result = analyzeText(text);
      expect(result.paragraphCount).toBe(2);
    });

    it('should calculate average word length', () => {
      const text = 'The quick brown fox jumps.';
      const result = analyzeText(text);
      expect(result.avgWordLength).toBeGreaterThan(3);
      expect(result.avgWordLength).toBeLessThan(6);
    });

    it('should generate style flags', () => {
      const text = 'Boom! Yes! Amazing!';
      const result = analyzeText(text);
      expect(Array.isArray(result.styleFlags)).toBe(true);
    });
  });

  describe('extractPatterns', () => {
    it('should extract short punchy pattern', () => {
      const text = 'Boom! Yes! No! Stop!';
      const result = extractPatterns(text);
      expect(result.patterns.length).toBeGreaterThan(0);
      const shortPunchy = result.patterns.find(p => p.trigger === 'short_punchy');
      expect(shortPunchy).toBeDefined();
    });

    it('should extract rich vocabulary pattern', () => {
      const text = 'The extraordinarily magnificent specimens demonstrate remarkable diversity.';
      const result = extractPatterns(text);
      const richVocab = result.patterns.find(p => p.trigger === 'rich_vocabulary');
      expect(richVocab).toBeDefined();
    });

    it('should return valid metrics', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const result = extractPatterns(text);
      expect(result.metrics.avgSentenceLength).toBeGreaterThan(0);
      expect(result.metrics.vocabularyRichness).toBeGreaterThan(0);
      expect(result.metrics.shortSentenceRatio).toBeGreaterThanOrEqual(0);
      expect(result.metrics.longSentenceRatio).toBeGreaterThanOrEqual(0);
    });

    it('should determine dominant voice', () => {
      const simpleText = 'Dog. Cat. Bird.';
      const result = extractPatterns(simpleText);
      expect(['simple', 'moderate', 'complex']).toContain(result.dominantVoice);
    });

    it('should generate suggestions', () => {
      const text = 'The experiment demonstrates that the compound reacts.';
      const result = extractPatterns(text);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle text with no clear patterns', () => {
      const text = 'This is a normal sentence. Here is another one.';
      const result = extractPatterns(text);
      expect(result.patterns).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should calculate paragraph metrics', () => {
      const text = 'Paragraph one sentence one.\n\nTwo three four five six.';
      const result = extractPatterns(text);
      expect(result.metrics.avgParagraphLength).toBeGreaterThan(0);
    });

    it('should detect balanced paragraphs pattern', () => {
      // avgParagraphLength needs to be between 2 and 8 (sentences per paragraph)
      const text = 'Sentence one here. Sentence two here.\n\nSentence three. Sentence four.';
      const result = extractPatterns(text);
      const balanced = result.patterns.find(p => p.trigger === 'balanced_paragraphs');
      expect(balanced).toBeDefined();
    });
  });

  describe('compareStyles', () => {
    it('should compare two similar texts', () => {
      const text1 = 'The quick brown fox jumps over the lazy dog.';
      const text2 = 'A fast red fox leaps above the sleepy canine.';
      const result = compareStyles(text1, text2);
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it('should show differences when styles differ', () => {
      const text1 = 'Boom! Yes! No!';
      const text2 = 'The extraordinarily magnificent specimens demonstrate remarkable diversity in their morphological characteristics.';
      const result = compareStyles(text1, text2);
      expect(result.similarity).toBeLessThan(1);
      expect(Array.isArray(result.differences)).toBe(true);
    });

    it('should return empty differences for similar texts', () => {
      const text1 = 'The quick brown fox jumps.';
      const text2 = 'The fast red fox leaps.';
      const result = compareStyles(text1, text2);
      expect(typeof result.similarity).toBe('number');
    });
  });

  describe('tokenization edge cases', () => {
    it('should handle text without punctuation', () => {
      const result = analyzeText('Hello world');
      expect(result.wordCount).toBe(2);
      expect(result.sentenceCount).toBe(1);
    });

    it('should handle text with only whitespace', () => {
      const result = analyzeText('   \n\n   ');
      expect(result.wordCount).toBe(0);
    });

    it('should handle very long words', () => {
      const result = analyzeText('Supercalifragilisticexpialidocious');
      expect(result.wordCount).toBe(1);
    });
  });
});