// Plugin System Types

export interface Logger {
  log(msg: string): void;
  error(msg: string): void;
}

export interface StorageAPI {
  get(key: string): any;
  set(key: string, value: any): void;
}

export interface UIAPI {
  showNotification(message: string): void;
}

export interface EditorAPI {
  insertText(text: string): void;
  getContent(): string;
  registerTool(tool: any): void;
  onContentChange(callback: () => void): () => void;
}

export interface ExtensionAPI {
  editor: EditorAPI;
  ui: UIAPI;
  storage: StorageAPI;
}

export interface PluginContext {
  api: ExtensionAPI;
  logger: Logger;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  onInstall?(ctx: PluginContext): void;
  onUninstall?(): void;
  onMount(ctx: PluginContext): void;
  onUnmount?(): void;
}
