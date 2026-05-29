/**
 * TemplateRenderer.ts - V69 Template Engine Renderer
 * Renders compiled templates with variable substitution
 */

type RendererConfig = {
  strictUndefined: boolean;
  defaultValue: string;
  trimWhitespace: boolean;
  maxIterations: number;
};

interface RenderContext {
  [key: string]: unknown;
}

interface RenderResult {
  output: string;
  usedVariables: string[];
  missingVariables: string[];
  renderTime: number;
}

export class TemplateRenderer {
  private renderCount: number = 0;
  public readonly config: RendererConfig;

  constructor(config: Partial<RendererConfig> = {}) {
    this.config = {
      strictUndefined: config.strictUndefined ?? true,
      defaultValue: config.defaultValue ?? '',
      trimWhitespace: config.trimWhitespace ?? true,
      maxIterations: config.maxIterations ?? 1000,
    };
  }

  render(
    template: { source: string; variables: string[] },
    context: RenderContext
  ): RenderResult {
    const startTime = Date.now();
    let output = template.source;
    const usedVariables: string[] = [];
    const missingVariables: string[] = [];

    // Replace all {{variable}} placeholders
    for (const variable of template.variables) {
      const regex = new RegExp(`\\{\\{${variable}\\}\\}`, 'g');
      
      if (variable in context) {
        usedVariables.push(variable);
        const value = context[variable];
        output = output.replace(regex, String(value));
      } else {
        missingVariables.push(variable);
        
        if (this.config.strictUndefined) {
          throw new Error(`Undefined variable: ${variable}`);
        }
        
        output = output.replace(regex, this.config.defaultValue);
      }
    }

    // Handle any remaining unreplaced placeholders
    const remainingRegex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = remainingRegex.exec(output)) !== null) {
      const varName = match[1];
      if (!missingVariables.includes(varName)) {
        missingVariables.push(varName);
        if (this.config.strictUndefined) {
          throw new Error(`Undefined variable: ${varName}`);
        }
        output = output.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), this.config.defaultValue);
      }
    }

    if (this.config.trimWhitespace) {
      output = output.trim();
    }

    this.renderCount++;
    
    return {
      output,
      usedVariables,
      missingVariables,
      renderTime: Date.now() - startTime,
    };
  }

  parse(source: string): { variables: string[] } {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(source)) !== null) {
      const varName = match[1];
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return { variables };
  }

  getVariables(template: { variables: string[] }): string[] {
    return [...template.variables];
  }

  getRenderCount(): number {
    return this.renderCount;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        renderCount: this.renderCount,
        strictUndefined: this.config.strictUndefined,
        defaultValue: this.config.defaultValue,
        trimWhitespace: this.config.trimWhitespace,
        maxIterations: this.config.maxIterations,
      },
    };
  }

  reset(): void {
    this.renderCount = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== TemplateRenderer Report ===',
      `Total Renders: ${snapshot.metrics.renderCount}`,
      `Strict Undefined: ${snapshot.metrics.strictUndefined ? 'ON' : 'OFF'}`,
      `Default Value: "${snapshot.metrics.defaultValue}"`,
      `Trim Whitespace: ${snapshot.metrics.trimWhitespace ? 'ON' : 'OFF'}`,
      `Max Iterations: ${snapshot.metrics.maxIterations}`,
      '==============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v69-template-engine/renderer' };
  }
}