/**
 * V61 Search Index Engine - InvertedIndex
 * Inverted index with build/insert/lookup/getPostings
 */

export interface InvertedIndexConfig {
  caseSensitive: boolean;
  maxPostingsSize: number;
  enableCompression: boolean;
}

export interface Posting {
  docId: string;
  frequency: number;
  positions: number[];
}

export interface InvertedIndexEntry {
  term: string;
  postings: Posting[];
  documentFrequency: number;
}

export class InvertedIndex {
  private _config: InvertedIndexConfig;
  private _index: Map<string, Posting[]> = new Map();
  private _documentCount: number = 0;

  constructor(config: Partial<InvertedIndexConfig> = {}) {
    this._config = {
      caseSensitive: config.caseSensitive ?? false,
      maxPostingsSize: config.maxPostingsSize ?? 10000,
      enableCompression: config.enableCompression ?? false,
    };
  }

  get config(): InvertedIndexConfig {
    return { ...this._config };
  }

  build(documents: Map<string, string>): void {
    this._index.clear();
    this._documentCount = documents.size;

    for (const [docId, content] of documents) {
      const tokens = this.tokenize(content);
      const positionMap: Map<string, number[]> = new Map();

      tokens.forEach((token, position) => {
        if (!positionMap.has(token)) {
          positionMap.set(token, []);
        }
        positionMap.get(token)!.push(position);
      });

      for (const [token, positions] of positionMap) {
        this.insert(token, docId, positions);
      }
    }
  }

  insert(term: string, docId: string, positions: number[]): void {
    const normalizedTerm = this._config.caseSensitive ? term : term.toLowerCase();
    const postings = this._index.get(normalizedTerm) ?? [];

    let existingPosting = postings.find(p => p.docId === docId);
    if (existingPosting) {
      existingPosting.frequency += 1;
      existingPosting.positions.push(...positions);
    } else {
      postings.push({ docId, frequency: 1, positions: [...positions] });
      this._index.set(normalizedTerm, postings);
    }
  }

  lookup(term: string): string[] {
    const normalizedTerm = this._config.caseSensitive ? term : term.toLowerCase();
    const postings = this._index.get(normalizedTerm) ?? [];
    return postings.map(p => p.docId);
  }

  getPostings(term: string): Posting[] {
    const normalizedTerm = this._config.caseSensitive ? term : term.toLowerCase();
    return this._index.get(normalizedTerm) ?? [];
  }

  private tokenize(text: string): string[] {
    const pattern = /\w+/g;
    const words = text.match(pattern) ?? [];
    return words.map(w => this._config.caseSensitive ? w : w.toLowerCase());
  }

  getDocumentFrequency(term: string): number {
    const normalizedTerm = this._config.caseSensitive ? term : term.toLowerCase();
    const postings = this._index.get(normalizedTerm);
    return postings ? postings.length : 0;
  }

  getTotalTerms(): number {
    return this._index.size;
  }

  getTotalPostings(): number {
    let total = 0;
    for (const postings of this._index.values()) {
      total += postings.length;
    }
    return total;
  }

  getSnapshot(): { metrics: Record<string, number> } {
    return {
      metrics: {
        uniqueTerms: this._index.size,
        documentCount: this._documentCount,
        totalPostings: this.getTotalPostings(),
        compressionEnabled: this._config.enableCompression ? 1 : 0,
      },
    };
  }

  reset(): void {
    this._index.clear();
    this._documentCount = 0;
  }

  getReport(): string {
    return [
      '=== InvertedIndex Report ===',
      `Unique terms: ${this._index.size}`,
      `Documents indexed: ${this._documentCount}`,
      `Total postings: ${this.getTotalPostings()}`,
      `Case sensitive: ${this._config.caseSensitive}`,
      `Compression: ${this._config.enableCompression}`,
      `Max postings size: ${this._config.maxPostingsSize}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V61-InvertedIndex',
    };
  }
}