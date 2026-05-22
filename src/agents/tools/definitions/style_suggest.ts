// Style Suggest Tool - Suggest writing style improvements

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface StyleSuggestion {
  type: string;
  message: string;
  original?: string;
  suggestion?: string;
}

export class StyleSuggestTool implements BaseTool {
  name = 'style_suggest';
  description = 'Suggest writing style improvements for better readability';
  agentTypes = [AgentType.REVIEWER];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { content } = args as { content: string };
      if (!content) {
        return { success: false, output: '', error: 'Content is required' };
      }

      const suggestions: StyleSuggestion[] = [];
      const text = content.replace(/<[^>]+>/g, ' ');

      // Check paragraph length
      const paragraphs = text.split(/\n\n+/);
      paragraphs.forEach((p, i) => {
        const words = p.trim().split(/\s+/).filter(Boolean).length;
        if (words > 150) {
          suggestions.push({
            type: 'length',
            message: `Paragraph ${i + 1} is too long (${words} words). Consider breaking it up.`,
          });
        }
      });

      // Check for passive voice
      const passiveVoicePattern = /\b(was|were|been|being|be)\s+\w+ed\b/gi;
      const passiveMatches = text.match(passiveVoicePattern);
      if (passiveMatches && passiveMatches.length > 0) {
        suggestions.push({
          type: 'voice',
          message: `Found ${passiveMatches.length} instance(s) of passive voice. Consider using active voice.`,
        });
      }

      // Check sentence length variation
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
      const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const longSentences = sentenceLengths.filter((l) => l > avgLength * 2);
      if (longSentences.length > sentences.length * 0.3) {
        suggestions.push({
          type: 'variety',
          message: 'Consider varying sentence length for better readability.',
        });
      }

      const score = Math.max(0, 1 - suggestions.length * 0.15);

      return {
        success: true,
        output: JSON.stringify({ suggestions, score, checked: true }),
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
        content: { type: 'string', required: true, description: 'The content to analyze' },
      },
      agentType: this.agentTypes,
    };
  }
}
