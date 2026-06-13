/**
 * V161 ReadabilityStream - Direction A Writing Mind (Iter 7/30)
 * thunderbolt: real-time readability score
 */
export type ReadabilityLevel = 'elementary' | 'middle' | 'high_school' | 'college' | 'graduate' | 'expert';

export interface ReadabilityMetrics {
  fleschKincaid: number;       // grade level
  smog: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  complexWordRatio: number;
}

export interface ReadabilitySnapshot {
  metrics: ReadabilityMetrics;
  level: ReadabilityLevel;
  score: number;       // 0..100, higher = easier
  suggestions: string[];
}

function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function isComplexWord(word: string): boolean {
  return countSyllables(word) >= 3;
}

export function createReadabilityMetrics(): ReadabilityMetrics {
  return { fleschKincaid: 0, smog: 0, avgWordsPerSentence: 0, avgSyllablesPerWord: 0, complexWordRatio: 0 };
}

export function tokenizeWords(text: string): string[] {
  return (text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || []);
}

export function splitSentences(text: string): string[] {
  return text.split(/[.!?。！？]+/).map(s => s.trim()).filter(s => s.length > 0);
}

export function calculateReadability(text: string): ReadabilitySnapshot {
  if (!text || text.length === 0) {
    return {
      metrics: createReadabilityMetrics(),
      level: 'middle',
      score: 0,
      suggestions: ['Add text to analyze'],
    };
  }
  const sentences = splitSentences(text);
  const words = tokenizeWords(text);
  if (sentences.length === 0 || words.length === 0) {
    return {
      metrics: createReadabilityMetrics(),
      level: 'middle',
      score: 0,
      suggestions: ['Add more text'],
    };
  }
  const totalSyllables = words.reduce((s, w) => s + countSyllables(w), 0);
  const complexWords = words.filter(isComplexWord).length;
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;
  const complexWordRatio = complexWords / words.length;
  const fleschKincaid = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  const smog = 1.0430 * Math.sqrt(complexWords * (30 / sentences.length)) + 3.1291;
  const score = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord));
  let level: ReadabilityLevel = 'middle';
  if (fleschKincaid < 5) level = 'elementary';
  else if (fleschKincaid < 8) level = 'middle';
  else if (fleschKincaid < 12) level = 'high_school';
  else if (fleschKincaid < 16) level = 'college';
  else if (fleschKincaid < 20) level = 'graduate';
  else level = 'expert';
  const suggestions: string[] = [];
  if (avgWordsPerSentence > 25) suggestions.push('Try shorter sentences');
  if (complexWordRatio > 0.3) suggestions.push('Use simpler words');
  if (fleschKincaid > 16) suggestions.push('Reduce academic jargon');
  return {
    metrics: { fleschKincaid, smog, avgWordsPerSentence, avgSyllablesPerWord, complexWordRatio },
    level,
    score,
    suggestions,
  };
}

export function getReadabilityLevel(gradeLevel: number): ReadabilityLevel {
  if (gradeLevel < 5) return 'elementary';
  if (gradeLevel < 8) return 'middle';
  if (gradeLevel < 12) return 'high_school';
  if (gradeLevel < 16) return 'college';
  if (gradeLevel < 20) return 'graduate';
  return 'expert';
}

export function getReadabilityReport(text: string): ReadabilitySnapshot {
  return calculateReadability(text);
}

export function resetReadability(): ReadabilityMetrics {
  return createReadabilityMetrics();
}
