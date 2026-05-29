export type ExtensionConfig = { priority?: number };
export type ExtensionSnapshot = { id: string; loaded: boolean };
export type ExtensionMetrics = { version: string };

export class Extension {
  config: ExtensionConfig;
  readonly id: string;
  private loaded = false;

  constructor(id: string, config: ExtensionConfig = {}) {
    this.id = id;
    this.config = config;
  }

  load(): void { this.loaded = true; }
  unload(): void { this.loaded = false; }
  isLoaded(): boolean { return this.loaded; }
  getSnapshot(): ExtensionSnapshot { return { id: this.id, loaded: this.loaded }; }
  reset(): void { this.loaded = false; }
  getReport(): string { return `Extension[${this.id}, loaded=${this.loaded}]`; }
  exportMetrics(): ExtensionMetrics { return { version: 'V56-I26' }; }
}
