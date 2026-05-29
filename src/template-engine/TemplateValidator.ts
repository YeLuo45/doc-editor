/**
 * TemplateValidator.ts - V69 Template Engine Validator
 * Validates template syntax and structure
 */

type ValidatorConfig = {
  allowRawHTML: boolean;
  maxNestingDepth: number;
  maxTemplateLength: number;
  allowedTags: string[];
  requireClosingTags: boolean;
};

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  syntaxTree: unknown;
}

interface SyntaxNode {
  type: string;
  value?: string;
  line: number;
  column: number;
  children?: SyntaxNode[];
}

export class TemplateValidator {
  private errorCount: number = 0;
  private warningCount: number = 0;
  public readonly config: ValidatorConfig;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = {
      allowRawHTML: config.allowRawHTML ?? false,
      maxNestingDepth: config.maxNestingDepth ?? 10,
      maxTemplateLength: config.maxTemplateLength ?? 50000,
      allowedTags: config.allowedTags ?? ['div', 'span', 'p', 'strong', 'em'],
      requireClosingTags: config.requireClosingTags ?? true,
    };
  }

  validate(source: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Reset counters for this validation session
    const sessionErrorCount = this.errorCount;
    const sessionWarningCount = this.warningCount;

    // Length check
    if (source.length > this.config.maxTemplateLength) {
      errors.push({
        line: 1,
        column: 1,
        message: `Template exceeds max length: ${source.length} > ${this.config.maxTemplateLength}`,
        severity: 'error',
      });
    }

    // Check for balanced {{ }}
    const openCount = (source.match(/\{\{/g) || []).length;
    const closeCount = (source.match(/\}\}/g) || []).length;
    if (openCount !== closeCount) {
      errors.push({
        line: 1,
        column: 1,
        message: `Unbalanced template markers: ${openCount} {{ vs ${closeCount} }}`,
        severity: 'error',
      });
    }

    // Validate variable names
    const variableRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = variableRegex.exec(source)) !== null) {
      const varName = match[1];
      if (!this.isValidVariableName(varName)) {
        errors.push({
          line: 1,
          column: match.index,
          message: `Invalid variable name: "${varName}"`,
          severity: 'error',
        });
      }
    }

    // Check HTML tags if not allowed
    if (!this.config.allowRawHTML) {
      const htmlTagRegex = /<(\/?)(\w+)[^>]*>/g;
      while ((match = htmlTagRegex.exec(source)) !== null) {
        const tagName = match[2].toLowerCase();
        if (!this.config.allowedTags.includes(tagName)) {
          errors.push({
            line: 1,
            column: match.index,
            message: `Disallowed HTML tag: <${match[1]}${match[2]}>`,
            severity: 'error',
          });
        }
      }
    }

    // Check nesting depth (simulate with recursive checks)
    const depth = this.checkNestingDepth(source);
    if (depth > this.config.maxNestingDepth) {
      warnings.push({
        line: 1,
        column: 1,
        message: `Nesting depth ${depth} exceeds max ${this.config.maxNestingDepth}`,
        severity: 'warning',
      });
    }

    const valid = errors.length === 0;
    
    // Update instance counters
    this.errorCount += errors.length;
    this.warningCount += warnings.length;

    return {
      valid,
      errors,
      warnings,
      syntaxTree: this.buildSyntaxTree(source),
    };
  }

  getErrors(): ValidationError[] {
    // Return accumulated errors (in real impl would track per-session)
    return [];
  }

  getSyntax(source: string): SyntaxNode[] {
    const nodes: SyntaxNode[] = [];
    const regex = /\{\{(\w+)\}\}|([^{}]+)|<(\/?)(\w+)[^>]*>/g;
    let match;
    let position = 0;

    while ((match = regex.exec(source)) !== null) {
      if (match[1]) {
        nodes.push({
          type: 'variable',
          value: match[1],
          line: this.getLineNumber(source, match.index),
          column: this.getColumnNumber(source, match.index),
        });
      } else if (match[2]) {
        nodes.push({
          type: 'literal',
          value: match[2],
          line: this.getLineNumber(source, match.index),
          column: this.getColumnNumber(source, match.index),
        });
      } else if (match[4]) {
        nodes.push({
          type: 'html_tag',
          value: `<${match[1]}${match[4]}>`,
          line: this.getLineNumber(source, match.index),
          column: this.getColumnNumber(source, match.index),
        });
      }
      position = match.index + match[0].length;
    }

    return nodes;
  }

  private isValidVariableName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private checkNestingDepth(source: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    let depthPos = 0;

    for (let i = 0; i < source.length; i++) {
      if (source.substring(i, i + 2) === '{{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
        depthPos = i;
        i++;
      } else if (source.substring(i, i + 2) === '}}') {
        currentDepth--;
        i++;
      }
    }

    return maxDepth;
  }

  private buildSyntaxTree(source: string): unknown {
    // Build a simple syntax tree representation
    return {
      type: 'template',
      sourceLength: source.length,
      nodeCount: this.getSyntax(source).length,
    };
  }

  private getLineNumber(source: string, index: number): number {
    return source.substring(0, index).split('\n').length;
  }

  private getColumnNumber(source: string, index: number): number {
    const lastNewline = source.lastIndexOf('\n', index);
    return index - lastNewline;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        errorCount: this.errorCount,
        warningCount: this.warningCount,
        allowRawHTML: this.config.allowRawHTML,
        maxNestingDepth: this.config.maxNestingDepth,
        maxTemplateLength: this.config.maxTemplateLength,
        allowedTagsCount: this.config.allowedTags.length,
        requireClosingTags: this.config.requireClosingTags,
      },
    };
  }

  reset(): void {
    this.errorCount = 0;
    this.warningCount = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== TemplateValidator Report ===',
      `Total Errors: ${snapshot.metrics.errorCount}`,
      `Total Warnings: ${snapshot.metrics.warningCount}`,
      `Allow Raw HTML: ${snapshot.metrics.allowRawHTML ? 'ON' : 'OFF'}`,
      `Max Nesting Depth: ${snapshot.metrics.maxNestingDepth}`,
      `Max Template Length: ${snapshot.metrics.maxTemplateLength}`,
      `Allowed Tags: ${snapshot.metrics.allowedTagsCount}`,
      `Require Closing Tags: ${snapshot.metrics.requireClosingTags ? 'ON' : 'OFF'}`,
      '==============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v69-template-engine/validator' };
  }
}