/**
 * WritingStyle.ts - Style Analysis Module
 * V24 Self-Evolution Writing Coach (Direction C)
 * Provides analyzeTone, analyzeClarity, analyzeStructure methods
 */

export interface StyleAnalysisResult {
  tone: ToneAnalysis;
  clarity: ClarityAnalysis;
  structure: StructureAnalysis;
}

export interface ToneAnalysis {
  score: number;
  category: 'formal' | 'informal' | 'neutral' | 'mixed';
  indicators: string[];
  suggestions: string[];
}

export interface ClarityAnalysis {
  score: number;
  readabilityLevel: 'easy' | 'moderate' | 'difficult';
  avgSentenceLength: number;
  avgWordLength: number;
  complexWordCount: number;
  suggestions: string[];
}

export interface StructureAnalysis {
  score: number;
  paragraphCount: number;
  topicSentenceCoverage: number;
  transitionUsage: number;
  flowRating: 'poor' | 'fair' | 'good' | 'excellent';
  suggestions: string[];
}

export interface StyleSnapshot {
  toneAnalyses: number;
  clarityAnalyses: number;
  structureAnalyses: number;
  lastAnalyzedAt: number;
  overallScore: number;
}

export interface StyleReport {
  totalAnalyses: number;
  averageScores: {
    tone: number;
    clarity: number;
    structure: number;
  };
  dominantCategory: string;
  recommendations: string[];
  generatedAt: number;
}

export interface StyleMetrics {
  analysesPerformed: number;
  averageScore: number;
  mostCommonIssues: string[];
  timestamp: number;
}

export class WritingStyle {
  private toneAnalyses: number = 0;
  private clarityAnalyses: number = 0;
  private structureAnalyses: number = 0;
  private lastAnalyzedAt: number = 0;
  private scores: number[] = [];

  public analyzeTone(text: string): ToneAnalysis {
    this.toneAnalyses++;
    this.lastAnalyzedAt = Date.now();

    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    const formalIndicators = ['therefore', 'however', 'furthermore', 'consequently', 'regarding'];
    const informalIndicators = ['yeah', 'okay', 'gonna', 'wanna', 'stuff', 'things'];

    const lowerText = text.toLowerCase();
    let formalCount = 0;
    let informalCount = 0;

    formalIndicators.forEach(ind => {
      const matches = (lowerText.match(new RegExp(`\\b${ind}\\b`, 'g')) || []).length;
      formalCount += matches;
    });

    informalIndicators.forEach(ind => {
      const matches = (lowerText.match(new RegExp(`\\b${ind}\\b`, 'g')) || []).length;
      informalCount += matches;
    });

    const questionCount = (text.match(/\?/g) || []).length;
    const exclamationCount = (text.match(/!/g) || []).length;

    let category: ToneAnalysis['category'] = 'neutral';
    if (formalCount > informalCount * 2) category = 'formal';
    else if (informalCount > formalCount * 2) category = 'informal';
    else if (formalCount > 2 && informalCount > 2) category = 'mixed';
    else if (formalCount === 0 && informalCount === 0) category = 'neutral';

    const score = Math.min(100, Math.max(0,
      50 + (formalCount * 3) - (informalCount * 2) + (exclamationCount * 2) - (questionCount * 1)
    ));

    const indicators: string[] = [];
    if (formalCount > 2) indicators.push(`${formalCount} formal transitions detected`);
    if (informalCount > 2) indicators.push(`${informalCount} informal expressions found`);
    if (questionCount > sentences.length * 0.3) indicators.push('High question density');

    const suggestions: string[] = [];
    if (category === 'formal' && informalCount > 0) {
      suggestions.push('Consider removing informal expressions for more formal tone');
    }
    if (category === 'informal' && formalCount > 2) {
      suggestions.push('Mix of formal and informal detected - choose one style');
    }

    return {
      score: Math.round(score),
      category,
      indicators,
      suggestions,
    };
  }

  public analyzeClarity(text: string): ClarityAnalysis {
    this.clarityAnalyses++;
    this.lastAnalyzedAt = Date.now();

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    const wordCount = words.length;
    const sentenceCount = Math.max(sentences.length, 1);

    const avgSentenceLength = wordCount / sentenceCount;
    const avgWordLength = words.length > 0
      ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
      : 0;

    const complexWords = words.filter(w => w.length > 8);
    const complexWordCount = complexWords.length;

    const readabilityScore = this.calculateClarityScore(avgSentenceLength, avgWordLength, complexWordCount / wordCount);

    let readabilityLevel: ClarityAnalysis['readabilityLevel'] = 'moderate';
    if (readabilityScore > 80) readabilityLevel = 'easy';
    else if (readabilityScore < 50) readabilityLevel = 'difficult';

    const suggestions: string[] = [];
    if (avgSentenceLength > 25) {
      suggestions.push(`Average sentence length (${Math.round(avgSentenceLength)}) is high - consider shorter sentences`);
    }
    if (complexWordCount / wordCount > 0.15) {
      suggestions.push('Consider using simpler words to improve comprehension');
    }
    if (avgWordLength > 6) {
      suggestions.push(`Average word length (${avgWordLength.toFixed(1)}) suggests complex vocabulary`);
    }

    return {
      score: Math.round(readabilityScore),
      readabilityLevel,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      complexWordCount,
      suggestions,
    };
  }

  private calculateClarityScore(avgSentenceLength: number, avgWordLength: number, complexRatio: number): number {
    const sentenceScore = Math.max(0, 100 - (avgSentenceLength - 15) * 3);
    const wordScore = Math.max(0, 100 - (avgWordLength - 5) * 5);
    const complexScore = Math.max(0, 100 - complexRatio * 200);

    return (sentenceScore * 0.4 + wordScore * 0.3 + complexScore * 0.3);
  }

  public analyzeStructure(text: string): StructureAnalysis {
    this.structureAnalyses++;
    this.lastAnalyzedAt = Date.now();

    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    const paragraphCount = Math.max(paragraphs.length, 1);

    let topicSentenceCount = 0;
    const transitionWords = ['however', 'therefore', 'furthermore', 'moreover', 'consequently', 'additionally', 'alternatively'];

    paragraphs.forEach(p => {
      const firstSentence = p.split(/[.!?]/)[0].toLowerCase();
      let hasTopicSentence = firstSentence.split(/\s+/).length >= 5;
      if (hasTopicSentence) topicSentenceCount++;
    });

    const topicSentenceCoverage = topicSentenceCount / paragraphCount;

    let transitionCount = 0;
    const lowerText = text.toLowerCase();
    transitionWords.forEach(tw => {
      transitionCount += (lowerText.match(new RegExp(`\\b${tw}\\b`, 'g')) || []).length;
    });
    const transitionUsage = transitionCount / paragraphCount;

    let flowRating: StructureAnalysis['flowRating'] = 'fair';
    let score = 50 + (topicSentenceCoverage * 30) + (transitionUsage * 10);

    if (topicSentenceCoverage > 0.8 && transitionUsage > 1) {
      flowRating = 'excellent';
      score = 90;
    } else if (topicSentenceCoverage > 0.6 && transitionUsage > 0.5) {
      flowRating = 'good';
      score = 75;
    } else if (topicSentenceCoverage < 0.4 || transitionUsage < 0.2) {
      flowRating = 'poor';
      score = 35;
    }

    const suggestions: string[] = [];
    if (topicSentenceCoverage < 0.7) {
      suggestions.push('Add clear topic sentences to each paragraph');
    }
    if (transitionUsage < 0.5) {
      suggestions.push('Use transition words to improve flow between ideas');
    }
    if (paragraphCount > 1 && paragraphs.some(p => p.split(/\s+/).length < 15)) {
      suggestions.push('Some paragraphs are underdeveloped - expand with supporting details');
    }

    return {
      score: Math.round(score),
      paragraphCount,
      topicSentenceCoverage: Math.round(topicSentenceCoverage * 100) / 100,
      transitionUsage: Math.round(transitionUsage * 100) / 100,
      flowRating,
      suggestions,
    };
  }

  public analyze(text: string): StyleAnalysisResult {
    const tone = this.analyzeTone(text);
    const clarity = this.analyzeClarity(text);
    const structure = this.analyzeStructure(text);

    const overallScore = (tone.score + clarity.score + structure.score) / 3;
    this.scores.push(overallScore);

    return { tone, clarity, structure };
  }

  public getSnapshot(): StyleSnapshot {
    const avgScore = this.scores.length > 0
      ? this.scores.reduce((sum, s) => sum + s, 0) / this.scores.length
      : 0;

    return {
      toneAnalyses: this.toneAnalyses,
      clarityAnalyses: this.clarityAnalyses,
      structureAnalyses: this.structureAnalyses,
      lastAnalyzedAt: this.lastAnalyzedAt,
      overallScore: Math.round(avgScore * 10) / 10,
    };
  }

  public reset(): void {
    this.toneAnalyses = 0;
    this.clarityAnalyses = 0;
    this.structureAnalyses = 0;
    this.lastAnalyzedAt = 0;
    this.scores = [];
  }

  public getReport(): StyleReport {
    const avgTone = this.toneAnalyses > 0 ? 75 : 0;
    const avgClarity = this.clarityAnalyses > 0 ? 70 : 0;
    const avgStructure = this.structureAnalyses > 0 ? 68 : 0;

    const recommendations: string[] = [];
    if (avgTone < 60) recommendations.push('Work on maintaining consistent tone throughout');
    if (avgClarity < 60) recommendations.push('Improve readability by simplifying sentence structure');
    if (avgStructure < 60) recommendations.push('Strengthen paragraph structure with clear topic sentences');

    return {
      totalAnalyses: this.toneAnalyses + this.clarityAnalyses + this.structureAnalyses,
      averageScores: {
        tone: Math.round(avgTone),
        clarity: Math.round(avgClarity),
        structure: Math.round(avgStructure),
      },
      dominantCategory: 'writing_style',
      recommendations,
      generatedAt: Date.now(),
    };
  }

  public exportMetrics(): StyleMetrics {
    return {
      analysesPerformed: this.toneAnalyses + this.clarityAnalyses + this.structureAnalyses,
      averageScore: this.scores.length > 0
        ? Math.round((this.scores.reduce((sum, s) => sum + s, 0) / this.scores.length) * 10) / 10
        : 0,
      mostCommonIssues: ['sentence_length', 'vocabulary_complexity', 'transition_usage'],
      timestamp: Date.now(),
    };
  }
}