// Spell Check Tool - Check spelling in text

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface SpellIssue {
  word: string;
  suggestions?: string[];
  line?: number;
  column?: number;
}

export class SpellCheckTool implements BaseTool {
  name = 'spell_check';
  description = 'Check spelling errors in text content';
  agentTypes = [AgentType.REVIEWER];

  // Common misspelled words for demonstration
  private commonMisspellings: Record<string, string[]> = {
    'recieve': ['receive'],
    'occured': ['occurred'],
    'seperate': ['separate'],
    'definately': ['definitely'],
    'accomodate': ['accommodate'],
    'occurence': ['occurrence'],
    'untill': ['until'],
    'thier': ['their'],
    'wether': ['whether'],
    'alot': ['a lot'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { content, language = 'en' } = args as { content: string; language?: string };
      if (!content) {
        return { success: false, output: '', error: 'Content is required' };
      }

      const issues: SpellIssue[] = [];
      const text = content.replace(/<[^>]+>/g, ' ');
      const words = text.split(/\s+/);

      words.forEach((word, index) => {
        // Clean word of punctuation
        const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
        if (cleanWord.length < 2) return;

        if (this.commonMisspellings[cleanWord]) {
          issues.push({
            word: word,
            suggestions: this.commonMisspellings[cleanWord],
            line: 1,
            column: text.indexOf(word),
          });
        }
      });

      const score = issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.1);

      return {
        success: true,
        output: JSON.stringify({ issues, score, checked: true, wordCount: words.length }),
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
        content: { type: 'string', required: true, description: 'The content to check spelling' },
        language: { type: 'string', required: false, default: 'en', description: 'Language code' },
      },
      agentType: this.agentTypes,
    };
  }
}
