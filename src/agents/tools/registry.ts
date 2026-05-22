// Tool Registry - Plugin-style tool discovery and execution system
// Based on nanobot ToolRegistry pattern

import { AgentType, ToolDefinition, ToolResult } from '../../types/agent';

export interface BaseTool {
  name: string;
  description: string;
  agentTypes: AgentType[];
  execute(args: Record<string, unknown>): Promise<ToolResult>;
  getDefinition(): ToolDefinition;
}

export interface ToolMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;
}

class ToolRegistryImpl {
  private tools: Map<string, BaseTool>;
  private metadata: Map<string, ToolMetadata>;
  private static instance: ToolRegistryImpl;

  private constructor() {
    this.tools = new Map();
    this.metadata = new Map();
  }

  static getInstance(): ToolRegistryImpl {
    if (!ToolRegistryImpl.instance) {
      ToolRegistryImpl.instance = new ToolRegistryImpl();
    }
    return ToolRegistryImpl.instance;
  }

  /**
   * Register a new tool
   */
  register(tool: BaseTool, metadata?: ToolMetadata): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
    if (metadata) {
      this.metadata.set(tool.name, metadata);
    }
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    this.metadata.delete(name);
    return existed;
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool definitions for a specific agent type
   */
  getToolsForAgent(agentType: AgentType): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter((tool) => tool.agentTypes.includes(agentType))
      .map((tool) => tool.getDefinition());
  }

  /**
   * Get all tool definitions
   */
  getAllToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Tool '${name}' not found` };
    }
    try {
      return await tool.execute(args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, output: '', error: message };
    }
  }

  /**
   * Discover and load all built-in tools
   */
  discoverTools(): void {
    // Import all built-in tools
    import('./definitions/text_format')
      .then((m) => this.register(new m.TextFormatTool()))
      .catch((e) => console.error('Failed to load text_format tool:', e));

    import('./definitions/grammar_check')
      .then((m) => this.register(new m.GrammarCheckTool()))
      .catch((e) => console.error('Failed to load grammar_check tool:', e));

    import('./definitions/style_suggest')
      .then((m) => this.register(new m.StyleSuggestTool()))
      .catch((e) => console.error('Failed to load style_suggest tool:', e));

    import('./definitions/web_search')
      .then((m) => this.register(new m.WebSearchTool()))
      .catch((e) => console.error('Failed to load web_search tool:', e));

    import('./definitions/web_fetch')
      .then((m) => this.register(new m.WebFetchTool()))
      .catch((e) => console.error('Failed to load web_fetch tool:', e));

    import('./definitions/citation_insert')
      .then((m) => this.register(new m.CitationInsertTool()))
      .catch((e) => console.error('Failed to load citation_insert tool:', e));

    import('./definitions/doc_export')
      .then((m) => this.register(new m.DocExportTool()))
      .catch((e) => console.error('Failed to load doc_export tool:', e));

    import('./definitions/spell_check')
      .then((m) => this.register(new m.SpellCheckTool()))
      .catch((e) => console.error('Failed to load spell_check tool:', e));

    import('./definitions/content_summary')
      .then((m) => this.register(new m.ContentSummaryTool()))
      .catch((e) => console.error('Failed to load content_summary tool:', e));
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(name: string): ToolMetadata | undefined {
    return this.metadata.get(name);
  }
}

// Singleton instance
export const toolRegistry = ToolRegistryImpl.getInstance();

// Auto-discover tools on load
toolRegistry.discoverTools();

export { ToolRegistryImpl };
