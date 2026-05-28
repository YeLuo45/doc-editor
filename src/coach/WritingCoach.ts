/**
 * WritingCoach.ts - Main Writing Coach Module
 * V24 Self-Evolution Writing Coach (Direction C)
 * Provides analyze, improve, and getSuggestions methods
 */

import type { TextAnalysis, WritingPattern } from './types';

export interface CoachSuggestion {
  id: string;
  type: 'clarity' | 'tone' | 'structure' | 'vocabulary';
  original: string;
  suggestion: string;
  reason: string;
  priority: number;
}

export interface CoachSnapshot {
  analysisCount: number;
  lastAnalyzedAt: number;
  suggestionsGenerated: number;
  improvementsApplied: number;
  sessionId: string;
}

export interface CoachReport {
  totalAnalyses: number;
  totalSuggestions: number;
  averagePriority: number;
  topCategories: string[];
  generatedAt: number;
}

export interface CoachMetrics {
  analysesPerformed: number;
  suggestionsGenerated: number;
  improvementsApplied: number;
  sessionDuration: number;
  timestamp: number;
}

export class WritingCoach {
  private analysisCount: number = 0;
  private suggestionsGenerated: number = 0;
  private improvementsApplied: number = 0;
  private sessionStart: number = Date.now();
  private sessionId: string = this.generateSessionId();
  private patterns: WritingPattern[] = [];
  private lastAnalyzedAt: number = 0;

  constructor() {
    this.initializePatterns();
  }

  private generateSessionId(): string {
    return `coach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePatterns(): void {
    this.patterns = [
      {
        type: 'sentence_structure',
        trigger: 'very_long_sentence',
        description: 'Sentences over 30 words may lose clarity',
        examples: ['Consider breaking into shorter segments'],
        priority: 7,
      },
      {
        type: 'tone',
        trigger: 'inconsistent_tone',
        description: 'Tone shifts within paragraph',
        examples: ['Maintain consistent tone throughout'],
        priority: 8,
      },
      {
        type: 'vocabulary',
        trigger: 'repetitive_words',
        description: 'Word repetition detected',
        examples: ['Use synonyms to vary language'],
        priority: 6,
      },
      {
        type: 'paragraph_structure',
        trigger: 'missing_topic_sentence',
        description: 'Paragraph may lack clear topic sentence',
        examples: ['Add a clear topic sentence'],
        priority: 5,
      },
    ];
  }

  public analyze(text: string): TextAnalysis {
    this.analysisCount++;
    this.lastAnalyzedAt = Date.now();

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = Math.max(sentences.length, 1);
    const paragraphCount = Math.max(paragraphs.length, 1);

    const avgWordLength = wordCount > 0
      ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
      : 0;

    const readabilityScore = this.calculateReadability(wordCount, sentenceCount, paragraphCount);
    const dominantTone = this.detectDominantTone(text);
    const styleFlags = this.detectStyleFlags(text, words);

    return {
      text,
      wordCount,
      sentenceCount,
      paragraphCount,
      avgWordLength,
      readabilityScore,
      dominantTone,
      styleFlags,
    };
  }

  private calculateReadability(words: number, sentences: number, paragraphs: number): number {
    const avgSentenceLength = sentences > 0 ? words / sentences : 0;
    const score = Math.max(0, Math.min(100, 100 - (avgSentenceLength - 15) * 2));
    return Math.round(score * 10) / 10;
  }

  private detectDominantTone(text: string): TextAnalysis['dominantTone'] {
    const lower = text.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const questionWords = (lower.match(/\b(what|why|how|when|where|who)\b/g) || []).length;
    const exclamations = (text.match(/!/g) || []).length;
    const authoritativeWords = (lower.match(/\b(must|should|will|definitely|clearly)\b/g) || []).length;

    if (questionWords > sentences.length * 0.3) return 'questioning';
    if (exclamations > 2) return 'enthusiastic';
    if (authoritativeWords > 3) return 'authoritative';
    return 'neutral';
  }

  private detectStyleFlags(text: string, words: string[]): string[] {
    const flags: string[] = [];
    const sentences = text.split(/[.!?]+/);

    sentences.forEach((sentence, i) => {
      const sentenceWords = sentence.trim().split(/\s+/);
      if (sentenceWords.length > 30) flags.push(`very_long_sentence_${i + 1}`);
    });

    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      const lower = w.toLowerCase();
      wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    });

    Object.entries(wordFreq).forEach(([word, count]) => {
      if (count > 3 && word.length > 4) {
        flags.push(`repetitive_word_${word}`);
      }
    });

    return flags;
  }

  public improve(text: string, suggestionId?: string): string {
    this.improvementsApplied++;
    let result = text;

    const sentences = result.split(/([.!?]+\s*)/);
    const improvedSentences = sentences.map((segment, i) => {
      if (segment.trim().length > 0 && segment.split(/\s+/).length > 30) {
        const midPoint = Math.floor(segment.length / 2);
        const commaPositions = [
          segment.lastIndexOf(',', midPoint),
          segment.lastIndexOf(';', midPoint),
        ].filter(p => p > 0);

        if (commaPositions.length > 0) {
          const splitPoint = Math.max(...commaPositions);
          return segment.substring(0, splitPoint + 1) + '\n' + segment.substring(splitPoint + 1).trim();
        }
      }
      return segment;
    });

    return improvedSentences.join('').replace(/\n+/g, '\n').trim();
  }

  public getSuggestions(text: string): CoachSuggestion[] {
    this.suggestionsGenerated++;
    const suggestions: CoachSuggestion[] = [];
    const analysis = this.analyze(text);

    if (analysis.readabilityScore < 70) {
      suggestions.push({
        id: `clarity-${Date.now()}-1`,
        type: 'clarity',
        original: 'Complex sentence structure',
        suggestion: 'Break long sentences into shorter ones for better readability',
        reason: `Readability score is ${analysis.readabilityScore}%`,
        priority: 9 - Math.floor(analysis.readabilityScore / 15),
      });
    }

    if (analysis.dominantTone === 'neutral') {
      suggestions.push({
        id: `tone-${Date.now()}-2`,
        type: 'tone',
        original: 'Monotone writing detected',
        suggestion: 'Vary sentence length and add engaging elements',
        reason: 'Writing lacks tonal variation',
        priority: 6,
      });
    }

    if (analysis.paragraphCount > 1) {
      const paragraphs = text.split(/\n\n+/);
      paragraphs.forEach((p, i) => {
        if (p.split(/\s+/).length < 20 && i < paragraphs.length - 1) {
          suggestions.push({
            id: `structure-${Date.now()}-${i + 3}`,
            type: 'structure',
            original: `Paragraph ${i + 1} is very short`,
            suggestion: `Expand paragraph ${i + 1} with more supporting details`,
            reason: 'Paragraphs should have adequate development',
            priority: 5,
          });
        }
      });
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  public getSnapshot(): CoachSnapshot {
    return {
      analysisCount: this.analysisCount,
      lastAnalyzedAt: this.lastAnalyzedAt,
      suggestionsGenerated: this.suggestionsGenerated,
      improvementsApplied: this.improvementsApplied,
      sessionId: this.sessionId,
    };
  }

  public reset(): void {
    this.analysisCount = 0;
    this.suggestionsGenerated = 0;
    this.improvementsApplied = 0;
    this.sessionStart = Date.now();
    this.sessionId = this.generateSessionId();
    this.lastAnalyzedAt = 0;
  }

  public getReport(): CoachReport {
    const suggestions = this.getSuggestions('');
    const categoryCount: Record<string, number> = {};

    suggestions.forEach(s => {
      categoryCount[s.type] = (categoryCount[s.type] || 0) + 1;
    });

    return {
      totalAnalyses: this.analysisCount,
      totalSuggestions: this.suggestionsGenerated,
      averagePriority: suggestions.length > 0
        ? suggestions.reduce((sum, s) => sum + s.priority, 0) / suggestions.length
        : 0,
      topCategories: Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat),
      generatedAt: Date.now(),
    };
  }

  public exportMetrics(): CoachMetrics {
    return {
      analysesPerformed: this.analysisCount,
      suggestionsGenerated: this.suggestionsGenerated,
      improvementsApplied: this.improvementsApplied,
      sessionDuration: Date.now() - this.sessionStart,
      timestamp: Date.now(),
    };
  }
}