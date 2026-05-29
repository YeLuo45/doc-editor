export type RequestConfig = { timeout?: number };
export type RequestSnapshot = { method: string; url: string };
export type RequestMetrics = { version: string };

export class Request {
  config: RequestConfig;
  readonly method: string;
  readonly url: string;
  private headers: Map<string, string> = new Map();

  constructor(method: string, url: string, config: RequestConfig = {}) {
    this.method = method;
    this.url = url;
    this.config = config;
  }

  setHeader(key: string, value: string): void { this.headers.set(key, value); }
  getHeader(key: string): string | undefined { return this.headers.get(key); }
  getHeaders(): Record<string, string> { return Object.fromEntries(this.headers); }
  getSnapshot(): RequestSnapshot { return { method: this.method, url: this.url }; }
  reset(): void { this.headers.clear(); }
  getReport(): string { return `Request[${this.method} ${this.url}]`; }
  exportMetrics(): RequestMetrics { return { version: 'V53-I23' }; }
}