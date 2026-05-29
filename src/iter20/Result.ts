/**
 * V50 Iteration 20 - Result Module
 */

export type ResultConfig = { success?: boolean };
export type ResultSnapshot = { success: boolean; data?: string };
export type ResultMetrics = { version: string };

export class Result {
  config: ResultConfig;
  private success: boolean;
  private data?: string;

  constructor(success: boolean, data?: string, config: ResultConfig = {}) {
    this.success = success;
    this.data = data;
    this.config = config;
  }

  isSuccess(): boolean { return this.success; }
  getData(): string | undefined { return this.data; }
  getSnapshot(): ResultSnapshot { return { success: this.success, data: this.data }; }
  reset(): void { this.success = false; this.data = undefined; }
  getReport(): string { return `Result[success=${this.success}]`; }
  exportMetrics(): ResultMetrics { return { version: 'V50-I20' }; }
}
