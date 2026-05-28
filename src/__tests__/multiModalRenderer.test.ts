// ============================================================
// MultiModalRenderer Tests
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiModalRenderer, createMultiModalRenderer } from '../pipeline/index.js';

describe('MultiModalRenderer', () => {
  let renderer: MultiModalRenderer;

  beforeEach(() => {
    renderer = new MultiModalRenderer();
  });

  describe('constructor', () => {
    it('should create renderer with default options', () => {
      const r = new MultiModalRenderer();
      expect(r.getOptions().format).toBe('markdown');
      expect(r.getOptions().mode).toBe('preview');
    });

    it('should create renderer with custom options', () => {
      const r = new MultiModalRenderer({ format: 'html', theme: 'dark' });
      expect(r.getOptions().format).toBe('html');
      expect(r.getOptions().theme).toBe('dark');
    });
  });

  describe('render', () => {
    it('should render basic markdown content', () => {
      const result = renderer.render('# Hello World\n\nThis is a test.');
      expect(result.content).toBeTruthy();
      expect(result.format).toBe('markdown');
    });

    it('should return metrics with render result', () => {
      const result = renderer.render('Hello world');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.renderTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.wordCount).toBeGreaterThan(0);
    });

    it('should return warnings array', () => {
      const result = renderer.render('Test content');
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('text rendering', () => {
    it('should render as plain text', () => {
      const result = renderer.render('# Heading\n\nSome text', { format: 'text' });
      expect(result.content).not.toContain('#');
      expect(result.content).toContain('Heading');
    });

    it('should strip markdown formatting', () => {
      const result = renderer.render('**bold** and *italic*', { format: 'text' });
      expect(result.content).not.toContain('**');
      expect(result.content).toContain('bold');
    });

    it('should convert code blocks to placeholder', () => {
      const result = renderer.render('```js\nconsole.log("hi")\n```', { format: 'text' });
      expect(result.content).toContain('[code block]');
    });

    it('should convert links to text', () => {
      const result = renderer.render('[Click here](https://example.com)', { format: 'text' });
      expect(result.content).toContain('Click here');
      expect(result.content).not.toContain('[');
    });
  });

  describe('markdown rendering', () => {
    it('should preserve heading hierarchy', () => {
      const result = renderer.render('## Section\n### Subsection', { format: 'markdown' });
      expect(result.content).toContain('## Section');
      expect(result.content).toContain('### Subsection');
    });

    it('should preserve code blocks', () => {
      const code = '```js\nconst x = 1;\n```';
      const result = renderer.render(code, { format: 'markdown' });
      expect(result.content).toContain('```js');
    });

    it('should handle task lists', () => {
      const result = renderer.render('- [ ] Task 1\n- [x] Task 2', { format: 'markdown' });
      expect(result.content).toContain('- [ ]');
      expect(result.content).toContain('- [x]');
    });
  });

  describe('html rendering', () => {
    it('should convert headings to HTML tags', () => {
      const result = renderer.render('# Main Title', { format: 'html' });
      expect(result.content).toContain('<h1>');
    });

    it('should convert bold/italic to HTML', () => {
      const result = renderer.render('**bold** and *italic*', { format: 'html' });
      expect(result.content).toContain('<strong>');
      expect(result.content).toContain('<em>');
    });

    it('should include document wrapper when includeStyles is true', () => {
      const result = renderer.render('Content', { format: 'html', includeStyles: true });
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('<html');
    });

    it('should apply theme class', () => {
      const lightResult = renderer.render('Content', { format: 'html', includeStyles: true, theme: 'light' });
      const darkResult = renderer.render('Content', { format: 'html', includeStyles: true, theme: 'dark' });

      expect(lightResult.content).toContain('light-theme');
      expect(darkResult.content).toContain('dark-theme');
    });

    it('should apply maxWidth styling', () => {
      const result = renderer.render('Content', { format: 'html', includeStyles: true, maxWidth: 600 });
      expect(result.content).toContain('max-width: 600px');
    });
  });

  describe('SVG rendering', () => {
    it('should create SVG structure', () => {
      const result = renderer.render('Heading\nText line', { format: 'svg' });
      expect(result.content).toContain('<svg');
      expect(result.content).toContain('</svg>');
    });

    it('should include text elements', () => {
      const result = renderer.render('Sample text', { format: 'svg' });
      expect(result.content).toContain('<text');
    });

    it('should escape XML special characters', () => {
      const result = renderer.render('Name: <test> & "quote"', { format: 'svg' });
      expect(result.content).toContain('&lt;test&gt;');
      expect(result.content).toContain('&amp;');
    });
  });

  describe('setOptions', () => {
    it('should update options', () => {
      renderer.setOptions({ format: 'html', theme: 'dark' });
      expect(renderer.getOptions().format).toBe('html');
      expect(renderer.getOptions().theme).toBe('dark');
    });

    it('should preserve unspecified options', () => {
      renderer.setOptions({ format: 'html' });
      expect(renderer.getOptions().mode).toBe('preview');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = renderer.render('');
      expect(result.content).toBeDefined();
      expect(result.metrics.wordCount).toBe(0);
    });

    it('should handle content with only whitespace', () => {
      const result = renderer.render('   \n\n  ');
      expect(result.content).toBeDefined();
    });

    it('should handle complex nested structures', () => {
      const content = `# Title

## Section 1

Some text with **bold** and *italic*.

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |

- List item 1
- List item 2
`;
      const result = renderer.render(content, { format: 'markdown' });
      expect(result.content).toContain('## Section 1');
      expect(result.content).toContain('```javascript');
    });

    it('should handle tables without pipe borders', () => {
      const content = `| Header |
|--------|
| Cell   |`;
      const result = renderer.render(content, { format: 'markdown' });
      expect(result.content).toBeTruthy();
    });

    it('should handle deeply nested headings', () => {
      const result = renderer.render('####### Too Many Hashes', { format: 'markdown' });
      expect(result.content).toContain('###### Too Many Hashes');
    });
  });
});

describe('createMultiModalRenderer', () => {
  it('should create renderer using factory function', () => {
    const r = createMultiModalRenderer({ format: 'text' });
    expect(r.getOptions().format).toBe('text');
  });

  it('should create with default options', () => {
    const r = createMultiModalRenderer();
    expect(r.getOptions()).toBeDefined();
  });
});

describe('render modes', () => {
  it('should support preview mode', () => {
    const r = new MultiModalRenderer({ mode: 'preview' });
    const result = r.render('Content', { mode: 'preview' });
    expect(result.content).toBeDefined();
  });

  it('should support full mode', () => {
    const r = new MultiModalRenderer({ mode: 'full' });
    const result = r.render('Content', { mode: 'full' });
    expect(result.content).toBeDefined();
  });

  it('should support compact mode', () => {
    const r = new MultiModalRenderer({ mode: 'compact' });
    const result = r.render('Content', { mode: 'compact' });
    expect(result.content).toBeDefined();
  });
});