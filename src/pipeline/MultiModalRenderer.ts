// ============================================================
// MultiModalRenderer - Renders content as text/markdown/HTML/SVG
// ============================================================

export type RenderFormat = 'text' | 'markdown' | 'html' | 'svg';
export type RenderMode = 'preview' | 'full' | 'compact';

export interface RenderOptions {
  format?: RenderFormat;
  mode?: RenderMode;
  includeStyles?: boolean;
  sanitize?: boolean;
  highlightCode?: boolean;
  renderMath?: boolean;
  renderDiagrams?: boolean;
  maxWidth?: number;
  theme?: 'light' | 'dark' | 'auto';
  metadata?: Record<string, unknown>;
}

export interface RenderResult {
  content: string;
  format: RenderFormat;
  metrics: {
    renderTime: number;
    wordCount: number;
    elementCount: number;
  };
  warnings: string[];
}

interface ContentToken {
  type: string;
  content: string;
  attributes?: Record<string, unknown>;
}

export class MultiModalRenderer {
  private options: RenderOptions;

  constructor(options: RenderOptions = {}) {
    this.options = {
      format: options.format ?? 'markdown',
      mode: options.mode ?? 'preview',
      includeStyles: options.includeStyles ?? true,
      sanitize: options.sanitize ?? true,
      highlightCode: options.highlightCode ?? true,
      renderMath: options.renderMath ?? true,
      renderDiagrams: options.renderDiagrams ?? true,
      maxWidth: options.maxWidth ?? 800,
      theme: options.theme ?? 'auto',
      ...options,
    };
  }

  render(content: string, options?: Partial<RenderOptions>): RenderResult {
    const startTime = Date.now();
    const opts = { ...this.options, ...options };
    const warnings: string[] = [];

    try {
      let output: string;

      switch (opts.format) {
        case 'text':
          output = this.renderAsText(content, opts);
          break;
        case 'markdown':
          output = this.renderAsMarkdown(content, opts);
          break;
        case 'html':
          output = this.renderAsHtml(content, opts);
          break;
        case 'svg':
          output = this.renderAsSvg(content, opts);
          break;
        default:
          output = this.renderAsMarkdown(content, opts);
      }

      const tokens = this.tokenize(output);
      const wordCount = output.split(/\s+/).filter(w => w.length > 0).length;

      return {
        content: output,
        format: opts.format!,
        metrics: {
          renderTime: Date.now() - startTime,
          wordCount,
          elementCount: tokens.length,
        },
        warnings,
      };
    } catch (error) {
      return {
        content: content,
        format: opts.format!,
        metrics: {
          renderTime: Date.now() - startTime,
          wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
          elementCount: 0,
        },
        warnings: [`Render error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  private renderAsText(content: string, _options: RenderOptions): string {
    let text = content;

    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/\*(.+?)\*/g, '$1');
    text = text.replace(/```[\s\S]*?```/g, '[code block]');
    text = text.replace(/`(.+?)`/g, '$1');
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    text = text.replace(/!\[.*?\]\(.+?\)/g, '[image]');
    text = text.replace(/^\s*[-*+]\s+/gm, '• ');
    text = text.replace(/^\s*\d+\.\s+/gm, (match) => match);
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    return text;
  }

  private renderAsMarkdown(content: string, _options: RenderOptions): string {
    let md = content;

    md = md.replace(/^######\s+(.+)$/gm, '###### $1');
    md = md.replace(/^#######\s+(.+)$/gm, '###### $1');
    md = md.replace(/```$/gm, '```\n');
    md = this.processTables(md);
    md = md.replace(/^- \[ \]/gm, '- [ ]');
    md = md.replace(/^- \[x\]/gi, '- [x]');

    return md;
  }

  private renderAsHtml(content: string, options: RenderOptions): string {
    let html = content;
    html = this.markdownToHtml(html);
    if (options.includeStyles) {
      html = this.wrapInHtmlDocument(html, options);
    }
    return html;
  }

  private markdownToHtml(md: string): string {
    let html = md;

    html = html.replace(/&/g, '&amp;');
    html = html.replace(/</g, '&lt;');
    html = html.replace(/>/g, '&gt;');

    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  private processTables(md: string): string {
    const lines = md.split('\n');
    const result: string[] = [];
    let inTable = false;
    const tableLines: string[] = [];

    for (const line of lines) {
      if (/^\|/.test(line)) {
        if (!inTable) {
          inTable = true;
        }
        tableLines.push(line);
      } else {
        if (inTable) {
          result.push(this.formatTable(tableLines));
          tableLines.length = 0;
          inTable = false;
        }
        result.push(line);
      }
    }

    if (inTable && tableLines.length > 0) {
      result.push(this.formatTable(tableLines));
    }

    return result.join('\n');
  }

  private formatTable(tableLines: string[]): string {
    if (tableLines.length < 2) return tableLines.join('\n');

    const rows = tableLines
      .filter(l => !/^\|[-:\s]+\|$/.test(l))
      .map(l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

    if (rows.length === 0) return tableLines.join('\n');

    const header = rows[0];
    const body = rows.slice(1);

    let table = '<table>\n<thead>\n<tr>';
    for (const cell of header) {
      table += `<th>${cell}</th>`;
    }
    table += '</tr>\n</thead>\n<tbody>\n';

    for (const row of body) {
      table += '<tr>';
      for (const cell of row) {
        table += `<td>${cell}</td>`;
      }
      table += '</tr>\n';
    }

    table += '</tbody>\n</table>';
    return table;
  }

  private wrapInHtmlDocument(html: string, options: RenderOptions): string {
    const themeClass = options.theme === 'dark' ? 'dark-theme' : options.theme === 'light' ? 'light-theme' : 'auto-theme';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #1a1a1a;
      --code-bg: #f5f5f5;
      --border-color: #e0e0e0;
    }
    .dark-theme {
      --bg-color: #1a1a1a;
      --text-color: #e0e0e0;
      --code-bg: #2d2d2d;
      --border-color: #404040;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      max-width: ${options.maxWidth}px;
      margin: 0 auto;
      padding: 1rem;
      line-height: 1.6;
    }
    pre { background: var(--code-bg); padding: 1rem; overflow-x: auto; border-radius: 4px; }
    code { background: var(--code-bg); padding: 0.2rem 0.4rem; border-radius: 3px; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid var(--border-color); padding: 0.5rem; text-align: left; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body class="${themeClass}">
${html}
</body>
</html>`;
  }

  private renderAsSvg(content: string, options: RenderOptions): string {
    const lines = content.split('\n');
    let y = 30;
    const x = 30;
    const lineHeight = 24;
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${options.maxWidth}" height="${lines.length * lineHeight + 40}">`,
      `<style>`,
      `.text { font-family: monospace; font-size: 12px; fill: #333; }`,
      `.heading { font-weight: bold; font-size: 14px; }`,
      `.code { font-family: monospace; font-size: 11px; fill: #0066cc; }`,
      `</style>`,
    ];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        svgParts.push(`<text x="${x}" y="${y}" class="text heading">${this.escapeXml(line.slice(2))}</text>`);
      } else if (line.startsWith('```')) {
        svgParts.push(`<text x="${x}" y="${y}" class="text code">${this.escapeXml(line)}</text>`);
      } else if (line.trim()) {
        svgParts.push(`<text x="${x}" y="${y}" class="text">${this.escapeXml(line)}</text>`);
      }
      y += lineHeight;
    }

    svgParts.push('</svg>');
    return svgParts.join('\n');
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private tokenize(content: string): ContentToken[] {
    const tokens: ContentToken[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('<h') && line.includes('>')) {
        tokens.push({ type: 'heading', content: line });
      } else if (line.startsWith('<pre')) {
        tokens.push({ type: 'code-block', content: line });
      } else if (line.startsWith('<p>')) {
        tokens.push({ type: 'paragraph', content: line });
      } else if (line.trim()) {
        tokens.push({ type: 'text', content: line });
      }
    }

    return tokens;
  }

  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getOptions(): RenderOptions {
    return { ...this.options };
  }
}

export function createMultiModalRenderer(options?: RenderOptions): MultiModalRenderer {
  return new MultiModalRenderer(options);
}