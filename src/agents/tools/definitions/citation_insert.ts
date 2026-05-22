// Citation Insert Tool - Insert citations and references

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

interface Citation {
  id?: string;
  type: 'article' | 'book' | 'website' | 'journal';
  title: string;
  author?: string;
  year?: string;
  url?: string;
  publisher?: string;
  volume?: string;
  pages?: string;
}

export class CitationInsertTool implements BaseTool {
  name = 'citation_insert';
  description = 'Insert properly formatted citations and references';
  agentTypes = [AgentType.RESEARCHER];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { citation, format = 'plain' } = args as { citation: Citation; format?: string };
      if (!citation || !citation.title) {
        return { success: false, output: '', error: 'Citation object with title is required' };
      }

      let formattedCitation: string;

      switch (format) {
        case 'apa':
          formattedCitation = this.formatAPA(citation);
          break;
        case 'mla':
          formattedCitation = this.formatMLA(citation);
          break;
        case 'plain':
        default:
          formattedCitation = this.formatPlain(citation);
      }

      return { success: true, output: formattedCitation };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, output: '', error: message };
    }
  }

  private formatAPA(citation: Citation): string {
    const parts: string[] = [];
    if (citation.author) parts.push(citation.author);
    if (citation.year) parts.push(`(${citation.year})`);
    if (citation.title) parts.push(citation.title);
    if (citation.url) parts.push(`Retrieved from ${citation.url}`);
    return parts.join('. ') + '.';
  }

  private formatMLA(citation: Citation): string {
    const parts: string[] = [];
    if (citation.author) parts.push(citation.author);
    if (citation.title) parts.push(`"${citation.title}"`);
    if (citation.publisher) parts.push(citation.publisher);
    if (citation.year) parts.push(citation.year);
    return parts.join(', ') + '.';
  }

  private formatPlain(citation: Citation): string {
    const parts: string[] = [];
    if (citation.author) parts.push(citation.author);
    if (citation.year) parts.push(`(${citation.year})`);
    if (citation.title) parts.push(citation.title);
    if (citation.url) parts.push(citation.url);
    return parts.join('. ') || citation.title;
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        citation: {
          type: 'object',
          required: true,
          description: 'Citation object with title, author, year, etc.',
          properties: {
            title: { type: 'string', required: true },
            author: { type: 'string' },
            year: { type: 'string' },
            url: { type: 'string' },
            type: { type: 'string', enum: ['article', 'book', 'website', 'journal'] },
          },
        },
        format: {
          type: 'string',
          required: false,
          enum: ['apa', 'mla', 'plain'],
          default: 'plain',
        },
      },
      agentType: this.agentTypes,
    };
  }
}
