/**
 * Text Analysis Utilities for Document Organization
 */

/**
 * Count words in text
 */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check if content contains code-like patterns
 */
export function hasCodePatterns(content: string): boolean {
  const codePatterns = [
    /\bfunction\s+\w+\s*\(/,
    /\bconst\s+\w+\s*=/,
    /\blet\s+\w+\s*=/,
    /\bclass\s+\w+/,
    /\bimport\s+.+from/,
    /\bexport\s+(default\s+)?/,
    /\bif\s*\(.+\)\s*{/,
    /\bfor\s*\(.+\)\s*{/,
    /\breturn\s+/,
    /\{[\s\S]*?\}/,
    /;\s*$/m,
  ];

  return codePatterns.some(p => p.test(content));
}

/**
 * Check if content contains config-like patterns
 */
export function hasConfigPatterns(content: string): boolean {
  const configPatterns = [
    /^\s*"?\w+"?\s*:\s*[^\n,]+/m,
    /\b(true|false|null)\s*$/m,
    /\[[\s\S]+?\]\s*$/m,
    /{\s*}\s*$/m,
    /:\s*\d+\s*$/m,
  ];

  return configPatterns.some(p => p.test(content));
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, minLength = 3, maxCount = 20): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
    'that', 'these', 'those', 'it', 'its', 'as', 'if', 'then', 'than',
    'so', 'not', 'no', 'nor', 'very', 'just', 'also', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= minLength && !stopWords.has(w));

  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([word]) => word);
}

/**
 * Calculate text similarity (simple Jaccard on words)
 */
export function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export default {
  wordCount,
  hasCodePatterns,
  hasConfigPatterns,
  extractKeywords,
  textSimilarity,
  truncateText,
};