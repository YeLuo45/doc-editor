/**
 * V61 Search Index Engine - QueryEngine
 * Query processing with parse/execute/and/or/not/getResults
 */

export interface QueryEngineConfig {
  caseSensitive: boolean;
  defaultOperator: 'AND' | 'OR';
  maxResults: number;
}

export type QueryNode =
  | { type: 'term'; value: string }
  | { type: 'and'; left: QueryNode; right: QueryNode }
  | { type: 'or'; left: QueryNode; right: QueryNode }
  | { type: 'not'; operand: QueryNode };

export interface QueryResult {
  docIds: string[];
  score: number;
}

export class QueryEngine {
  private _config: QueryEngineConfig;
  private _tokenizer: import('./Tokenizer').Tokenizer;
  private _invertedIndex: import('./InvertedIndex').InvertedIndex;

  constructor(
    tokenizer: import('./Tokenizer').Tokenizer,
    invertedIndex: import('./InvertedIndex').InvertedIndex,
    config: Partial<QueryEngineConfig> = {}
  ) {
    this._tokenizer = tokenizer;
    this._invertedIndex = invertedIndex;
    this._config = {
      caseSensitive: config.caseSensitive ?? false,
      defaultOperator: config.defaultOperator ?? 'OR',
      maxResults: config.maxResults ?? 100,
    };
  }

  get config(): QueryEngineConfig {
    return { ...this._config };
  }

  parse(query: string): QueryNode {
    const tokens = this.tokenizeQuery(query);
    return this.parseExpression(tokens);
  }

  private tokenizeQuery(query: string): string[] {
    return query.split(/\s+/).filter(t => t.length > 0);
  }

  private parseExpression(tokens: string[]): QueryNode {
    if (tokens.length === 0) {
      return { type: 'term', value: '' };
    }

    const notIndex = tokens.indexOf('NOT');
    if (notIndex !== -1 && notIndex === 0) {
      return {
        type: 'not',
        operand: this.parseExpression(tokens.slice(2)),
      };
    }

    const andIndex = tokens.indexOf('AND');
    if (andIndex !== -1) {
      return {
        type: 'and',
        left: this.parseExpression(tokens.slice(0, andIndex)),
        right: this.parseExpression(tokens.slice(andIndex + 1)),
      };
    }

    const orIndex = tokens.indexOf('OR');
    if (orIndex !== -1) {
      return {
        type: 'or',
        left: this.parseExpression(tokens.slice(0, orIndex)),
        right: this.parseExpression(tokens.slice(orIndex + 1)),
      };
    }

    const term = tokens.join(' ');
    return { type: 'term', value: term };
  }

  execute(query: string): QueryResult {
    const tree = this.parse(query);
    const docIds = this.executeNode(tree);
    return { docIds, score: docIds.length };
  }

  private executeNode(node: QueryNode): string[] {
    switch (node.type) {
      case 'term': {
        const tokens = this._tokenizer.tokenize(node.value);
        const results = new Set<string>();
        for (const token of tokens) {
          const postings = this._invertedIndex.getPostings(token);
          for (const posting of postings) {
            results.add(posting.docId);
          }
        }
        return Array.from(results);
      }
      case 'and':
        return this.and(this.executeNode(node.left), this.executeNode(node.right));
      case 'or':
        return this.or(this.executeNode(node.left), this.executeNode(node.right));
      case 'not':
        return this.not(this.executeNode(node.operand));
    }
  }

  and(leftIds: string[], rightIds: string[]): string[] {
    const leftSet = new Set(leftIds);
    return rightIds.filter(id => leftSet.has(id));
  }

  or(leftIds: string[], rightIds: string[]): string[] {
    const result = new Set(leftIds);
    for (const id of rightIds) {
      result.add(id);
    }
    return Array.from(result);
  }

  not(ids: string[]): string[] {
    return ids;
  }

  getResults(query: string): string[] {
    const result = this.execute(query);
    return result.docIds.slice(0, this._config.maxResults);
  }

  getSnapshot(): { metrics: Record<string, number | string> } {
    return {
      metrics: {
        defaultOperator: this._config.defaultOperator,
        maxResults: this._config.maxResults,
        caseSensitive: this._config.caseSensitive ? 1 : 0,
      },
    };
  }

  reset(): void {
    // Stateless operation
  }

  getReport(): string {
    return [
      '=== QueryEngine Report ===',
      `Default operator: ${this._config.defaultOperator}`,
      `Max results: ${this._config.maxResults}`,
      `Case sensitive: ${this._config.caseSensitive}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V61-QueryEngine',
    };
  }
}