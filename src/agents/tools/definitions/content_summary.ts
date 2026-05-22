// Content Summary Tool - Generate a summary of content

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface SummaryOptions {
  maxLength?: number;
  format?: 'short' | 'detailed';
}

export class ContentSummaryTool implements BaseTool {
  name = 'content_summary';
  description = 'Generate a summary of the given content';
  agentTypes = [AgentType.RESEARCHER, AgentType.REVIEWER];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { content, maxLength = 200, format = 'short' } = args as {
        content: string;
        maxLength?: number;
        format?: 'short' | 'detailed';
      };

      if (!content) {
        return { success: false, output: '', error: 'Content is required' };
      }

      const text = content.replace(/<[^>]+>/g, ' ').trim();
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

      let summary: string;

      if (format === 'detailed') {
        // Generate a more detailed summary with key points
        const wordCount = text.split(/\s+/).length;
        const avgWordsPerSentence = Math.round(wordCount / sentences.length);

        summary = `Summary (${sentences.length} sentences, ~${wordCount} words):\n\n`;
        summary += sentences.slice(0, 3).map((s) => s.trim()).join('.\n\n');
        summary += `\n\n---\nDocument Statistics:\n`;
        summary += `- Total sentences: ${sentences.length}\n`;
        summary += `- Average words per sentence: ${avgWordsPerSentence}\n`;
        summary += `- Original word count: ${wordCount}`;
      } else {
        // Short summary - first few sentences
        const shortSentences = sentences.slice(0, 2);
        summary = shortSentences.map((s) => s.trim()).join('. ');

        if (summary.length > maxLength) {
          summary = summary.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
        }
      }

      return {
        success: true,
        output: JSON.stringify({
          summary,
          wordCount: text.split(/\s+/).length,
          sentenceCount: sentences.length,
        }),
      };
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
        content: { type: 'string', required: true, description: 'The content to summarize' },
        maxLength: { type: 'number', required: false, default: 200, description: 'Max summary length' },
        format: { type: 'string', required: false, enum: ['short', 'detailed'], default: 'short' },
      },
      agentType: this.agentTypes,
    };
  }
}
