/**
 * V61 Search Index Engine - SearchIndex
 * Full-text search with index/add/remove/search/getIndexedCount
 */

export interface SearchIndexConfig {
  caseSensitive: boolean;
  minWordLength: number;
  maxResults: number;
  enableStemming: boolean;
}

export interface IndexedDocument {
  id: string;
  content: string;
  tokens: string[];
  timestamp: number;
}

export interface SearchResult {
  docId: string;
  score: number;
  matches: string[];
}

export class SearchIndex {
  private _config: SearchIndexConfig;
  private _documents: Map<string, IndexedDocument> = new Map();
  private _tokenIndex: Map<string, Set<string>> = new Map();

  constructor(config: Partial<SearchIndexConfig> = {}) {
    this._config = {
      caseSensitive: config.caseSensitive ?? false,
      minWordLength: config.minWordLength ?? 2,
      maxResults: config.maxResults ?? 100,
      enableStemming: config.enableStemming ?? true,
    };
  }

  get config(): SearchIndexConfig {
    return { ...this._config };
  }

  index(docId: string, content: string): void {
    const tokens = this.tokenize(content);
    const doc: IndexedDocument = {
      id: docId,
      content,
      tokens,
      timestamp: Date.now(),
    };
    this._documents.set(docId, doc);
    for (const token of tokens) {
      if (!this._tokenIndex.has(token)) {
        this._tokenIndex.set(token, new Set());
      }
      this._tokenIndex.get(token)!.add(docId);
    }
  }

  add(docId: string, content: string): void {
    if (this._documents.has(docId)) {
      this.remove(docId);
    }
    this.index(docId, content);
  }

  remove(docId: string): boolean {
    const doc = this._documents.get(docId);
    if (!doc) return false;
    for (const token of doc.tokens) {
      const posting = this._tokenIndex.get(token);
      if (posting) {
        posting.delete(docId);
        if (posting.size === 0) {
          this._tokenIndex.delete(token);
        }
      }
    }
    this._documents.delete(docId);
    return true;
  }

  search(query: string): SearchResult[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return [];

    const docScores: Map<string, number> = new Map();
    for (const token of queryTokens) {
      const normalizedToken = this._config.caseSensitive ? token : token.toLowerCase();
      const posting = this._tokenIndex.get(normalizedToken) ?? this._tokenIndex.get(token);
      if (posting) {
        for (const docId of posting) {
          const currentScore = docScores.get(docId) ?? 0;
          docScores.set(docId, currentScore + 1);
        }
      }
    }

    const results: SearchResult[] = [];
    for (const [docId, score] of docScores) {
      const doc = this._documents.get(docId)!;
      const matches = queryTokens.filter(t => doc.tokens.includes(t));
      results.push({ docId, score, matches });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, this._config.maxResults);
  }

  getIndexedCount(): number {
    return this._documents.size;
  }

  private tokenize(text: string): string[] {
    const pattern = /\w+/g;
    const words = text.match(pattern) ?? [];
    return words
      .filter(w => w.length >= this._config.minWordLength)
      .map(w => this._config.caseSensitive ? w : w.toLowerCase());
  }

  getSnapshot(): { metrics: Record<string, number> } {
    return {
      metrics: {
        documentCount: this._documents.size,
        tokenCount: this._tokenIndex.size,
        caseSensitive: this._config.caseSensitive ? 1 : 0,
        minWordLength: this._config.minWordLength,
      },
    };
  }

  reset(): void {
    this._documents.clear();
    this._tokenIndex.clear();
  }

  getReport(): string {
    return [
      '=== SearchIndex Report ===',
      `Documents indexed: ${this._documents.size}`,
      `Unique tokens: ${this._tokenIndex.size}`,
      `Case sensitive: ${this._config.caseSensitive}`,
      `Min word length: ${this._config.minWordLength}`,
      `Max results: ${this._config.maxResults}`,
      `Stemming enabled: ${this._config.enableStemming}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V61-SearchIndex',
    };
  }
}