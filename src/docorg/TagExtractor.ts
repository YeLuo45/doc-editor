/**
 * TagExtractor - Extract key terms and topics from document content
 */

import { extractKeywords, wordCount } from './utils/textAnalysis';

export interface Tag {
  term: string;
  frequency: number;
  relevance: number;
}

export interface ExtractionResult {
  tags: Tag[];
  topics: string[];
  entities: string[];
  summary: string;
}

export interface TagExtractorOptions {
  maxTags?: number;
  minTagFrequency?: number;
  minTagRelevance?: number;
  extractEntities?: boolean;
  extractTopics?: boolean;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'programming': ['code', 'function', 'variable', 'class', 'method', 'algorithm', 'software', 'programming', 'developer'],
  'data': ['data', 'database', 'query', 'storage', 'record', 'table', 'schema', 'dataset', 'analytics'],
  'web': ['http', 'url', 'api', 'request', 'response', 'server', 'client', 'browser', 'web', 'html', 'css'],
  'business': ['revenue', 'customer', 'sales', 'marketing', 'strategy', 'product', 'company', 'business', 'market'],
  'project': ['project', 'task', 'team', 'deadline', 'milestone', 'sprint', 'agile', 'scrum', 'kanban'],
  'learning': ['learn', 'tutorial', 'course', 'study', 'education', 'training', 'knowledge', 'skill'],
  'design': ['design', 'ui', 'ux', 'interface', 'layout', 'visual', 'color', 'font', 'style'],
  'devops': ['deploy', 'CI/CD', 'pipeline', 'build', 'test', 'release', 'monitoring', 'infrastructure'],
  'ai': ['AI', 'machine learning', 'model', 'neural', 'training', 'inference', 'deep learning', 'NLP'],
  'security': ['security', 'auth', 'authentication', 'authorization', 'encryption', 'SSL', 'TLS', 'vulnerability'],
};

const ENTITY_PATTERNS: RegExp[] = [
  /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g, // CamelCase
  /@\w+/g, // @mentions
  /#\w+/g, // #hashtags
  /\$\w+/g, // $variables
  /\b(?:https?:\/\/|www\.)\S+\b/gi, // URLs
  /\b\d+\.\d+\.\d+\.\d+\b/g, // IP addresses
  /\b\d{4}-\d{2}-\d{2}\b/g, // dates
];

/**
 * Extract tags from document content
 */
export function extractTags(
  content: string,
  options: TagExtractorOptions = {}
): Tag[] {
  const {
    maxTags = 20,
    minTagFrequency = 1,
    minTagRelevance = 0.1,
  } = options;

  const keywords = extractKeywords(content, 3, maxTags * 2);
  const totalWords = wordCount(content);

  // Calculate frequency and relevance for each keyword
  const tags: Tag[] = keywords.map((term, index) => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const frequency = (content.toLowerCase().match(regex) || []).length / totalWords;
    const relevance = 1 - (index / (keywords.length || 1)) * 0.5; // Earlier = higher relevance

    return {
      term,
      frequency: Math.round(frequency * 1000) / 1000,
      relevance: Math.round(relevance * 100) / 100,
    };
  });

  // Filter by minimum frequency and relevance
  return tags
    .filter(t => t.frequency >= minTagFrequency || t.relevance >= minTagRelevance)
    .sort((a, b) => (b.frequency + b.relevance) - (a.frequency + a.relevance))
    .slice(0, maxTags);
}

/**
 * Extract topics from document content
 */
export function extractTopics(
  content: string,
  options: TagExtractorOptions = {}
): string[] {
  const { maxTags = 5 } = options;

  const contentLower = content.toLowerCase();
  const topicScores: Record<string, number> = {};

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    if (score > 0) {
      topicScores[topic] = score;
    }
  }

  return Object.entries(topicScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags)
    .map(([topic]) => topic);
}

/**
 * Extract entities from document content
 */
export function extractEntities(content: string): string[] {
  const entities = new Set<string>();

  for (const pattern of ENTITY_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (match.length > 2 && match.length < 50) {
          entities.add(match);
        }
      }
    }
  }

  return Array.from(entities);
}

/**
 * Generate a brief summary of the document
 */
export function generateSummary(content: string, maxLength = 200): string {
  const sentences = content
    .replace(/\s+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length === 0) {
    return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // Take first sentence or combine first two if short
  let summary = sentences[0];
  if (summary.length < 100 && sentences.length > 1) {
    summary += '. ' + sentences[1];
  }

  return summary.slice(0, maxLength) + (summary.length > maxLength ? '' : (content.length > summary.length + 2 ? '...' : ''));
}

/**
 * Full extraction - combine all extraction methods
 */
export function extractFromDocument(
  content: string,
  options: TagExtractorOptions = {}
): ExtractionResult {
  const tags = extractTags(content, options);
  const topics = extractTopics(content, options);
  const entities = options.extractEntities !== false ? extractEntities(content) : [];
  const summary = generateSummary(content);

  return {
    tags,
    topics,
    entities,
    summary,
  };
}

/**
 * Batch extract from multiple documents
 */
export function extractFromDocuments(
  contents: string[],
  options?: TagExtractorOptions
): ExtractionResult[] {
  return contents.map(content => extractFromDocument(content, options));
}

export default {
  extractTags,
  extractTopics,
  extractEntities,
  generateSummary,
  extractFromDocument,
  extractFromDocuments,
};