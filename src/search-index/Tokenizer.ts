/**
 * V61 Search Index Engine - Tokenizer
 * Text tokenization with tokenize/normalize/stem/getStopWords
 */

export interface TokenizerConfig {
  caseSensitive: boolean;
  removeStopWords: boolean;
  enableStemming: boolean;
  minTokenLength: number;
}

const ENGLISH_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
  'those', 'am', 'is', 'are', 'was', 'were', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'but', 'if', 'or', 'because',
  'as', 'until', 'while', 'of', 'under', 'above', 'below', 'between',
]);

const STEMMING_RULES: Map<string, string> = new Map([
  ['running', 'run'],
  ['runs', 'run'],
  ['runned', 'run'],
  ['running', 'run'],
  ['faster', 'fast'],
  ['fastest', 'fast'],
  ['slowest', 'slow'],
  ['documents', 'document'],
  ['indexing', 'index'],
  ['indexed', 'index'],
  ['searching', 'search'],
  ['searched', 'search'],
  ['processing', 'process'],
  ['processed', 'process'],
  ['creating', 'create'],
  ['created', 'create'],
]);

export class Tokenizer {
  private _config: TokenizerConfig;

  constructor(config: Partial<TokenizerConfig> = {}) {
    this._config = {
      caseSensitive: config.caseSensitive ?? false,
      removeStopWords: config.removeStopWords ?? true,
      enableStemming: config.enableStemming ?? true,
      minTokenLength: config.minTokenLength ?? 2,
    };
  }

  get config(): TokenizerConfig {
    return { ...this._config };
  }

  tokenize(text: string): string[] {
    if (!text || typeof text !== 'string') return [];

    const pattern = /\w+/g;
    const matches = text.match(pattern) ?? [];

    let tokens = matches.map(m => 
      this._config.caseSensitive ? m : m.toLowerCase()
    );

    tokens = tokens.filter(t => t.length >= this._config.minTokenLength);

    if (this._config.removeStopWords) {
      tokens = tokens.filter(t => !ENGLISH_STOP_WORDS.has(t));
    }

    if (this._config.enableStemming) {
      tokens = tokens.map(t => this.stem(t));
    }

    return tokens;
  }

  normalize(token: string): string {
    let result = token.trim();
    if (!this._config.caseSensitive) {
      result = result.toLowerCase();
    }
    return result;
  }

  stem(token: string): string {
    const stemmed = STEMMING_RULES.get(token);
    if (stemmed) return stemmed;

    if (token.endsWith('ing')) {
      return token.slice(0, -3);
    }
    if (token.endsWith('ed')) {
      return token.slice(0, -2);
    }
    if (token.endsWith('es')) {
      return token.slice(0, -2);
    }
    if (token.endsWith('s') && token.length > 3) {
      return token.slice(0, -1);
    }

    return token;
  }

  getStopWords(): string[] {
    return Array.from(ENGLISH_STOP_WORDS);
  }

  isStopWord(token: string): boolean {
    const normalized = this._config.caseSensitive ? token : token.toLowerCase();
    return ENGLISH_STOP_WORDS.has(normalized);
  }

  getTokenCount(text: string): number {
    return this.tokenize(text).length;
  }

  getUniqueTokens(text: string): string[] {
    return [...new Set(this.tokenize(text))];
  }

  getSnapshot(): { metrics: Record<string, number | boolean> } {
    return {
      metrics: {
        stopWordCount: ENGLISH_STOP_WORDS.size,
        caseSensitive: this._config.caseSensitive,
        removeStopWords: this._config.removeStopWords,
        enableStemming: this._config.enableStemming,
        minTokenLength: this._config.minTokenLength,
      },
    };
  }

  reset(): void {
    // No mutable state to reset
  }

  getReport(): string {
    return [
      '=== Tokenizer Report ===',
      `Stop words: ${ENGLISH_STOP_WORDS.size}`,
      `Case sensitive: ${this._config.caseSensitive}`,
      `Remove stop words: ${this._config.removeStopWords}`,
      `Stemming enabled: ${this._config.enableStemming}`,
      `Min token length: ${this._config.minTokenLength}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V61-Tokenizer',
    };
  }
}