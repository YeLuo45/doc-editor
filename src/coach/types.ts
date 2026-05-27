/**
 * Types for Writing Coach modules
 * Part of Self-Evolution Writing Coach (Direction C)
 */

export interface WritingPattern {
  type: 'sentence_structure' | 'paragraph_structure' | 'vocabulary' | 'tone';
  trigger: string;
  description: string;
  examples: string[];
  priority: number;
}

export interface SentenceMetrics {
  wordCount: number;
  charCount: number;
  punctuationCount: number;
  questionCount: number;
  exclamationCount: number;
  isQuestion: boolean;
  isExclamation: boolean;
  isFragment: boolean;
  isVeryLong: boolean;
}

export interface TextAnalysis {
  text: string;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordLength: number;
  readabilityScore: number;
  dominantTone: 'neutral' | 'questioning' | 'enthusiastic' | 'authoritative';
  styleFlags: string[];
}

export interface L3Skill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  pattern: WritingPattern;
  examples: string[];
  createdAt: number;
  usageCount: number;
  effectiveness: number;
}