export type ResponseConfig = { status?: number };
export type ResponseSnapshot = { status: number };
export type ResponseMetrics = { version: string };

export class Response {
  config: ResponseConfig;
  private status: number;
  private body = '';

  constructor(status = 200, config: ResponseConfig = {}) {
    this.status = status;
    this.config = config;
  }

  setBody(body: string): void { this.body = body; }
  getBody(): string { return this.body; }
  setStatus(status: number): void { this.status = status; }
  getStatus(): number { return this.status; }
  getSnapshot(): ResponseSnapshot { return { status: this.status }; }
  reset(): void { this.status = 200; this.body = ''; }
  getReport(): string { return `Response[status=${this.status}]`; }
  exportMetrics(): ResponseMetrics { return { version: 'V53-I23' }; }
}
