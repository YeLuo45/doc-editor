/**
 * MCPServer - MCP Server Main Class
 * Unified interface exposing Provider/Resource/Tool
 */

import { MCPProviderFactory, getProviderFactory } from './ProviderFactory.js';
import { MCPResourceRegistry, getResourceRegistry } from './ResourceRegistry.js';
import { MCPToolRegistry, getToolRegistry } from './ToolRegistry.js';
import type {
  AIProvider,
  AIProviderInterface,
  MCPServerConfig,
  MCPResource,
  MCPTool,
  ProviderConfig,
  ResourceFilter,
  ToolFilter,
} from './types.js';

export class MCPServer {
  private providerFactory: MCPProviderFactory;
  private resourceRegistry: MCPResourceRegistry;
  private toolRegistry: MCPToolRegistry;
  private initialized: boolean = false;

  constructor(
    providerFactory?: MCPProviderFactory,
    resourceRegistry?: MCPResourceRegistry,
    toolRegistry?: MCPToolRegistry
  ) {
    this.providerFactory = providerFactory || getProviderFactory();
    this.resourceRegistry = resourceRegistry || getResourceRegistry();
    this.toolRegistry = toolRegistry || getToolRegistry();
  }

  /**
   * Initialize server with config
   */
  init(config?: MCPServerConfig): void {
    if (config?.providers) {
      for (const providerConfig of config.providers) {
        this.providerFactory.register(providerConfig);
      }
    }
    if (config?.defaultProvider) {
      this.providerFactory.setCurrentProvider(config.defaultProvider);
    }
    this.initialized = true;
  }

  /**
   * Check if server is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // === Provider Methods ===

  /**
   * Register a provider
   */
  registerProvider(config: ProviderConfig): void {
    this.providerFactory.register(config);
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): AIProviderInterface | undefined {
    return this.providerFactory.getCurrentProvider();
  }

  /**
   * Get current provider key
   */
  getCurrentProviderKey(): AIProvider {
    return this.providerFactory.getCurrentProviderKey();
  }

  /**
   * Set active provider
   */
  setProvider(key: AIProvider): boolean {
    return this.providerFactory.setCurrentProvider(key);
  }

  /**
   * List all providers
   */
  listProviders(): AIProvider[] {
    return this.providerFactory.listProviders();
  }

  /**
   * Get provider by key
   */
  getProvider(key: AIProvider): AIProviderInterface | undefined {
    return this.providerFactory.getProvider(key);
  }

  // === Resource Methods ===

  /**
   * Register a resource
   */
  registerResource(resource: MCPResource): void {
    this.resourceRegistry.register(resource);
  }

  /**
   * Register multiple resources
   */
  registerResources(resources: MCPResource[]): void {
    this.resourceRegistry.registerBatch(resources);
  }

  /**
   * Get resource by ID
   */
  getResource(id: string): MCPResource | undefined {
    return this.resourceRegistry.get(id);
  }

  /**
   * Get all resources
   */
  getAllResources(): MCPResource[] {
    return this.resourceRegistry.getAll();
  }

  /**
   * Find resources
   */
  findResources(filter: ResourceFilter): MCPResource[] {
    return this.resourceRegistry.find(filter);
  }

  /**
   * Update resource
   */
  updateResource(id: string, updates: Partial<MCPResource>): boolean {
    return this.resourceRegistry.update(id, updates);
  }

  /**
   * Remove resource
   */
  removeResource(id: string): boolean {
    return this.resourceRegistry.remove(id);
  }

  // === Tool Methods ===

  /**
   * Register a tool
   */
  registerTool(tool: MCPTool): void {
    this.toolRegistry.register(tool);
  }

  /**
   * Get tool by ID
   */
  getTool(id: string): MCPTool | undefined {
    return this.toolRegistry.get(id);
  }

  /**
   * Get all tools
   */
  getAllTools(): MCPTool[] {
    return this.toolRegistry.getAll();
  }

  /**
   * Find tools
   */
  findTools(filter: ToolFilter): MCPTool[] {
    return this.toolRegistry.find(filter);
  }

  /**
   * Update tool
   */
  updateTool(id: string, updates: Partial<MCPTool>): boolean {
    return this.toolRegistry.update(id, updates);
  }

  /**
   * Remove tool
   */
  removeTool(id: string): boolean {
    return this.toolRegistry.remove(id);
  }

  /**
   * Get tool versions
   */
  getToolVersions(id: string) {
    return this.toolRegistry.getAllVersions(id);
  }

  // === Utility Methods ===

  /**
   * Get server status
   */
  getStatus(): {
    initialized: boolean;
    providerCount: number;
    resourceCount: number;
    toolCount: number;
    currentProvider: AIProvider | null;
  } {
    return {
      initialized: this.initialized,
      providerCount: this.providerFactory.listProviders().length,
      resourceCount: this.resourceRegistry.count(),
      toolCount: this.toolRegistry.count(),
      currentProvider: this.providerFactory.getCurrentProviderKey(),
    };
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.resourceRegistry.clear();
    this.toolRegistry.clear();
  }
}

// Singleton instance
let serverInstance: MCPServer | null = null;

export function getMCPServer(): MCPServer {
  if (!serverInstance) {
    serverInstance = new MCPServer();
  }
  return serverInstance;
}

export function resetMCPServer(): void {
  serverInstance = null;
}