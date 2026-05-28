/**
 * DocumentClassifier - Categorize documents by type using content analysis
 * Classifies documents as: note, code, config, doc
 */

import { wordCount, hasCodePatterns, hasConfigPatterns } from './utils/textAnalysis';

export type DocumentType = 'note' | 'code' | 'config' | 'doc' | 'unknown';

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  reasons: string[];
}

interface DocumentClassifierOptions {
  minConfidence?: number;
  codePatterns?: RegExp[];
  configPatterns?: RegExp[];
  docPatterns?: RegExp[];
}

const DEFAULT_CODE_PATTERNS = [
  /\bfunction\s+\w+\s*\(/,
  /\bconst\s+\w+\s*=/,
  /\blet\s+\w+\s*=/,
  /\bclass\s+\w+/,
  /\bimport\s+.+from/,
  /\bexport\s+(default\s+)?/,
  /\bif\s*\(.+\)\s*{/,
  /\bfor\s*\(.+\)\s*{/,
  /\breturn\s+/,
  /=>\s*{/,
  /;\s*$/m,
];

const DEFAULT_CONFIG_PATTERNS = [
  /^\s*["']?\w+["']?\s*:\s*[^\n,]+/m,
  /\b(true|false|null)\s*$/m,
  /\[\s*\]\s*$/m,
  /{\s*}\s*$/m,
  /:\s*\d+\s*$/m,
  /:\s*["'][^"']+["']\s*$/m,
];

const DEFAULT_DOC_PATTERNS = [
  /^#+\s+.+/m,
  /^\*\*.+\*\*/m,
  /^[A-Z].+[.!?]$/m,
  /\bdocumentation\b/i,
  /\bREADME\b/i,
  /\btodo\b/i,
  /\bnote\b/i,
  /\bexample\b/i,
];

/**
 * Document content analyzer for classification
 */
export interface DocumentContent {
  title?: string;
  content: string;
  fileName?: string;
  language?: string;
}

const CODE_INDICATORS = ['function', 'const', 'let', 'class', 'import', 'export', 'return', 'if', 'for', '=>', '{', '}', ';'];
const CONFIG_INDICATORS = ['{', '}', ':', '[', ']', 'true', 'false', 'null', ',', '"', "'"];
const DOC_INDICATORS = ['the', 'and', 'is', 'are', 'this', 'that', 'with', 'for', 'document', 'guide', 'tutorial', 'how', 'what', 'when'];

export function classifyDocument(
  doc: DocumentContent,
  options: DocumentClassifierOptions = {}
): ClassificationResult {
  const {
    minConfidence = 0.4,
    codePatterns = DEFAULT_CODE_PATTERNS,
    configPatterns = DEFAULT_CONFIG_PATTERNS,
    docPatterns = DEFAULT_DOC_PATTERNS,
  } = options;

  const content = doc.content;
  const title = doc.title || doc.fileName || '';
  const combined = `${title} ${content}`.toLowerCase();

  const reasons: string[] = [];
  let scores: Record<DocumentType, number> = {
    note: 0,
    code: 0,
    config: 0,
    doc: 0,
    unknown: 0,
  };

  // Check file extension/language hint - language is a strong signal, use lower threshold
  if (doc.language) {
    const lang = doc.language.toLowerCase();
    if (['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin'].includes(lang)) {
      scores.code += 0.5;
      reasons.push(`Language hint: ${lang}`);
    } else if (['json', 'yaml', 'toml', 'xml', 'ini', 'toml'].includes(lang)) {
      scores.config += 0.5;
      reasons.push(`Language hint: ${lang}`);
    } else if (['markdown', 'md', 'rst', 'latex', 'txt'].includes(lang)) {
      scores.doc += 0.5;
      reasons.push(`Language hint: ${lang}`);
    } else if (['text', 'plain'].includes(lang)) {
      scores.note += 0.3;
      reasons.push(`Language hint: ${lang}`);
    }
  }

  // Check file name patterns
  if (doc.fileName) {
    const fn = doc.fileName.toLowerCase();
    if (fn.endsWith('.ts') || fn.endsWith('.js') || fn.endsWith('.py') || fn.endsWith('.java')) {
      scores.code += 0.2;
      reasons.push('File extension suggests code');
    } else if (fn.endsWith('.json') || fn.endsWith('.yaml') || fn.endsWith('.yml') || fn.endsWith('.toml')) {
      scores.config += 0.2;
      reasons.push('File extension suggests config');
    } else if (fn.endsWith('.md') || fn.endsWith('.txt') || fn.endsWith('.rst')) {
      scores.doc += 0.2;
      reasons.push('File extension suggests documentation');
    } else if (fn.startsWith('note') || fn.startsWith('untitled')) {
      scores.note += 0.2;
      reasons.push('File name suggests note');
    }
  }

  // Pattern-based scoring
  for (const pattern of codePatterns) {
    if (pattern.test(content)) {
      scores.code += 0.15;
      if (!reasons.some(r => r.includes('code pattern'))) {
        reasons.push('Matches code pattern');
      }
    }
  }

  for (const pattern of configPatterns) {
    if (pattern.test(content)) {
      scores.config += 0.15;
      if (!reasons.some(r => r.includes('config pattern'))) {
        reasons.push('Matches config pattern');
      }
    }
  }

  for (const pattern of docPatterns) {
    if (pattern.test(combined)) {
      scores.doc += 0.1;
      if (!reasons.some(r => r.includes('doc pattern'))) {
        reasons.push('Matches documentation pattern');
      }
    }
  }

  // Content structure analysis
  const wc = wordCount(content);
  const hasCode = hasCodePatterns(content);
  const hasConfig = hasConfigPatterns(content);

  if (hasCode) {
    scores.code += 0.2;
    reasons.push('Contains code-like structures');
  }

  if (hasConfig) {
    scores.config += 0.15;
    reasons.push('Contains config-like structures');
  }

  // Check README pattern
  const readmePattern = /#\s+\w+/;
  if (readmePattern.test(content)) {
    scores.doc += 0.3;
    reasons.push('Has markdown heading');
  }

  // Line length analysis - code tends to have shorter lines
  const lines = content.split('\n');
  const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / (lines.length || 1);
  if (avgLineLength < 60 && hasCode) {
    scores.code += 0.1;
    reasons.push('Short lines suggest code');
  } else if (avgLineLength > 100 && !hasCode) {
    scores.doc += 0.1;
    reasons.push('Long lines suggest prose');
  }

  // Whitespace ratio - docs have more whitespace
  const whitespaceRatio = (content.match(/\s/g) || []).length / (content.length || 1);
  if (whitespaceRatio > 0.25) {
    scores.doc += 0.1;
    reasons.push('High whitespace ratio suggests prose');
  }

  // Find highest scoring type
  let maxType: DocumentType = 'unknown';
  let maxScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as DocumentType;
    }
  }

  // Apply minimum confidence threshold
  if (maxScore < minConfidence) {
    return {
      type: 'unknown',
      confidence: maxScore,
      reasons: maxScore > 0.2 ? reasons : ['Classification confidence too low'],
    };
  }

  return {
    type: maxType,
    confidence: Math.min(maxScore, 1),
    reasons,
  };
}

/**
 * Batch classify multiple documents
 */
export function classifyDocuments(
  docs: DocumentContent[],
  options?: DocumentClassifierOptions
): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const key = doc.fileName || doc.title || `doc-${i}`;
    results.set(key, classifyDocument(doc, options));
  }
  return results;
}

/**
 * Get document type statistics from classification results
 */
export function getClassificationStats(
  results: Map<string, ClassificationResult>
): Record<DocumentType, number> {
  const stats: Record<DocumentType, number> = {
    note: 0,
    code: 0,
    config: 0,
    doc: 0,
    unknown: 0,
  };

  for (const result of results.values()) {
    stats[result.type]++;
  }

  return stats;
}

export default { classifyDocument, classifyDocuments, getClassificationStats };