// Document Export Tool - Export document to various formats

import { AgentType, ToolDefinition, ToolResult } from '../../../types/agent';
import { BaseTool } from '../registry';

type ExportFormat = 'html' | 'markdown' | 'plain' | 'json';

interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
}

export class DocExportTool implements BaseTool {
  name = 'doc_export';
  description = 'Export document to various formats (HTML, Markdown, Plain text, JSON)';
  agentTypes = [AgentType.EDITOR];

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const { content, format = 'html', includeMetadata = false } = args as {
        content: string;
        format?: ExportFormat;
        includeMetadata?: boolean;
      };

      if (!content) {
        return { success: false, output: '', error: 'Content is required' };
      }

      let exported: string;
      const metadata = includeMetadata
        ? { exportedAt: new Date().toISOString(), format, version: '1.0' }
        : null;

      switch (format) {
        case 'markdown':
          exported = this.toMarkdown(content);
          break;
        case 'plain':
          exported = this.toPlainText(content);
          break;
        case 'json':
          exported = JSON.stringify({ content, ...(metadata && { metadata }) }, null, 2);
          break;
        case 'html':
        default:
          exported = content;
      }

      return { success: true, output: exported };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, output: '', error: message };
    }
  }

  private toMarkdown(html: string): string {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  private toPlainText(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        content: { type: 'string', required: true, description: 'The document content to export' },
        format: {
          type: 'string',
          required: false,
          enum: ['html', 'markdown', 'plain', 'json'],
          default: 'html',
          description: 'The export format',
        },
        includeMetadata: {
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include metadata in export',
        },
      },
      agentType: this.agentTypes,
    };
  }
}
