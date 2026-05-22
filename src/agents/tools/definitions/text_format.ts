// Text Format Tool - Format and clean up text content

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

export class TextFormatTool implements BaseTool {
  name = 'text_format';
  description = 'Format and clean up text content, normalize whitespace, fix HTML structure';
  agentTypes = [AgentType.EDITOR];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { content } = args as { content: string };
      if (!content) {
        return { success: false, output: '', error: 'Content is required' };
      }

      // Normalize whitespace and clean HTML
      let formatted = content
        .replace(/<p><\/p>/g, '')
        .replace(/<br\s*\/>/gi, '\n')
        .replace(/\r\n/g, '\n')
        .replace(/\t/g, '  ')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return { success: true, output: formatted };
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
        content: { type: 'string', required: true, description: 'The content to format' },
      },
      agentType: this.agentTypes,
    };
  }
}
