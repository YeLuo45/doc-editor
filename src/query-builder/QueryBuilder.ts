export type QueryConfig = {
  table?: string;
  fields?: string[];
  conditions?: Record<string, unknown>;
  orderBy?: string[];
  limit?: number;
  offset?: number;
};

export type QuerySnapshot = {
  query: string;
  params: unknown[];
  timestamp: number;
  metrics: {
    buildCount: number;
    resetCount: number;
  };
};

export class QueryBuilder {
  config: QueryConfig;
  private query: string;
  private params: unknown[];
  private buildCount: number;
  private resetCount: number;

  constructor(config: QueryConfig = {}) {
    this.config = config;
    this.query = '';
    this.params = [];
    this.buildCount = 0;
    this.resetCount = 0;
  }

  build(): string {
    this.buildCount++;
    const { table, fields = ['*'], conditions = {}, orderBy = [], limit, offset } = this.config;

    if (!table) {
      this.query = '';
      this.params = [];
      return '';
    }

    const fieldStr = fields.join(', ');
    this.query = `SELECT ${fieldStr} FROM ${table}`;

    const conditionKeys = Object.keys(conditions);
    if (conditionKeys.length > 0) {
      const whereClauses = conditionKeys.map((key, i) => {
        this.params.push(conditions[key]);
        return `${key} = $${i + 1}`;
      });
      this.query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (orderBy.length > 0) {
      this.query += ` ORDER BY ${orderBy.join(', ')}`;
    }

    if (limit !== undefined) {
      this.query += ` LIMIT ${limit}`;
    }

    if (offset !== undefined) {
      this.query += ` OFFSET ${offset}`;
    }

    return this.query;
  }

  reset(): void {
    this.resetCount++;
    this.query = '';
    this.params = [];
    this.config = {};
  }

  getQuery(): string {
    return this.query;
  }

  getParams(): unknown[] {
    return [...this.params];
  }

  getSnapshot(): { metrics: QuerySnapshot } {
    return {
      metrics: {
        query: this.query,
        params: [...this.params],
        timestamp: Date.now(),
        metrics: {
          buildCount: this.buildCount,
          resetCount: this.resetCount,
        },
      },
    };
  }

  getReport(): string {
    return JSON.stringify({
      query: this.query,
      params: this.params,
      buildCount: this.buildCount,
      resetCount: this.resetCount,
      config: this.config,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V91-QueryBuilder-1.0.0',
    };
  }
}