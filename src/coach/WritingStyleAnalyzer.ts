/**
 * WritingStyleAnalyzer - Analyzes user's writing habits and extracts patterns
 * Part of Self-Evolution Writing Coach (Direction C)
 */
import type { WritingPattern, SentenceMetrics, TextAnalysis } from './types';

const SENTENCE_MIN_WORDS = 3;
const SENTENCE_MAX_WORDS = 40;

export interface StyleMetrics {
  avgSentenceLength: number;
  avgParagraphLength: number;
  sentenceLengthVariance: number;
  vocabularyRichness: number;
  shortSentenceRatio: number;
  longSentenceRatio: number;
  punctuationDensity: number;
  paragraphStartVariety: number;
}

export interface PatternExtractionResult {
  patterns: WritingPattern[];
  metrics: StyleMetrics;
  dominantVoice: 'simple' | 'moderate' | 'complex';
  suggestions: string[];
}

function tokenizeSentences(text: string): string[] {
  return text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function tokenizeWords(text: string): string[] {
  return text.toLowerCase().match(/\b[a-z']+\b/g) || [];
}

function getSentenceWords(sentence: string): string[] {
  return sentence.match(/\b\w+\b/g) || [];
}

function calculateSentenceMetrics(sentences: string[]): SentenceMetrics[] {
  return sentences.map(sentence => {
    const words = getSentenceWords(sentence);
    const wordCount = words.length;
    const charCount = sentence.length;
    const punctuationCount = (sentence.match(/[,;:!?.-]/g) || []).length;
    const questionCount = (sentence.match(/\?/g) || []).length;
    const exclamationCount = (sentence.match(/!/g) || []).length;

    return {
      wordCount,
      charCount,
      punctuationCount,
      questionCount,
      exclamationCount,
      isQuestion: questionCount > 0,
      isExclamation: exclamationCount > 0,
      isFragment: wordCount < SENTENCE_MIN_WORDS,
      isVeryLong: wordCount > SENTENCE_MAX_WORDS,
    };
  });
}

function calculateStyleMetrics(sentenceMetrics: SentenceMetrics[], paragraphs: string[]): StyleMetrics {
  const sentenceLengths = sentenceMetrics.map(m => m.wordCount);
  const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / Math.max(sentenceLengths.length, 1);

  const sentenceLengthVariance = sentenceLengths.length > 0
    ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length
    : 0;

  const avgParagraphLength = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length
    : 0;

  const shortCount = sentenceLengths.filter(l => l <= 10).length;
  const longCount = sentenceLengths.filter(l => l >= 25).length;
  const shortSentenceRatio = sentenceLengths.length > 0 ? shortCount / sentenceLengths.length : 0;
  const longSentenceRatio = sentenceLengths.length > 0 ? longCount / sentenceLengths.length : 0;

  const totalPunctuation = sentenceMetrics.reduce((sum, m) => sum + m.punctuationCount, 0);
  const totalChars = sentenceMetrics.reduce((sum, m) => sum + m.charCount, 0);
  const punctuationDensity = totalChars > 0 ? totalPunctuation / totalChars : 0;

  const paragraphStartWords = paragraphs.map(p => getSentenceWords(p[0] || '')[0] || '');
  const uniqueStartWords = new Set(paragraphStartWords.filter(w => w.length > 0));
  const paragraphStartVariety = paragraphStartWords.length > 0
    ? uniqueStartWords.size / paragraphStartWords.length
    : 0;

  // Calculate vocabulary richness (unique words / total words)
  const allTextWords = tokenizeWords(paragraphs.flat().join(' '));
  const uniqueWordCount = new Set(allTextWords).size;
  const vocabularyRichness = allTextWords.length > 0 ? uniqueWordCount / allTextWords.length : 0;

  return {
    avgSentenceLength,
    avgParagraphLength,
    sentenceLengthVariance,
    vocabularyRichness,
    shortSentenceRatio,
    longSentenceRatio,
    punctuationDensity,
    paragraphStartVariety,
  };
}

function detectPatterns(text: string, metrics: StyleMetrics): WritingPattern[] {
  const patterns: WritingPattern[] = [];
  const sentences = tokenizeSentences(text);

  // Pattern: Short punchy sentences
  if (metrics.shortSentenceRatio > 0.4) {
    patterns.push({
      type: 'sentence_structure',
      trigger: 'short_punchy',
      description: '使用短句营造节奏感',
      examples: sentences.filter(s => getSentenceWords(s).length <= 10).slice(0, 3),
      priority: 1,
    });
  }

  // Pattern: Long descriptive sentences
  if (metrics.longSentenceRatio > 0.2) {
    patterns.push({
      type: 'sentence_structure',
      trigger: 'descriptive_flow',
      description: '使用复合句增强描述深度',
      examples: sentences.filter(s => getSentenceWords(s).length >= 25).slice(0, 3),
      priority: 2,
    });
  }

  // Pattern: Consistent paragraph length
  if (metrics.avgParagraphLength >= 2 && metrics.avgParagraphLength <= 8) {
    patterns.push({
      type: 'paragraph_structure',
      trigger: 'balanced_paragraphs',
      description: '段落长度均衡，保持阅读节奏',
      examples: [],
      priority: 3,
    });
  }

  // Pattern: Vocabulary variety
  if (metrics.vocabularyRichness > 0.6) {
    patterns.push({
      type: 'vocabulary',
      trigger: 'rich_vocabulary',
      description: '词汇丰富，表达多样',
      examples: [],
      priority: 2,
    });
  }

  // Pattern: Varied paragraph openings
  if (metrics.paragraphStartVariety > 0.7) {
    patterns.push({
      type: 'paragraph_structure',
      trigger: 'varied_openings',
      description: '段落开头多样化，避免单调',
      examples: [],
      priority: 3,
    });
  }

  return patterns;
}

function determineDominantVoice(metrics: StyleMetrics): 'simple' | 'moderate' | 'complex' {
  const score = metrics.avgSentenceLength / 15 + metrics.vocabularyRichness * 2 + (1 - metrics.shortSentenceRatio);

  if (score < 1.2) return 'simple';
  if (score < 2.0) return 'moderate';
  return 'complex';
}

function generateSuggestions(metrics: StyleMetrics, patterns: WritingPattern[]): string[] {
  const suggestions: string[] = [];

  if (metrics.shortSentenceRatio < 0.2) {
    suggestions.push('尝试使用更短的句子增强节奏感');
  }

  if (metrics.longSentenceRatio > 0.3) {
    suggestions.push('长句较多，考虑拆分以提高可读性');
  }

  if (metrics.vocabularyRichness < 0.4) {
    suggestions.push('增加词汇多样性，使用同义词替换重复词');
  }

  if (metrics.paragraphStartVariety < 0.5) {
    suggestions.push('段落开头尝试不同方式，避免模式化');
  }

  if (metrics.avgSentenceLength > 25) {
    suggestions.push('平均句子长度较长，考虑精简');
  }

  if (metrics.punctuationDensity < 0.05) {
    suggestions.push('适当增加标点符号，调节阅读节奏');
  }

  if (patterns.length === 0) {
    suggestions.push('继续写作，系统将学习您的风格');
  }

  return suggestions;
}

export function analyzeText(text: string): TextAnalysis {
  if (!text.trim()) {
    return {
      text,
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      avgWordLength: 0,
      readabilityScore: 0,
      dominantTone: 'neutral',
      styleFlags: [],
    };
  }

  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const sentences = tokenizeSentences(text);
  const words = tokenizeWords(text);
  const sentenceMetrics = calculateSentenceMetrics(sentences);
  const metrics = calculateStyleMetrics(sentenceMetrics, paragraphs);

  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;
  const avgWordLength = wordCount > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
    : 0;

  // Calculate readability score (simplified Flesch-inspired)
  const readabilityScore = Math.max(0, Math.min(100,
    206.835 - 1.015 * (wordCount / Math.max(sentenceCount, 1)) - 84.6 * (avgWordLength / Math.max(1, wordCount / Math.max(sentenceCount, 1)))
  ));

  const patterns = detectPatterns(text, metrics);

  // Determine dominant tone based on punctuation and sentence length
  const questionCount = sentenceMetrics.filter(m => m.isQuestion).length;
  const exclamationCount = sentenceMetrics.filter(m => m.isExclamation).length;
  let dominantTone: 'neutral' | 'questioning' | 'enthusiastic' | 'authoritative' = 'neutral';
  if (questionCount / Math.max(sentenceCount, 1) > 0.3) dominantTone = 'questioning';
  else if (exclamationCount / Math.max(sentenceCount, 1) > 0.2) dominantTone = 'enthusiastic';
  else if (metrics.avgSentenceLength > 20 || wordCount / Math.max(sentenceCount, 1) > 20) dominantTone = 'authoritative';

  const styleFlags = patterns.map(p => p.trigger);

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

export function extractPatterns(text: string): PatternExtractionResult {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const sentences = tokenizeSentences(text);
  const sentenceMetrics = calculateSentenceMetrics(sentences);
  const metrics = calculateStyleMetrics(sentenceMetrics, paragraphs);
  const patterns = detectPatterns(text, metrics);
  const dominantVoice = determineDominantVoice(metrics);
  const suggestions = generateSuggestions(metrics, patterns);

  return {
    patterns,
    metrics,
    dominantVoice,
    suggestions,
  };
}

export function compareStyles(text1: string, text2: string): {
  similarity: number;
  differences: string[];
} {
  const analysis1 = extractPatterns(text1);
  const analysis2 = extractPatterns(text2);

  const metricKeys = Object.keys(analysis1.metrics) as (keyof StyleMetrics)[];
  let totalDiff = 0;

  for (const key of metricKeys) {
    const val1 = analysis1.metrics[key];
    const val2 = analysis2.metrics[key];
    const maxVal = Math.max(Math.abs(val1), Math.abs(val2), 1);
    totalDiff += Math.abs(val1 - val2) / maxVal;
  }

  const similarity = Math.max(0, 1 - totalDiff / metricKeys.length);

  const differences: string[] = [];
  if (Math.abs(analysis1.metrics.avgSentenceLength - analysis2.metrics.avgSentenceLength) > 5) {
    differences.push(`平均句子长度差异: ${analysis1.metrics.avgSentenceLength.toFixed(1)} vs ${analysis2.metrics.avgSentenceLength.toFixed(1)}`);
  }
  if (analysis1.dominantVoice !== analysis2.dominantVoice) {
    differences.push(`文风复杂度差异: ${analysis1.dominantVoice} vs ${analysis2.dominantVoice}`);
  }

  return { similarity, differences };
}