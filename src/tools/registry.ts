// Tool Registry - Plugin-style tool discovery and execution system

import { ToolDefinition, ToolResult, AgentType } from '../agents/types';
import { v4 as uuidv4 } from 'uuid';

// Base tool interface
export interface BaseTool {
  name: string;
  description: string;
  agentTypes: AgentType[];
  execute(args: Record<string, any>): Promise<ToolResult>;
  getDefinition(): ToolDefinition;
}

// Built-in tool implementations
class ReadFileTool implements BaseTool {
  name = 'read_file';
  description = 'Read document content from storage';
  agentTypes = [AgentType.EDITOR, AgentType.RESEARCHER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { docId } = args;
      // Dynamic import to avoid circular dependency
      const { getDoc } = await import('../db');
      const doc = await getDoc(docId);
      if (!doc) {
        return { success: false, output: '', error: 'Document not found' };
      }
      return { success: true, output: JSON.stringify(doc) };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { docId: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class WriteFileTool implements BaseTool {
  name = 'write_file';
  description = 'Write content to document';
  agentTypes = [AgentType.EDITOR];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { docId, content, title } = args;
      const { getDoc, saveDoc } = await import('../db');
      const doc = await getDoc(docId);
      if (!doc) {
        return { success: false, output: '', error: 'Document not found' };
      }
      doc.content = content;
      if (title) doc.title = title;
      doc.updatedAt = Date.now();
      await saveDoc(doc);
      return { success: true, output: 'Document saved successfully' };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        docId: { type: 'string', required: true },
        content: { type: 'string', required: true },
        title: { type: 'string', required: false },
      },
      agentType: this.agentTypes,
    };
  }
}

class FormatDocTool implements BaseTool {
  name = 'format_doc';
  description = 'Format document content (cleanup HTML)';
  agentTypes = [AgentType.EDITOR];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { content } = args;
      // Simple HTML cleanup - remove empty tags, fix structure
      let formatted = content
        .replace(/<p><\/p>/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return { success: true, output: formatted };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { content: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class GrammarCheckTool implements BaseTool {
  name = 'grammar_check';
  description = 'Check grammar and spelling in text';
  agentTypes = [AgentType.REVIEWER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { content } = args;
      // Simple grammar check - detect common issues
      const issues: string[] = [];
      const text = content.replace(/<[^>]+>/g, ' ');

      // Check for double spaces
      if (text.match(/\s{2,}/)) {
        issues.push('Double spaces detected');
      }

      // Check for sentence ending punctuation
      const sentences = text.split(/[.!?]+/);
      sentences.forEach((sentence, i) => {
        if (sentence.trim().length > 0 && i < sentences.length - 1) {
          const trimmed = sentence.trim();
          if (!/[。？！.!?"']$/.test(trimmed)) {
            issues.push(`Sentence ${i + 1} may be missing ending punctuation`);
          }
        }
      });

      return {
        success: true,
        output: JSON.stringify({ issues, score: issues.length === 0 ? 1 : 0.8 }),
      };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { content: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class StyleCheckTool implements BaseTool {
  name = 'style_check';
  description = 'Check writing style consistency';
  agentTypes = [AgentType.REVIEWER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { content } = args;
      const suggestions: string[] = [];
      const issues: string[] = [];
      const text = content.replace(/<[^>]+>/g, ' ');

      // Check for consistent paragraph length
      const paragraphs = text.split(/\n\n+/);
      paragraphs.forEach((p, i) => {
        const words = p.trim().split(/\s+/).length;
        if (words > 150) {
          suggestions.push(`Paragraph ${i + 1} is too long (${words} words). Consider splitting.`);
        }
      });

      // Check for passive voice (simple heuristic)
      if (text.match(/\b(was|were|been|being)\b.*\b(by)\b/i)) {
        suggestions.push('Consider using active voice instead of passive voice.');
      }

      return {
        success: true,
        output: JSON.stringify({ issues, suggestions, score: 0.9 }),
      };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { content: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class ConsistencyCheckTool implements BaseTool {
  name = 'consistency_check';
  description = 'Check content consistency';
  agentTypes = [AgentType.REVIEWER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { content } = args;
      const issues: string[] = [];
      const text = content.replace(/<[^>]+>/g, ' ');

      // Check for repeated words
      const words = text.toLowerCase().split(/\s+/);
      const wordCounts = new Map<string, number>();
      words.forEach((w) => {
        if (w.length > 3) {
          wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        }
      });

      // Find highly repeated words
      wordCounts.forEach((count, word) => {
        if (count > 10 && !['the', 'and', 'is', 'are', 'was', 'were'].includes(word)) {
          issues.push(`Word "${word}" appears ${count} times`);
        }
      });

      return {
        success: true,
        output: JSON.stringify({ issues, score: issues.length === 0 ? 1 : 0.85 }),
      };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { content: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class WebSearchTool implements BaseTool {
  name = 'web_search';
  description = 'Search the web for information';
  agentTypes = [AgentType.RESEARCHER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { query } = args;
      // Simulated search results (in real implementation, would call external API)
      const results = [
        { title: `Result for: ${query}`, url: `https://example.com/search?q=${encodeURIComponent(query)}`, snippet: 'Sample search result snippet...' }
      ];
      return { success: true, output: JSON.stringify(results) };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { query: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class WebFetchTool implements BaseTool {
  name = 'web_fetch';
  description = 'Fetch content from a URL';
  agentTypes = [AgentType.RESEARCHER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { url } = args;
      // Simulated fetch (in real implementation, would call external API)
      return {
        success: true,
        output: JSON.stringify({ title: 'Fetched Page', content: 'Fetched content from ' + url }),
      };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: { url: { type: 'string', required: true } },
      agentType: this.agentTypes,
    };
  }
}

class CiteReferenceTool implements BaseTool {
  name = 'cite_reference';
  description = 'Generate citation for a reference';
  agentTypes = [AgentType.RESEARCHER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { title, author, year, url } = args;
      const citation = `${author || 'Unknown'}, ${year || 'n.d.'}. ${title}. ${url || ''}`;
      return { success: true, output: citation };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        title: { type: 'string', required: true },
        author: { type: 'string', required: false },
        year: { type: 'string', required: false },
        url: { type: 'string', required: false },
      },
      agentType: this.agentTypes,
    };
  }
}

class OrchestratorTool implements BaseTool {
  name = 'orchestrator';
  description = 'Coordinate multi-agent workflow';
  agentTypes = [AgentType.MANAGER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { action, taskId, agents, conversationId } = args;
      // This is handled by Manager Agent - just return success
      return {
        success: true,
        output: JSON.stringify({ action, taskId, agents, conversationId }),
      };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        action: { type: 'string', required: true },
        taskId: { type: 'string', required: false },
        agents: { type: 'array', required: false },
        conversationId: { type: 'string', required: false },
      },
      agentType: this.agentTypes,
    };
  }
}

class StateMachineTool implements BaseTool {
  name = 'state_machine';
  description = 'Manage document state transitions';
  agentTypes = [AgentType.MANAGER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { currentState, event } = args;
      const transitions: Record<string, Record<string, string>> = {
        DRAFT: { submit: 'IN_REVIEW' },
        IN_REVIEW: { approve: 'REVISED', reject: 'REJECTED' },
        REVISED: { confirm: 'APPROVED', revise: 'DRAFT' },
        APPROVED: { publish: 'PUBLISHED' },
        REJECTED: { revise: 'DRAFT' },
      };

      const nextState = transitions[currentState]?.[event];
      if (!nextState) {
        return { success: false, output: '', error: `Invalid transition: ${currentState} + ${event}` };
      }

      return { success: true, output: JSON.stringify({ from: currentState, to: nextState, event }) };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        currentState: { type: 'string', required: true },
        event: { type: 'string', required: true },
      },
      agentType: this.agentTypes,
    };
  }
}

class RetryHandlerTool implements BaseTool {
  name = 'retry_handler';
  description = 'Handle retry logic for failed operations';
  agentTypes = [AgentType.MANAGER];

  async execute(args: Record<string, any>): Promise<ToolResult> {
    try {
      const { operation, maxRetries = 3 } = args;
      // Simulated retry logic
      return { success: true, output: JSON.stringify({ operation, maxRetries, attempted: true }) };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        operation: { type: 'string', required: true },
        maxRetries: { type: 'number', required: false },
      },
      agentType: this.agentTypes,
    };
  }
}

// Tool Registry
export class ToolRegistry {
  private tools: Map<string, BaseTool>;
  private static instance: ToolRegistry;

  private constructor() {
    this.tools = new Map();
    this.discover_tools();
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private discover_tools(): void {
    // Register built-in tools
    const builtInTools: BaseTool[] = [
      new ReadFileTool(),
      new WriteFileTool(),
      new FormatDocTool(),
      new GrammarCheckTool(),
      new StyleCheckTool(),
      new ConsistencyCheckTool(),
      new WebSearchTool(),
      new WebFetchTool(),
      new CiteReferenceTool(),
      new OrchestratorTool(),
      new StateMachineTool(),
      new RetryHandlerTool(),
    ];

    builtInTools.forEach((tool) => {
      this.register(tool);
    });
  }

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  async execute(name: string, args: Record<string, any>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, output: '', error: `Tool ${name} not found` };
    }
    return tool.execute(args);
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition());
  }

  getToolsForAgent(agentType: AgentType): ToolDefinition[] {
    return this.getDefinitions().filter((def) => def.agentType.includes(agentType));
  }

  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  listToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

export const toolRegistry = ToolRegistry.getInstance();