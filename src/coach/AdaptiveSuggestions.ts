/**
 * AdaptiveSuggestions - Real-time writing suggestion engine
 * Part of Self-Evolution Writing Coach (Direction C)
 */
import type { WritingPattern } from './types';
import { getTopSkills, type CrystallizedSkill } from './StyleCrystallizer';

export interface SuggestionContext {
  currentText: string;
  cursorPosition: number;
  recentPatterns: WritingPattern[];
  activeSkills: CrystallizedSkill[];
}

export interface Suggestion {
  id: string;
  type: 'phrase' | 'structure' | 'vocabulary' | 'tone' | 'flow';
  text: string;
  reason: string;
  confidence: number;
  priority: number;
  replaces?: { start: number; end: number };
}

export interface SuggestionFilter {
  maxResults?: number;
  minConfidence?: number;
  types?: Suggestion['type'][];
}

const PHRASE_SUGGESTIONS = [
  { pattern: /\b(the|this|that)\s+\w+ing\b/i, suggestion: '正在', reason: '进行时态更生动' },
  { pattern: /\b(very|really|extremely)\s+\w+/i, suggestion: '', reason: '过度修饰，考虑精简' },
  { pattern: /\bin order to\b/i, suggestion: 'to', reason: '简洁优先' },
  { pattern: /\bdue to the fact that\b/i, suggestion: 'because', reason: '简洁表达' },
  { pattern: /\bat this point in time\b/i, suggestion: 'now', reason: '简洁表达' },
  { pattern: /\bhas the ability to\b/i, suggestion: 'can', reason: '简洁表达' },
  { pattern: /\bit is important to note\b/i, suggestion: '', reason: '删除冗余' },
  { pattern: /\bas a matter of fact\b/i, suggestion: 'in fact', reason: '简洁表达' },
  { pattern: /\bin the event that\b/i, suggestion: 'if', reason: '简洁表达' },
  { pattern: /\bwith regard to\b/i, suggestion: 'about', reason: '简洁表达' },
];

const STRUCTURE_SUGGESTIONS = [
  { trigger: 'short_punchy', suggestion: '尝试在关键位置使用短句增强冲击力', reason: '利用您的短句风格' },
  { trigger: 'descriptive_flow', suggestion: '在描述场景时使用复合句增强连贯性', reason: '发挥您的长句优势' },
  { trigger: 'balanced_paragraphs', suggestion: '每个段落控制在3-6句，保持节奏', reason: '维持段落均衡' },
];

const VOCABULARY_SUGGESTIONS = [
  { word: 'good', alternatives: ['effective', 'valuable', 'quality'] },
  { word: 'bad', alternatives: ['problematic', 'challenging', 'suboptimal'] },
  { word: 'big', alternatives: ['significant', 'substantial', 'major'] },
  { word: 'small', alternatives: ['minor', 'limited', 'brief'] },
  { word: 'nice', alternatives: ['pleasant', 'well-crafted', 'engaging'] },
  { word: 'get', alternatives: ['obtain', 'acquire', 'receive'] },
  { word: 'got', alternatives: ['received', 'obtained', 'gained'] },
  { word: 'thing', alternatives: ['aspect', 'element', 'factor'] },
  { word: 'make', alternatives: ['create', 'produce', 'generate'] },
  { word: 'made', alternatives: ['created', 'produced', 'generated'] },
];

function generatePhraseSuggestions(text: string, cursorPosition: number): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const textBefore = text.substring(0, cursorPosition);
  // textAfter reserved for future use
  void textBefore;

  for (const { pattern, suggestion: replacement, reason } of PHRASE_SUGGESTIONS) {
    if (replacement === '' && pattern.test(textBefore)) {
      const match = textBefore.match(pattern);
      if (match) {
        suggestions.push({
          id: 'phrase_' + Math.random().toString(36).slice(2, 8),
          type: 'phrase',
          text: '删除冗余表达',
          reason,
          confidence: 0.85,
          priority: 3,
        });
      }
    }

    const matchResult = textBefore.match(pattern);
    if (matchResult) {
      const lastMatch = matchResult[matchResult.length - 1];
      const lastIndex = textBefore.lastIndexOf(lastMatch);
      if (lastIndex !== -1) {
        suggestions.push({
          id: 'phrase_' + Math.random().toString(36).slice(2, 8),
          type: 'phrase',
          text: replacement,
          reason,
          confidence: 0.75,
          priority: 2,
          replaces: { start: lastIndex, end: lastIndex + lastMatch.length },
        });
      }
    }
  }

  return suggestions;
}

function generateStructureSuggestions(activeSkills: CrystallizedSkill[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const skill of activeSkills) {
    const structureTemplate = STRUCTURE_SUGGESTIONS.find(s => s.trigger === skill.trigger);
    if (structureTemplate) {
      suggestions.push({
        id: 'struct_' + skill.id,
        type: 'structure',
        text: structureTemplate.suggestion,
        reason: structureTemplate.reason,
        confidence: skill.effectiveness / 100,
        priority: skill.usageCount > 5 ? 1 : 2,
      });
    }
  }

  return suggestions;
}

function generateVocabularySuggestions(text: string, _cursorPosition: number): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const recentWords = words.slice(-10);

  for (const { word, alternatives } of VOCABULARY_SUGGESTIONS) {
    const lastIndex = recentWords.lastIndexOf(word);
    if (lastIndex !== -1) {
      suggestions.push({
        id: 'vocab_' + word + '_' + Math.random().toString(36).slice(2, 6),
        type: 'vocabulary',
        text: alternatives[Math.floor(Math.random() * alternatives.length)],
        reason: `替换重复的"${word}"`,
        confidence: 0.7,
        priority: 4,
      });
    }
  }

  return suggestions;
}

function generateToneSuggestions(_text: string, analysis: {
  dominantTone: string;
  readabilityScore: number;
}): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (analysis.dominantTone === 'neutral' && analysis.readabilityScore < 50) {
    suggestions.push({
      id: 'tone_' + Math.random().toString(36).slice(2, 8),
      type: 'tone',
      text: '考虑增加问句或感叹句增强情感表达',
      reason: '文本略显平淡',
      confidence: 0.6,
      priority: 5,
    });
  }

  if (analysis.readabilityScore > 80) {
    suggestions.push({
      id: 'tone_' + Math.random().toString(36).slice(2, 8),
      type: 'tone',
      text: '简洁易懂，考虑增加专业术语增强权威感',
      reason: '可读性很高',
      confidence: 0.65,
      priority: 4,
    });
  }

  return suggestions;
}

function generateFlowSuggestions(text: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const sentences = text.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);

  if (sentences.length >= 3) {
    const lastThree = sentences.slice(-3);
    const firstWords = lastThree.map(s => s.trim().split(/\s+/)[0]?.toLowerCase() || '');
    const uniqueFirstWords = new Set(firstWords.filter(w => w.length > 0));

    if (uniqueFirstWords.size === 1 && firstWords.length >= 2) {
      suggestions.push({
        id: 'flow_' + Math.random().toString(36).slice(2, 8),
        type: 'flow',
        text: '连续句子开头重复，考虑变化句式',
        reason: `避免"${[...uniqueFirstWords][0]}..."模式`,
        confidence: 0.8,
        priority: 1,
      });
    }
  }

  const paragraphBreaks = text.split(/\n\n+/);
  if (paragraphBreaks.length > 1) {
    const shortParagraphs = paragraphBreaks.filter(p => p.split(/\s+/).length < 10);
    if (shortParagraphs.length > paragraphBreaks.length / 2) {
      suggestions.push({
        id: 'flow_' + Math.random().toString(36).slice(2, 8),
        type: 'flow',
        text: '多个短段落，考虑合并相似内容',
        reason: '保持阅读连贯性',
        confidence: 0.7,
        priority: 2,
      });
    }
  }

  return suggestions;
}

export function generateSuggestions(
  context: SuggestionContext,
  analysis?: { dominantTone: string; readabilityScore: number }
): Suggestion[] {
  const allSuggestions: Suggestion[] = [];

  const phraseSuggs = generatePhraseSuggestions(context.currentText, context.cursorPosition);
  allSuggestions.push(...phraseSuggs);

  const structureSuggs = generateStructureSuggestions(context.activeSkills);
  allSuggestions.push(...structureSuggs);

  const vocabSuggs = generateVocabularySuggestions(context.currentText, context.cursorPosition);
  allSuggestions.push(...vocabSuggs);

  if (analysis) {
    const toneSuggs = generateToneSuggestions(context.currentText, analysis);
    allSuggestions.push(...toneSuggs);
  }

  const flowSuggs = generateFlowSuggestions(context.currentText);
  allSuggestions.push(...flowSuggs);

  return allSuggestions;
}

export function filterSuggestions(
  suggestions: Suggestion[],
  filter: SuggestionFilter
): Suggestion[] {
  let filtered = [...suggestions];

  if (filter.minConfidence !== undefined) {
    filtered = filtered.filter(s => s.confidence >= filter.minConfidence!);
  }

  if (filter.types && filter.types.length > 0) {
    filtered = filtered.filter(s => filter.types!.includes(s.type));
  }

  filtered.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.confidence - a.confidence;
  });

  if (filter.maxResults !== undefined && filter.maxResults > 0) {
    filtered = filtered.slice(0, filter.maxResults);
  }

  return filtered;
}

export function getSuggestionsForContext(
  text: string,
  cursorPosition: number,
  analysis?: { dominantTone: string; readabilityScore: number }
): Suggestion[] {
  const activeSkills = getTopSkills(3);
  const recentPatterns = activeSkills.map(s => s.pattern);

  const context: SuggestionContext = {
    currentText: text,
    cursorPosition,
    recentPatterns,
    activeSkills,
  };

  const suggestions = generateSuggestions(context, analysis);
  return filterSuggestions(suggestions, { maxResults: 5, minConfidence: 0.5 });
}

export function applySuggestion(
  text: string,
  suggestion: Suggestion,
  cursorPosition: number
): { newText: string; newCursorPosition: number } {
  if (suggestion.replaces) {
    const newText = text.substring(0, suggestion.replaces.start) +
      suggestion.text +
      text.substring(suggestion.replaces.end);
    return {
      newText,
      newCursorPosition: suggestion.replaces.start + suggestion.text.length,
    };
  }

  if (suggestion.type === 'structure' || suggestion.type === 'tone' || suggestion.type === 'flow') {
    return {
      newText: text,
      newCursorPosition: cursorPosition,
    };
  }

  const textBefore = text.substring(0, cursorPosition);
  const words = textBefore.split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return { newText: text, newCursorPosition: cursorPosition };
  }

  const lastWord = words[words.length - 1];
  const lastWordEnd = textBefore.lastIndexOf(lastWord) + lastWord.length;

  const newText = text.substring(0, lastWordEnd) + ' ' + suggestion.text + text.substring(cursorPosition);
  return {
    newText,
    newCursorPosition: lastWordEnd + 1 + suggestion.text.length,
  };
}

export function getSuggestionStats(suggestions: Suggestion[]): {
  byType: Record<Suggestion['type'], number>;
  avgConfidence: number;
  highPriority: number;
} {
  const byType: Record<Suggestion['type'], number> = {
    phrase: 0,
    structure: 0,
    vocabulary: 0,
    tone: 0,
    flow: 0,
  };

  let totalConfidence = 0;
  let highPriority = 0;

  for (const s of suggestions) {
    byType[s.type]++;
    totalConfidence += s.confidence;
    if (s.priority <= 2) highPriority++;
  }

  return {
    byType,
    avgConfidence: suggestions.length > 0 ? totalConfidence / suggestions.length : 0,
    highPriority,
  };
}