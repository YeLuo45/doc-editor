/**
 * MCPToolRegistry - Tool Registry for MCP Tools
 * Supports dynamic registration/discovery/versioning
 */

import type { MCPTool, ToolFilter, ToolVersion } from './types.js';
import { STORAGE_PREFIX } from './types.js';

const STORAGE_KEY = `${STORAGE_PREFIX}tools`;

interface ToolStore {
  [id: string]: MCPTool;
}

interface VersionHistory {
  [version: string]: MCPTool;
}

interface ToolVersions {
  current: MCPTool;
  history: VersionHistory;
}

export class MCPToolRegistry {
  private tools: ToolStore = {};
  private versions: Map<string, ToolVersions> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load tools from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ToolStore;
        this.tools = parsed;
        this.initialized = true;
        // Rebuild version index
        for (const tool of Object.values(this.tools)) {
          this.versions.set(tool.id, {
            current: tool,
            history: { [tool.version]: tool },
          });
        }
      }
    } catch {
      this.tools = {};
      this.initialized = false;
    }
  }

  /**
   * Save tools to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tools));
  }

  /**
   * Register a new tool
   */
  register(tool: MCPTool): void {
    if (!tool.id || !tool.name || !tool.version) {
      throw new Error('Tool must have id, name, and version');
    }
    this.tools[tool.id] = tool;

    const versionEntry = this.versions.get(tool.id) || { current: tool, history: {} };
    versionEntry.history[tool.version] = tool;
    versionEntry.current = tool;
    this.versions.set(tool.id, versionEntry);

    this.initialized = true;
    this.saveToStorage();
  }

  /**
   * Register tool with auto-generated ID
   */
  registerWithId(name: string, description: string, version: string, inputSchema: Record<string, unknown>, handler: unknown, metadata?: Record<string, string>): void {
    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${version}`;
    const tool: MCPTool = {
      id,
      name,
      description,
      version,
      inputSchema,
      handler,
      metadata,
    };
    this.register(tool);
  }

  /**
   * Get tool by ID (always returns current version)
   */
  get(id: string): MCPTool | undefined {
    return this.tools[id];
  }

  /**
   * Get specific version of a tool
   */
  getVersion(id: string, version: string): MCPTool | undefined {
    const versions = this.versions.get(id);
    if (!versions) {
      return undefined;
    }
    return versions.history[version];
  }

  /**
   * Get all versions of a tool
   */
  getAllVersions(id: string): ToolVersion[] {
    const versions = this.versions.get(id);
    if (!versions) {
      return [];
    }
    return Object.entries(versions.history).map(([v, tool]) => ({
      version: v,
      tool,
      deprecated: tool.metadata?.deprecated === 'true',
    }));
  }

  /**
   * Get current version of a tool
   */
  getCurrentVersion(id: string): string | undefined {
    return this.tools[id]?.version;
  }

  /**
   * Get all tools
   */
  getAll(): MCPTool[] {
    return Object.values(this.tools);
  }

  /**
   * Find tools by filter
   */
  find(filter: ToolFilter): MCPTool[] {
    let results = Object.values(this.tools);

    if (filter.name) {
      const nameLower = filter.name.toLowerCase();
      results = results.filter(t => t.name.toLowerCase().includes(nameLower));
    }

    if (filter.version) {
      results = results.filter(t => t.version === filter.version);
    }

    return results;
  }

  /**
   * Update existing tool (creates new version)
   */
  update(id: string, updates: Partial<MCPTool>): boolean {
    const existing = this.tools[id];
    if (!existing) {
      return false;
    }
    const newVersion = updates.version || this.bumpVersion(existing.version);
    const updatedTool: MCPTool = {
      ...existing,
      ...updates,
      id,
      version: newVersion,
    };
    this.register(updatedTool);
    return true;
  }

  /**
   * Bump version number
   */
  private bumpVersion(current: string): string {
    const parts = current.split('.');
    const major = parseInt(parts[0] || '0', 10);
    const minor = parseInt(parts[1] || '0', 10);
    const patch = parseInt(parts[2] || '0', 10);
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Deprecate a specific version
   */
  deprecateVersion(id: string, version: string): boolean {
    const tool = this.getVersion(id, version);
    if (!tool) {
      return false;
    }
    tool.metadata = tool.metadata || {};
    tool.metadata.deprecated = 'true';
    this.versions.set(id, {
      current: this.tools[id],
      history: { ...this.versions.get(id)!.history, [version]: tool },
    });
    this.saveToStorage();
    return true;
  }

  /**
   * Remove tool
   */
  remove(id: string): boolean {
    if (!(id in this.tools)) {
      return false;
    }
    delete this.tools[id];
    this.versions.delete(id);
    this.saveToStorage();
    return true;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools = {};
    this.versions.clear();
    this.initialized = true;
    this.saveToStorage();
  }

  /**
   * Get count of registered tools
   */
  count(): number {
    return Object.keys(this.tools).length;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if tool exists
   */
  has(id: string): boolean {
    return id in this.tools;
  }
}

// Singleton instance
let registryInstance: MCPToolRegistry | null = null;

export function getToolRegistry(): MCPToolRegistry {
  if (!registryInstance) {
    registryInstance = new MCPToolRegistry();
  }
  return registryInstance;
}

export function resetToolRegistry(): void {
  registryInstance = null;
}

export { STORAGE_KEY, STORAGE_PREFIX };