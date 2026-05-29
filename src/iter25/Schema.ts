export type SchemaConfig = { name?: string };
export type SchemaSnapshot = { name: string; fields: number };
export type SchemaMetrics = { version: string };

export class Schema {
  config: SchemaConfig;
  readonly name: string;
  private fields: Map<string, string> = new Map();

  constructor(name: string, config: SchemaConfig = {}) {
    this.name = name;
    this.config = config;
  }

  addField(name: string, type: string): void { this.fields.set(name, type); }
  removeField(name: string): void { this.fields.delete(name); }
  getFieldType(name: string): string | undefined { return this.fields.get(name); }
  getFields(): Record<string, string> { return Object.fromEntries(this.fields); }
  getSnapshot(): SchemaSnapshot { return { name: this.name, fields: this.fields.size }; }
  reset(): void { this.fields.clear(); }
  getReport(): string { return `Schema[${this.name}, fields=${this.fields.size}]`; }
  exportMetrics(): SchemaMetrics { return { version: 'V55-I25' }; }
}
