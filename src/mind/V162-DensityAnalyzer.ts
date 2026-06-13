/**
 * V162 DensityAnalyzer - Direction A Writing Mind (Iter 8/30)
 * thunderbolt: information density per paragraph
 */
export type DensityLevel = 'sparse' | 'moderate' | 'dense' | 'overwhelming';

export interface DensityMetrics {
  ideasPerParagraph: number;
  uniqueTermsPerParagraph: number;
  redundancyRatio: number;
  infoScore: number;       // 0..1
}

export interface DensityReport {
  level: DensityLevel;
  metrics: DensityMetrics;
  paragraphScores: number[];
  suggestions: string[];
}

const FILLER_PHRASES = ['in other words', 'as a matter of fact', 'that is to say', '也就是说', '换句话说', '其实', '事实上'];

export function createDensityMetrics(): DensityMetrics {
  return { ideasPerParagraph: 0, uniqueTermsPerParagraph: 0, redundancyRatio: 0, infoScore: 0 };
}

export function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

export function countIdeas(paragraph: string): number {
  const sentences = paragraph.split(/[.!?。！？]+/).filter(s => s.trim().length > 5);
  return Math.max(1, sentences.length);
}

export function extractTerms(paragraph: string): string[] {
  return (paragraph.match(/[\u4e00-\u9fa5]{2,4}|[a-zA-Z]{3,}/g) || []);
}

export function countFiller(paragraph: string): number {
  let count = 0;
  for (const p of FILLER_PHRASES) {
    const m = paragraph.match(new RegExp(p, 'gi'));
    if (m) count += m.length;
  }
  return count;
}

export function analyzeDensity(text: string): DensityReport {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) {
    return {
      level: 'moderate',
      metrics: createDensityMetrics(),
      paragraphScores: [],
      suggestions: ['Add content to analyze'],
    };
  }
  const paragraphScores: number[] = [];
  let totalIdeas = 0, totalUnique = 0, totalRedundancy = 0;
  for (const p of paragraphs) {
    const ideas = countIdeas(p);
    const terms = extractTerms(p);
    const unique = new Set(terms.map(t => t.toLowerCase())).size;
    const filler = countFiller(p);
    const total = terms.length || 1;
    const redundancy = filler / total;
    const info = (unique / total) * (1 - redundancy);
    paragraphScores.push(info);
    totalIdeas += ideas;
    totalUnique += unique;
    totalRedundancy += redundancy;
  }
  const avgInfo = paragraphScores.reduce((s, x) => s + x, 0) / paragraphScores.length;
  const metrics: DensityMetrics = {
    ideasPerParagraph: totalIdeas / paragraphs.length,
    uniqueTermsPerParagraph: totalUnique / paragraphs.length,
    redundancyRatio: totalRedundancy / paragraphs.length,
    infoScore: avgInfo,
  };
  let level: DensityLevel = 'moderate';
  if (avgInfo < 0.2) level = 'sparse';
  else if (avgInfo < 0.5) level = 'moderate';
  else if (avgInfo < 0.75) level = 'dense';
  else level = 'overwhelming';
  const suggestions: string[] = [];
  if (metrics.redundancyRatio > 0.15) suggestions.push('Reduce filler phrases');
  if (metrics.ideasPerParagraph < 2) suggestions.push('Add more ideas per paragraph');
  if (metrics.ideasPerParagraph > 8) suggestions.push('Consider splitting dense paragraphs');
  if (level === 'overwhelming') suggestions.push('Paragraphs may be too information-dense');
  return { level, metrics, paragraphScores, suggestions };
}

export function getDensityReport(text: string): DensityReport {
  return analyzeDensity(text);
}

export function resetDensityAnalyzer(): DensityMetrics {
  return createDensityMetrics();
}
