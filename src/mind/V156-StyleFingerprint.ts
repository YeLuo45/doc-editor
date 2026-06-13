/**
 * V156 StyleFingerprint - Direction A Writing Mind (Iter 2/30)
 * thunderbolt: feedback loop on user's unique writing style
 */
export type StyleDimension = 'concise' | 'descriptive' | 'technical' | 'narrative' | 'conversational' | 'academic';

export interface StyleMetrics {
  avgSentenceLength: number;
  vocabDiversity: number;     // unique/total
  avgParagraphLength: number;
  passiveVoiceRatio: number;
  questionRatio: number;
  exclamationRatio: number;
}

export interface StyleFingerprint {
  id: string;
  primary: StyleDimension;
  secondary: StyleDimension;
  metrics: StyleMetrics;
  sampleSize: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export function createStyleFingerprint(id: string = 'default'): StyleFingerprint {
  const now = Date.now();
  return {
    id,
    primary: 'concise',
    secondary: 'conversational',
    metrics: {
      avgSentenceLength: 0,
      vocabDiversity: 0,
      avgParagraphLength: 0,
      passiveVoiceRatio: 0,
      questionRatio: 0,
      exclamationRatio: 0,
    },
    sampleSize: 0,
    confidence: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function analyzeText(text: string): StyleMetrics {
  if (!text) {
    return { avgSentenceLength: 0, vocabDiversity: 0, avgParagraphLength: 0, passiveVoiceRatio: 0, questionRatio: 0, exclamationRatio: 0 };
  }
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const words = text.toLowerCase().match(/[\u4e00-\u9fa5]+|[a-z]+/g) || [];
  const uniqueWords = new Set(words);
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const vocabDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
  const avgParagraphLength = paragraphs.length > 0 ? words.length / paragraphs.length : 0;
  const passiveMarkers = (text.match(/(被|由|受)\s*[\u4e00-\u9fa5a-z]+|\b(was|were|been|being)\b\s+\w+ed/gi) || []).length;
  const passiveVoiceRatio = sentences.length > 0 ? passiveMarkers / sentences.length : 0;
  const questions = (text.match(/[?？]/g) || []).length;
  const exclamations = (text.match(/[!！]/g) || []).length;
  return {
    avgSentenceLength,
    vocabDiversity,
    avgParagraphLength,
    passiveVoiceRatio,
    questionRatio: sentences.length > 0 ? questions / sentences.length : 0,
    exclamationRatio: sentences.length > 0 ? exclamations / sentences.length : 0,
  };
}

export function updateFingerprint(fp: StyleFingerprint, text: string): StyleFingerprint {
  const m = analyzeText(text);
  const sampleSize = fp.sampleSize + m.avgSentenceLength;
  const weight = Math.min(m.avgSentenceLength / (sampleSize || 1), 1);
  const merged: StyleMetrics = {
    avgSentenceLength: fp.metrics.avgSentenceLength * (1 - weight) + m.avgSentenceLength * weight,
    vocabDiversity: fp.metrics.vocabDiversity * (1 - weight) + m.vocabDiversity * weight,
    avgParagraphLength: fp.metrics.avgParagraphLength * (1 - weight) + m.avgParagraphLength * weight,
    passiveVoiceRatio: fp.metrics.passiveVoiceRatio * (1 - weight) + m.passiveVoiceRatio * weight,
    questionRatio: fp.metrics.questionRatio * (1 - weight) + m.questionRatio * weight,
    exclamationRatio: fp.metrics.exclamationRatio * (1 - weight) + m.exclamationRatio * weight,
  };
  const dims: Array<[StyleDimension, number]> = [
    ['concise', merged.avgSentenceLength < 12 ? 1 : 0],
    ['descriptive', merged.avgSentenceLength >= 20 ? 1 : 0],
    ['technical', merged.vocabDiversity > 0.6 ? 1 : 0],
    ['narrative', merged.avgParagraphLength > 50 ? 1 : 0],
    ['conversational', merged.questionRatio + merged.exclamationRatio > 0.05 ? 1 : 0],
    ['academic', merged.passiveVoiceRatio > 0.1 ? 1 : 0],
  ];
  dims.sort((a, b) => b[1] - a[1]);
  const confidence = Math.min(1, sampleSize / 1000);
  return {
    ...fp,
    metrics: merged,
    primary: dims[0][0],
    secondary: dims[1]?.[0] || dims[0][0],
    sampleSize,
    confidence,
    updatedAt: Date.now(),
  };
}

export function getStyleFingerprint(fp: StyleFingerprint): StyleFingerprint {
  return { ...fp, metrics: { ...fp.metrics } };
}

export function resetFingerprint(id: string = 'default'): StyleFingerprint {
  return createStyleFingerprint(id);
}
