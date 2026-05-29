export type PluginConfig = { name?: string };
export type PluginSnapshot = { name: string; enabled: boolean };
export type PluginMetrics = { version: string };

export class Plugin {
  config: PluginConfig;
  readonly name: string;
  private enabled = false;

  constructor(name: string, config: PluginConfig = {}) {
    this.name = name;
    this.config = config;
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isEnabled(): boolean { return this.enabled; }
  getSnapshot(): PluginSnapshot { return { name: this.name, enabled: this.enabled }; }
  reset(): void { this.enabled = false; }
  getReport(): string { return `Plugin[${this.name}, enabled=${this.enabled}]`; }
  exportMetrics(): PluginMetrics { return { version: 'V56-I26' }; }
}
