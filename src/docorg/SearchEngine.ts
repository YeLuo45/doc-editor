/**
 * SearchEngine - Full-text search with filters and ranking
 */

import { textSimilarity } from './utils/textAnalysis';

export interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  type?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  types?: string[];
  tags?: string[];
  dateFrom?: number;
  dateTo?: number;
  containsTags?: string[];
}

export interface SearchResult {
  document: SearchableDocument;
  score: number;
  matchedTerms: string[];
  highlights: string[];
}

export interface SearchStats {
  totalResults: number;
  queryTime: number;
  filtersApplied: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  stats: SearchStats;
}

class SearchEngineImpl {
  private documents: Map<string, SearchableDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.documents = new Map();
    this.invertedIndex = new Map();
  }

  /**
   * Index a document for searching
   */
  indexDocument(doc: SearchableDocument): void {
    this.documents.set(doc.id, { ...doc });

    // Build inverted index
    const terms = this.tokenize(`${doc.title} ${doc.content}`);
    const uniqueTerms = new Set(terms);

    for (const term of uniqueTerms) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, new Set());
      }
      this.invertedIndex.get(term)!.add(doc.id);

      // Also index individual characters for autocomplete
      for (let i = 1; i < term.length; i++) {
        const prefix = term.slice(0, i);
        if (!this.invertedIndex.has(prefix)) {
          this.invertedIndex.set(prefix, new Set());
        }
        this.invertedIndex.get(prefix)!.add(doc.id);
      }
    }
  }

  /**
   * Remove a document from the index
   */
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Remove from inverted index
    const terms = this.tokenize(`${doc.title} ${doc.content}`);
    const uniqueTerms = new Set(terms);

    for (const term of uniqueTerms) {
      this.invertedIndex.get(term)?.delete(id);
    }

    this.documents.delete(id);
  }

  /**
   * Update a document in the index
   */
  updateDocument(id: string, updates: Partial<SearchableDocument>): void {
    const existing = this.documents.get(id);
    if (existing) {
      this.removeDocument(id);
      const updated = { ...existing, ...updates, id };
      this.indexDocument(updated);
    }
  }

  /**
   * Tokenize text into searchable terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length >= 2);
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateScore(doc: SearchableDocument, queryTerms: string[]): { score: number; matchedTerms: string[] } {
    let score = 0;
    const matchedTerms: string[] = [];
    const docTerms = new Set(this.tokenize(`${doc.title} ${doc.content}`));

    for (const term of queryTerms) {
      // Exact match in title (highest weight)
      if (doc.title.toLowerCase().includes(term)) {
        score += 10;
        matchedTerms.push(term);
      }

      // Match in content
      const contentMatches = (doc.content.toLowerCase().match(new RegExp(term, 'g')) || []).length;
      if (contentMatches > 0) {
        score += contentMatches * 2;
        matchedTerms.push(term);
      }

      // Tag match
      if (doc.tags) {
        for (const tag of doc.tags) {
          if (tag.toLowerCase().includes(term)) {
            score += 5;
            if (!matchedTerms.includes(term)) {
              matchedTerms.push(term);
            }
          }
        }
      }

      // Text similarity bonus
      const docText = `${doc.title} ${doc.content}`;
      const sim = textSimilarity(term, docText);
      if (sim > 0.1) {
        score += sim * 3;
      }
    }

    // Normalize by document length
    const docLength = doc.content.length + doc.title.length;
    if (docLength > 0) {
      score = score * (1000 / Math.max(docLength, 1000));
    }

    return { score: Math.round(score * 100) / 100, matchedTerms };
  }

  /**
   * Generate highlight snippets for matches
   */
  private generateHighlights(doc: SearchableDocument, queryTerms: string[]): string[] {
    const highlights: string[] = [];
    const content = doc.content;
    const maxHighlightLength = 150;

    for (const term of queryTerms) {
      const regex = new RegExp(`[^.!?]*${term}[^.!?]*[.!?]?`, 'gi');
      const matches = content.match(regex);

      if (matches) {
        for (const match of matches.slice(0, 2)) {
          const trimmed = match.length > maxHighlightLength
            ? '...' + match.slice(Math.floor(match.length / 2) - 50, Math.floor(match.length / 2) + 100) + '...'
            : match;
          highlights.push(trimmed.trim());
        }
      }
    }

    return [...new Set(highlights)].slice(0, 5);
  }

  /**
   * Apply filters to documents
   */
  private applyFilters(docs: SearchableDocument[], filters?: SearchFilters): SearchableDocument[] {
    if (!filters) return docs;

    return docs.filter(doc => {
      // Type filter
      if (filters.types && filters.types.length > 0) {
        if (!doc.type || !filters.types.includes(doc.type)) {
          return false;
        }
      }

      // Tags filter (all specified tags must be present)
      if (filters.containsTags && filters.containsTags.length > 0) {
        if (!doc.tags || !filters.containsTags.every(t =>
          doc.tags!.some(docTag => docTag.toLowerCase().includes(t.toLowerCase()))
        )) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateFrom !== undefined) {
        if (!doc.createdAt || doc.createdAt < filters.dateFrom) {
          return false;
        }
      }

      if (filters.dateTo !== undefined) {
        if (!doc.createdAt || doc.createdAt > filters.dateTo) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Search documents
   */
  search(options: SearchOptions): SearchResponse {
    const startTime = performance.now();
    const {
      query,
      filters,
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 50,
      offset = 0,
    } = options;

    const queryTerms = this.tokenize(query);
    const filtersApplied: string[] = [];
    if (filters) {
      if (filters.types) filtersApplied.push(`types: ${filters.types.join(', ')}`);
      if (filters.tags) filtersApplied.push(`tags: ${filters.tags.join(', ')}`);
      if (filters.dateFrom) filtersApplied.push(`dateFrom: ${new Date(filters.dateFrom).toISOString()}`);
      if (filters.dateTo) filtersApplied.push(`dateTo: ${new Date(filters.dateTo).toISOString()}`);
    }

    // Get candidate documents using inverted index
    let candidateIds = new Set<string>();
    if (queryTerms.length > 0) {
      for (const term of queryTerms) {
        const docIds = this.invertedIndex.get(term);
        if (docIds) {
          if (candidateIds.size === 0) {
            candidateIds = new Set(docIds);
          } else {
            // Intersection for AND-like behavior
            candidateIds = new Set([...candidateIds].filter(id => docIds.has(id)));
          }
        } else {
          // If any term has no results, no results
          candidateIds = new Set();
          break;
        }
      }
    } else {
      candidateIds = new Set(this.documents.keys());
    }

    // Get documents and calculate scores
    let results: SearchResult[] = [];

    for (const id of candidateIds) {
      const doc = this.documents.get(id);
      if (!doc) continue;

      const { score, matchedTerms } = this.calculateScore(doc, queryTerms);
      const highlights = this.generateHighlights(doc, queryTerms);

      results.push({
        document: doc,
        score,
        matchedTerms,
        highlights,
      });
    }

    // Apply filters
    const filteredDocs = results.map(r => r.document);
    const afterFilter = this.applyFilters(filteredDocs, filters);
    const afterFilterIds = new Set(afterFilter.map(d => d.id));
    results = results.filter(r => afterFilterIds.has(r.document.id));

    // Sort results
    results.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'relevance':
          cmp = b.score - a.score;
          break;
        case 'date':
          cmp = (b.document.updatedAt || 0) - (a.document.updatedAt || 0);
          break;
        case 'title':
          cmp = a.document.title.localeCompare(b.document.title);
          break;
      }
      return sortOrder === 'desc' ? cmp : -cmp;
    });

    const totalResults = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      stats: {
        totalResults,
        queryTime: Math.round(performance.now() - startTime),
        filtersApplied,
      },
    };
  }

  /**
   * Search with autocomplete suggestions
   */
  getSuggestions(prefix: string, limit = 10): string[] {
    if (prefix.length < 2) return [];

    const prefixLower = prefix.toLowerCase();
    const matchingTerms: Array<{ term: string; docCount: number }> = [];

    for (const [term, docIds] of this.invertedIndex.entries()) {
      if (term.startsWith(prefixLower) && term.length > prefix.length) {
        matchingTerms.push({ term, docCount: docIds.size });
      }
    }

    return matchingTerms
      .sort((a, b) => b.docCount - a.docCount)
      .slice(0, limit)
      .map(m => m.term);
  }

  /**
   * Get all indexed documents
   */
  getAllDocuments(): SearchableDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
  }
}

export const searchEngine = new SearchEngineImpl();
export { SearchEngineImpl };
export default searchEngine;