// Plugin System Errors

export class PluginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PluginError';
  }
}

export class PluginLoadError extends PluginError {
  constructor(message: string) {
    super(message);
    this.name = 'PluginLoadError';
  }
}

export class PluginNotFoundError extends PluginError {
  constructor(message: string) {
    super(message);
    this.name = 'PluginNotFoundError';
  }
}
