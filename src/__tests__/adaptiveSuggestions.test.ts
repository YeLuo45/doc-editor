import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSuggestions,
  filterSuggestions,
  getSuggestionsForContext,
  applySuggestion,
  getSuggestionStats,
  type Suggestion,
  type SuggestionContext,
} from '../coach/AdaptiveSuggestions';
import { saveSkills, clearAllSkills } from '../coach/StyleCrystallizer';
import { crystallizeFromPatterns } from '../coach/StyleCrystallizer';
import type { WritingPattern } from '../coach/types';

describe('AdaptiveSuggestions', () => {
  beforeEach(() => {
    clearAllSkills();
    vi.clearAllMocks();
  });

  const testPatterns: WritingPattern[] = [
    {
      type: 'sentence_structure',
      trigger: 'short_punchy',
      description: 'Short punchy sentences',
      examples: ['Boom!', 'Yes!', 'No!'],
      priority: 1,
    },
    {
      type: 'paragraph_structure',
      trigger: 'balanced_paragraphs',
      description: 'Balanced paragraphs',
      examples: [],
      priority: 3,
    },
  ];

    // test context reserved for future use
  void testPatterns;

  describe('generateSuggestions', () => {
    it('should generate phrase suggestions', () => {
      const context: SuggestionContext = {
        currentText: 'in order to succeed',
        cursorPosition: 20,
        recentPatterns: [],
        activeSkills: [],
      };
      const suggestions = generateSuggestions(context);
      expect(suggestions.some(s => s.type === 'phrase')).toBe(true);
    });

    it('should generate vocabulary suggestions', () => {
      const context: SuggestionContext = {
        currentText: 'The good good dog',
        cursorPosition: 15,
        recentPatterns: [],
        activeSkills: [],
      };
      const suggestions = generateSuggestions(context);
      expect(suggestions.some(s => s.type === 'vocabulary')).toBe(true);
    });

    it('should generate structure suggestions for active skills', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const context: SuggestionContext = {
        currentText: 'The quick brown fox jumps.',
        cursorPosition: 10,
        recentPatterns: testPatterns,
        activeSkills: skills,
      };
      const suggestions = generateSuggestions(context);
      expect(suggestions.some(s => s.type === 'structure')).toBe(true);
    });

    it('should generate flow suggestions for repeated sentence starts', () => {
      const context: SuggestionContext = {
        currentText: 'The quick brown fox. The quick red fox. The quick blue fox.',
        cursorPosition: 40,
        recentPatterns: [],
        activeSkills: [],
      };
      const suggestions = generateSuggestions(context);
      expect(suggestions.some(s => s.type === 'flow')).toBe(true);
    });

    it('should handle empty text', () => {
      const context: SuggestionContext = {
        currentText: '',
        cursorPosition: 0,
        recentPatterns: [],
        activeSkills: [],
      };
      const suggestions = generateSuggestions(context);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should generate tone suggestions with analysis', () => {
      const context: SuggestionContext = {
        currentText: 'The text is here. The text is here.',
        cursorPosition: 20,
        recentPatterns: [],
        activeSkills: [],
      };
      const analysis = { dominantTone: 'neutral' as const, readabilityScore: 40 };
      const suggestions = generateSuggestions(context, analysis);
      expect(suggestions.some(s => s.type === 'tone')).toBe(true);
    });
  });

  describe('filterSuggestions', () => {
    const mockSuggestions: Suggestion[] = [
      { id: '1', type: 'phrase', text: 'test', reason: 'r', confidence: 0.9, priority: 1 },
      { id: '2', type: 'structure', text: 'test', reason: 'r', confidence: 0.7, priority: 2 },
      { id: '3', type: 'vocabulary', text: 'test', reason: 'r', confidence: 0.5, priority: 3 },
      { id: '4', type: 'flow', text: 'test', reason: 'r', confidence: 0.6, priority: 4 },
    ];

    it('should filter by minimum confidence', () => {
      const filtered = filterSuggestions(mockSuggestions, { minConfidence: 0.85 });
      expect(filtered.length).toBe(1);
      expect(filtered[0].confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should filter by types', () => {
      const filtered = filterSuggestions(mockSuggestions, { types: ['phrase', 'structure'] });
      expect(filtered.length).toBe(2);
      expect(filtered.every(s => ['phrase', 'structure'].includes(s.type))).toBe(true);
    });

    it('should limit results', () => {
      const filtered = filterSuggestions(mockSuggestions, { maxResults: 2 });
      expect(filtered.length).toBe(2);
    });

    it('should sort by priority then confidence', () => {
      const filtered = filterSuggestions(mockSuggestions, { maxResults: 1 });
      expect(filtered[0].priority).toBe(1);
    });

    it('should combine all filters', () => {
      const filtered = filterSuggestions(mockSuggestions, {
        minConfidence: 0.5,
        types: ['phrase', 'structure', 'vocabulary'],
        maxResults: 2,
      });
      expect(filtered.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getSuggestionsForContext', () => {
    it('should return suggestions for given context', () => {
      const suggestions = getSuggestionsForContext('The quick brown fox', 10);
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should respect max results limit', () => {
      const suggestions = getSuggestionsForContext('in order to succeed and due to the fact that', 50);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should handle analysis parameter', () => {
      const suggestions = getSuggestionsForContext(
        'The text is here.',
        10,
        { dominantTone: 'neutral', readabilityScore: 60 }
      );
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('applySuggestion', () => {
    it('should apply suggestion with replacement range', () => {
      const suggestion: Suggestion = {
        id: 'test',
        type: 'phrase',
        text: 'to',
        reason: 'concise',
        confidence: 0.8,
        priority: 1,
        replaces: { start: 0, end: 9 },
      };
      const result = applySuggestion('in order to', suggestion, 9);
      // "in order " (9 chars) is replaced with "to", result is "to" + "to" = "toto"
      expect(result.newText).toBe('toto');
    });

    it('should handle structure suggestions without replacement', () => {
      const suggestion: Suggestion = {
        id: 'test',
        type: 'structure',
        text: 'Consider using shorter sentences',
        reason: 'rhythm',
        confidence: 0.7,
        priority: 2,
      };
      const result = applySuggestion('Hello world test text', suggestion, 10);
      expect(result.newText).toBe('Hello world test text');
    });

    it('should handle vocabulary suggestions at middle of text', () => {
      const suggestion: Suggestion = {
        id: 'test',
        type: 'vocabulary',
        text: ' effective',
        reason: 'replacing',
        confidence: 0.8,
        priority: 1,
      };
      const result = applySuggestion('A good choice made', suggestion, 2);
      expect(result.newText).toContain('effective');
    });
  });

  describe('getSuggestionStats', () => {
    it('should return correct stats for suggestions', () => {
      const suggestions: Suggestion[] = [
        { id: '1', type: 'phrase', text: 't', reason: 'r', confidence: 0.9, priority: 1 },
        { id: '2', type: 'phrase', text: 't', reason: 'r', confidence: 0.8, priority: 3 },
        { id: '3', type: 'structure', text: 't', reason: 'r', confidence: 0.7, priority: 1 },
      ];
      const stats = getSuggestionStats(suggestions);
      expect(stats.byType.phrase).toBe(2);
      expect(stats.byType.structure).toBe(1);
      expect(stats.avgConfidence).toBeGreaterThan(0.7);
      expect(stats.highPriority).toBe(2); // priority <= 2
    });

    it('should handle empty suggestions', () => {
      const stats = getSuggestionStats([]);
      expect(stats.byType.phrase).toBe(0);
      expect(stats.avgConfidence).toBe(0);
      expect(stats.highPriority).toBe(0);
    });
  });

  describe('redundancy detection suggestions', () => {
    it('should detect "in order to" pattern', () => {
      const context: SuggestionContext = {
        currentText: 'We need to act in order to succeed.',
        cursorPosition: 30,
        recentPatterns: [],
        activeSkills: [],
      };
      const suggestions = generateSuggestions(context);
      const phraseSuggs = suggestions.filter(s => s.type === 'phrase');
      expect(phraseSuggs.length).toBeGreaterThan(0);
    });

    it('should detect repeated words in flow', () => {
      const context: SuggestionContext = {
        currentText: 'The fox runs. The fox jumps. The fox plays.',
        cursorPosition: 35,
        recentPatterns: [],
        activeSkills: [],
      };
      const suggestions = generateSuggestions(context);
      expect(suggestions.some(s => s.type === 'flow')).toBe(true);
    });
  });
});