/**
 * V158 PacingAnalyzer - Direction A Writing Mind (Iter 4/30)
 * thunderbolt: paragraph rhythm and pacing analysis
 */
export type PaceLevel = 'rushed' | 'fast' | 'moderate' | 'slow' | 'glacial';

export interface PaceMetrics {
  avgSentenceLength: number;
  lengthVariance: number;
  shortSentenceRatio: number;
  longSentenceRatio: number;
  paragraphDensity: number;
}

export interface PaceAnalysis {
  level: PaceLevel;
  metrics: PaceMetrics;
  score: number;     // 0..1, higher = more engaging
  suggestions: string[];
}

export function createPaceAnalyzer(): PaceMetrics {
  return { avgSentenceLength: 0, lengthVariance: 0, shortSentenceRatio: 0, longSentenceRatio: 0, paragraphDensity: 0 };
}

export function splitSentences(text: string): string[] {
  return text.split(/[.!?。！？]+/).map(s => s.trim()).filter(s => s.length > 0);
}

export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

export function analyzePacing(text: string): PaceAnalysis {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return {
      level: 'moderate',
      metrics: createPaceAnalyzer(),
      score: 0,
      suggestions: ['Add more content to analyze'],
    };
  }
  const lengths = sentences.map(s => s.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((s, l) => s + Math.pow(l - avg, 2), 0) / lengths.length;
  const shortCount = lengths.filter(l => l < 30).length;
  const longCount = lengths.filter(l => l > 120).length;
  const paragraphs = splitParagraphs(text);
  const density = paragraphs.length > 0 ? sentences.length / paragraphs.length : 0;
  const shortRatio = shortCount / sentences.length;
  const longRatio = longCount / sentences.length;
  const varianceScore = Math.min(1, Math.sqrt(variance) / 30);
  const ratioScore = 1 - Math.abs(shortRatio - 0.3) - Math.abs(longRatio - 0.1);
  const score = Math.max(0, Math.min(1, varianceScore * 0.6 + ratioScore * 0.4));
  let level: PaceLevel = 'moderate';
  if (avg < 30) level = 'rushed';
  else if (avg < 50) level = 'fast';
  else if (avg < 90) level = 'moderate';
  else if (avg < 150) level = 'slow';
  else level = 'glacial';
  const suggestions: string[] = [];
  if (variance < 100) suggestions.push('Try varying sentence length for better rhythm');
  if (shortRatio < 0.1) suggestions.push('Add some punchy short sentences');
  if (longRatio > 0.5) suggestions.push('Break up long sentences');
  if (density > 10) suggestions.push('Consider splitting dense paragraphs');
  return {
    level,
    metrics: {
      avgSentenceLength: avg,
      lengthVariance: variance,
      shortSentenceRatio: shortRatio,
      longSentenceRatio: longRatio,
      paragraphDensity: density,
    },
    score,
    suggestions,
  };
}

export function getPaceLevel(avgLength: number): PaceLevel {
  if (avgLength < 30) return 'rushed';
  if (avgLength < 50) return 'fast';
  if (avgLength < 90) return 'moderate';
  if (avgLength < 150) return 'slow';
  return 'glacial';
}

export function getPacingReport(text: string): PaceAnalysis {
  return analyzePacing(text);
}

export function resetPaceAnalyzer(): PaceMetrics {
  return createPaceAnalyzer();
}
