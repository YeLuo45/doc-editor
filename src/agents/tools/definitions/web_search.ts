// Web Search Tool - Search the web for information

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export class WebSearchTool implements BaseTool {
  name = 'web_search';
  description = 'Search the web for information on a given query';
  agentTypes = [AgentType.RESEARCHER];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { query, limit = 5 } = args as { query: string; limit?: number };
      if (!query) {
        return { success: false, output: '', error: 'Query is required' };
      }

      // Simulated search results - in production would call external API
      const results: SearchResult[] = [
        {
          title: `Search results for: ${query}`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          snippet: `This is a simulated search result for the query "${query}". In production, this would return real search results.`,
          source: 'example',
        },
        {
          title: `${query} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          snippet: `Learn about ${query} on Wikipedia.`,
          source: 'wikipedia',
        },
      ].slice(0, limit);

      return { success: true, output: JSON.stringify({ results, query }) };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, output: '', error: message };
    }
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        query: { type: 'string', required: true, description: 'The search query' },
        limit: { type: 'number', required: false, description: 'Maximum number of results', default: 5 },
      },
      agentType: this.agentTypes,
    };
  }
}
