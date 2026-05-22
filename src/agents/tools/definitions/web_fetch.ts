// Web Fetch Tool - Fetch content from a URL

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface FetchResult {
  title: string;
  content: string;
  url: string;
  status?: number;
}

export class WebFetchTool implements BaseTool {
  name = 'web_fetch';
  description = 'Fetch and extract content from a URL';
  agentTypes = [AgentType.RESEARCHER];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { url } = args as { url: string };
      if (!url) {
        return { success: false, output: '', error: 'URL is required' };
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return { success: false, output: '', error: 'Invalid URL format' };
      }

      // Simulated fetch result - in production would make actual HTTP request
      const result: FetchResult = {
        title: `Content from ${new URL(url).hostname}`,
        content: `This is simulated content fetched from ${url}. In production, this would return the actual page content.`,
        url,
        status: 200,
      };

      return { success: true, output: JSON.stringify(result) };
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
        url: { type: 'string', required: true, description: 'The URL to fetch content from' },
      },
      agentType: this.agentTypes,
    };
  }
}
