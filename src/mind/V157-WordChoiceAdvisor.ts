/**
 * V157 WordChoiceAdvisor - Direction A Writing Mind (Iter 3/30)
 * thunderbolt: real-time word choice analysis
 */
export type AdviceLevel = 'good' | 'caution' | 'weak' | 'avoid';

export interface WordIssue {
  word: string;
  level: AdviceLevel;
  suggestion: string;
  reason: string;
}

export interface WordStats {
  total: number;
  unique: number;
  overused: Array<{ word: string; count: number }>;
  weakVerbs: number;
  jargon: number;
  filler: number;
}

const WEAK_VERBS = ['做', '搞', '弄', '进行', '处理', 'do', 'make', 'get', 'have', 'take'];
const FILLER_WORDS = ['非常', '特别', '真的', '其实', 'very', 'really', 'just', 'actually', 'basically'];
const JARGON_PATTERNS = [/\b\w{15,}\b/g, /[A-Z]{4,}/g];

export function createWordStats(): WordStats {
  return { total: 0, unique: 0, overused: [], weakVerbs: 0, jargon: 0, filler: 0 };
}

export function tokenize(text: string): string[] {
  return (text.match(/[\u4e00-\u9fa5]+|[a-zA-Z]+/g) || []);
}

export function analyzeWordStats(text: string): WordStats {
  const tokens = tokenize(text);
  if (tokens.length === 0) return createWordStats();
  const counts: Record<string, number> = {};
  for (const t of tokens) counts[t.toLowerCase()] = (counts[t.toLowerCase()] || 0) + 1;
  const overused = Object.entries(counts)
    .filter(([_, c]) => c >= 3)
    .map(([w, c]) => ({ word: w, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const weakVerbs = tokens.filter(t => WEAK_VERBS.includes(t.toLowerCase())).length;
  const filler = tokens.filter(t => FILLER_WORDS.includes(t.toLowerCase())).length;
  let jargon = 0;
  for (const pat of JARGON_PATTERNS) {
    const matches = text.match(pat);
    if (matches) jargon += matches.length;
  }
  return {
    total: tokens.length,
    unique: Object.keys(counts).length,
    overused,
    weakVerbs,
    jargon,
    filler,
  };
}

export function detectWeakVerbs(text: string): WordIssue[] {
  const issues: WordIssue[] = [];
  for (const w of WEAK_VERBS) {
    const re = new RegExp(w, 'gi');
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) {
        issues.push({ word: m, level: 'weak', suggestion: 'use specific verb', reason: 'weak/abstract verb' });
      }
    }
  }
  return issues.slice(0, 20);
}

export function detectOverusedWords(text: string, threshold: number = 3): WordIssue[] {
  const stats = analyzeWordStats(text);
  return stats.overused
    .filter(o => o.count >= threshold)
    .map(o => ({ word: o.word, level: 'caution', suggestion: 'consider synonym', reason: `used ${o.count} times` }));
}

export function detectJargon(text: string): WordIssue[] {
  const issues: WordIssue[] = [];
  for (const pat of JARGON_PATTERNS) {
    const matches = text.match(pat) || [];
    for (const m of matches) issues.push({ word: m, level: 'avoid', suggestion: 'simplify', reason: 'long/uppercase term' });
  }
  return issues.slice(0, 20);
}

export function generateAdvice(text: string): WordIssue[] {
  return [...detectWeakVerbs(text), ...detectOverusedWords(text), ...detectJargon(text)];
}

export function getWordStatsReport(text: string): WordStats {
  return analyzeWordStats(text);
}
