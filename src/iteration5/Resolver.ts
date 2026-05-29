/**
 * Resolver.ts - V35 Iteration 5
 * URL resolver with resolve/parse/getResolved capabilities
 */

export interface ResolvedUrl {
  protocol?: string;
  host?: string;
  port?: string;
  pathname?: string;
  query?: Record<string, string>;
  fragment?: string;
  original: string;
}

export interface ResolverSnapshot {
  resolved: string[];
  count: number;
  metrics: {
    totalResolutions: number;
    parseOperations: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

export class Resolver {
  private cache: Map<string, ResolvedUrl> = new Map();
  private resolutions: number = 0;
  private parseOperations: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor() {
    this.cache = new Map();
    this.resolutions = 0;
    this.parseOperations = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Resolve a URL string into components
   */
  resolve(url: string): ResolvedUrl | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Check cache first
    const cached = this.cache.get(url);
    if (cached) {
      this.cacheHits++;
      this.resolutions++;
      return { ...cached };
    }

    // Parse the URL
    const resolved = this.parse(url);
    if (resolved) {
      this.cache.set(url, resolved);
      this.cacheMisses++;
    }

    this.resolutions++;
    return resolved;
  }

  /**
   * Parse a URL string into components
   */
  parse(url: string): ResolvedUrl | null {
    if (!url || typeof url !== 'string') {
      this.parseOperations++;
      return null;
    }

    this.parseOperations++;

    const result: ResolvedUrl = { original: url };

    try {
      // Simple URL parsing without URL constructor
      const protocolMatch = url.match(/^([a-zA-Z]+):\/\//);
      if (protocolMatch) {
        result.protocol = protocolMatch[1];
        url = url.slice(protocolMatch[0].length);
      }

      // Extract host and port
      const hostMatch = url.match(/^([^\/:]+)(?::(\d+))?(?:\/|$)/);
      if (hostMatch) {
        result.host = hostMatch[1];
        if (hostMatch[2]) {
          result.port = hostMatch[2];
        }
        url = url.slice(hostMatch[0].length);
      }

      // Extract query string
      const queryMatch = url.match(/\?([^#]+)/);
      if (queryMatch) {
        result.query = this.parseQueryString(queryMatch[1]);
        url = url.slice(0, url.indexOf('?'));
      }

      // Extract fragment
      const fragmentMatch = url.match(/#(.+)$/);
      if (fragmentMatch) {
        result.fragment = fragmentMatch[1];
        url = url.replace(/#.+$/, '');
      }

      // Remaining is pathname
      if (url) {
        result.pathname = '/' + url.replace(/^\/+/, '');
      }
    } catch {
      return null;
    }

    return result;
  }

  /**
   * Get all resolved URLs from cache
   */
  getResolved(): ResolvedUrl[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get snapshot of current resolver state
   */
  getSnapshot(): ResolverSnapshot {
    return {
      resolved: Array.from(this.cache.keys()),
      count: this.cache.size,
      metrics: {
        totalResolutions: this.resolutions,
        parseOperations: this.parseOperations,
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
      },
    };
  }

  /**
   * Reset all cached URLs and metrics
   */
  reset(): void {
    this.cache.clear();
    this.resolutions = 0;
    this.parseOperations = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Resolver Report ===',
      `Cached URLs: ${snapshot.count}`,
      `Total Resolutions: ${snapshot.metrics.totalResolutions}`,
      `Parse Operations: ${snapshot.metrics.parseOperations}`,
      `Cache Hits: ${snapshot.metrics.cacheHits}`,
      `Cache Misses: ${snapshot.metrics.cacheMisses}`,
      '',
      'Cached URLs:',
    ];

    if (snapshot.resolved.length === 0) {
      lines.push('  (none)');
    } else {
      snapshot.resolved.forEach(url => {
        lines.push(`  - ${url}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as a plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snapshot = this.getSnapshot();
    return {
      cachedUrls: snapshot.count,
      totalResolutions: snapshot.metrics.totalResolutions,
      parseOperations: snapshot.metrics.parseOperations,
      cacheHits: snapshot.metrics.cacheHits,
      cacheMisses: snapshot.metrics.cacheMisses,
    };
  }

  private parseQueryString(query: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (!query) return params;

    query.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });

    return params;
  }
}

export default Resolver;