// Grammar Check Tool - Check grammar and spelling errors

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface GrammarIssue {
  type: string;
  message: string;
  position?: number;
  count?: number;
}

export class GrammarCheckTool implements BaseTool {
  name = 'grammar_check';
  description = 'Check grammar and spelling errors in text content';
  agentTypes = [AgentType.REVIEWER];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { content } = args as { content: string };
      if (!content) {
        return { success: false, output: '', error: 'Content is required' };
      }

      const issues: GrammarIssue[] = [];
      const text = content.replace(/<[^>]+>/g, ' ');

      // Check for double spaces
      const doubleSpaces = text.match(/\s{2,}/g);
      if (doubleSpaces) {
        issues.push({
          type: 'whitespace',
          message: `Found ${doubleSpaces.length} instance(s) of multiple consecutive spaces`,
          count: doubleSpaces.length,
        });
      }

      // Check for sentences without ending punctuation
      const sentences = text.split(/[.!?]+/);
      sentences.forEach((sentence, i) => {
        const trimmed = sentence.trim();
        if (trimmed.length > 10 && !/[。？！.!?]$/.test(trimmed)) {
          issues.push({
            type: 'punctuation',
            message: `Sentence ${i + 1} may be missing ending punctuation`,
            position: i,
          });
        }
      });

      // Check for common grammar issues
      const grammarPatterns = [
        { pattern: /\bi\b/g, message: 'Capitalize "I" when referring to yourself' },
        { pattern: /\btheir\s+is\b/gi, message: 'Use "there\'s" instead of "their is"' },
        { pattern: /\byour\s+is\b/gi, message: 'Use "you\'re" instead of "your is"' },
        { pattern: /\bits\s+a\b/gi, message: 'Use "it\'s" instead of "its" when meaning "it is"' },
      ];

      grammarPatterns.forEach(({ pattern, message }) => {
        const match = text.match(pattern);
        if (match) {
          issues.push({ type: 'grammar', message, count: match.length });
        }
      });

      const score = Math.max(0, 1 - issues.length * 0.1);

      return {
        success: true,
        output: JSON.stringify({ issues, score, checked: true }),
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
        content: { type: 'string', required: true, description: 'The content to check' },
      },
      agentType: this.agentTypes,
    };
  }
}
