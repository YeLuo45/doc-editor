// Plugin Manager - Handles plugin lifecycle (install, uninstall, mount, unmount)

import { Plugin, PluginContext, ExtensionAPI, Logger, StorageAPI, UIAPI, EditorAPI } from './types';
import { pluginRegistry } from './PluginRegistry';

class SimpleLogger implements Logger {
  log(msg: string): void {
    console.log(`[Plugin] ${msg}`);
  }
  error(msg: string): void {
    console.error(`[Plugin] ${msg}`);
  }
}

class SimpleStorage implements StorageAPI {
  private store: Map<string, any> = new Map();

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
  }
}

class SimpleUI implements UIAPI {
  showNotification(message: string): void {
    // Simple notification via console - can be enhanced with UI integration
    console.log(`[Notification] ${message}`);
  }
}

class SimpleEditor implements EditorAPI {
  private editor: any = null;
  private contentChangeCallbacks: Set<() => void> = new Set();

  setEditor(editor: any): void {
    this.editor = editor;
  }

  insertText(text: string): void {
    if (this.editor) {
      this.editor.commands.insertContent(text);
    }
  }

  getContent(): string {
    if (this.editor) {
      return this.editor.getHTML();
    }
    return '';
  }

  registerTool(tool: any): void {
    // Tool registration via the tool registry
    if (typeof tool === 'object' && tool.name) {
      console.log(`[Plugin] Registering tool: ${tool.name}`);
    }
  }

  onContentChange(callback: () => void): () => void {
    this.contentChangeCallbacks.add(callback);
    return () => {
      this.contentChangeCallbacks.delete(callback);
    };
  }

  notifyContentChange(): void {
    this.contentChangeCallbacks.forEach(cb => cb());
  }
}

// Global editor reference for plugins
let globalEditor: any = null;
const globalLogger = new SimpleLogger();
const globalStorage = new SimpleStorage();
const globalUI = new SimpleUI();
const globalEditorAPI = new SimpleEditor();

export function setGlobalEditor(editor: any): void {
  globalEditor = editor;
  globalEditorAPI.setEditor(editor);
}

export function getExtensionAPI(): ExtensionAPI {
  return {
    editor: globalEditorAPI,
    ui: globalUI,
    storage: globalStorage,
  };
}

export class PluginManager {
  private activePlugins: Set<string> = new Set();
  private installedPlugins: Set<string> = new Set();

  /**
   * Install a plugin (calls onInstall, adds to registry)
   */
  install(plugin: Plugin): void {
    if (this.installedPlugins.has(plugin.id)) {
      console.warn(`Plugin '${plugin.id}' is already installed`);
      return;
    }

    // Register in registry
    pluginRegistry.register(plugin);

    // Create context
    const ctx: PluginContext = {
      api: getExtensionAPI(),
      logger: globalLogger,
    };

    // Call onInstall if defined
    if (plugin.onInstall) {
      plugin.onInstall(ctx);
    }

    this.installedPlugins.add(plugin.id);
  }

  /**
   * Uninstall a plugin (calls onUninstall, removes from registry)
   */
  uninstall(pluginId: string): void {
    if (!this.installedPlugins.has(pluginId)) {
      console.warn(`Plugin '${pluginId}' is not installed`);
      return;
    }

    // Unmount if active
    if (this.isActive(pluginId)) {
      this.unmount(pluginId);
    }

    const plugin = pluginRegistry.get(pluginId);
    if (plugin && plugin.onUninstall) {
      plugin.onUninstall();
    }

    pluginRegistry.unregister(pluginId);
    this.installedPlugins.delete(pluginId);
  }

  /**
   * Mount a plugin (calls onMount, marks as active)
   */
  mount(pluginId: string): void {
    const plugin = pluginRegistry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found in registry`);
    }

    if (this.isActive(pluginId)) {
      console.warn(`Plugin '${pluginId}' is already active`);
      return;
    }

    const ctx: PluginContext = {
      api: getExtensionAPI(),
      logger: globalLogger,
    };

    if (plugin.onMount) {
      plugin.onMount(ctx);
    }

    this.activePlugins.add(pluginId);
  }

  /**
   * Unmount a plugin (calls onUnmount, marks as inactive)
   */
  unmount(pluginId: string): void {
    const plugin = pluginRegistry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' not found in registry`);
    }

    if (!this.isActive(pluginId)) {
      console.warn(`Plugin '${pluginId}' is not active`);
      return;
    }

    if (plugin.onUnmount) {
      plugin.onUnmount();
    }

    this.activePlugins.delete(pluginId);
  }

  /**
   * Get all active plugins
   */
  getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins)
      .map(id => pluginRegistry.get(id))
      .filter((p): p is Plugin => p !== undefined);
  }

  /**
   * Check if a plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    return this.installedPlugins.has(pluginId);
  }

  /**
   * Check if a plugin is active
   */
  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }
}

// Singleton instance
export const pluginManager = new PluginManager();
