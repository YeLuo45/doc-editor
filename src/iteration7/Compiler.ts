/**
 * Compiler.ts - V37 Iteration 7
 * Core compiler module with compile, parse, and getCompiled capabilities
 */

export interface CompilationUnit {
  id: string;
  name: string;
  source: string;
  ast?: unknown;
  bytecode?: Uint8Array;
  errors: string[];
  warnings: string[];
}

export interface CompiledModule {
  id: string;
  name: string;
  exports: string[];
  imports: Record<string, string[]>;
  bytecode: Uint8Array;
  sourceMap?: string;
}

export interface CompilerSnapshot {
  units: Record<string, CompilationUnit>;
  modules: Record<string, CompiledModule>;
  metrics: {
    totalUnits: number;
    totalModules: number;
    compilations: number;
    parses: number;
    errors: number;
    warnings: number;
  };
}

export class Compiler {
  private units: Map<string, CompilationUnit> = new Map();
  private modules: Map<string, CompiledModule> = new Map();
  private compilations: number = 0;
  private parses: number = 0;
  private errors: number = 0;
  private warnings: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Parse source code into AST
   */
  parse(source: string, name: string = 'anonymous'): CompilationUnit {
    this.parses++;
    
    const id = `unit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const unit: CompilationUnit = {
      id,
      name,
      source,
      errors: [],
      warnings: [],
    };

    // Simple tokenizer and parser for demonstration
    const tokens = this.tokenize(source);
    
    try {
      // Create a simple AST structure
      unit.ast = {
        type: 'Program',
        name,
        body: this.parseTokens(tokens),
      };
    } catch (err) {
      unit.errors.push(err instanceof Error ? err.message : 'Parse error');
      this.errors++;
    }

    this.units.set(id, unit);
    return unit;
  }

  /**
   * Compile a source string into a module with bytecode
   */
  compile(source: string, name: string = 'module'): CompiledModule | null {
    this.compilations++;

    const unit = this.parse(source, name);
    if (unit.errors.length > 0) {
      this.errors += unit.errors.length;
      return null;
    }

    const id = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    
    // Generate bytecode from AST
    const bytecode = this.generateBytecode(unit.ast);

    // Extract exports and imports
    const { exports, imports } = this.extractDependencies(unit.ast);

    const module: CompiledModule = {
      id,
      name,
      exports,
      imports,
      bytecode,
      sourceMap: JSON.stringify({ version: 1, mappings: [] }),
    };

    this.modules.set(id, module);
    return module;
  }

  /**
   * Get a compilation unit by id
   */
  getUnit(id: string): CompilationUnit | undefined {
    return this.units.get(id);
  }

  /**
   * Get a compiled module by id
   */
  getModule(id: string): CompiledModule | undefined {
    return this.modules.get(id);
  }

  /**
   * Get all compiled modules
   */
  getCompiled(): CompiledModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get current snapshot of compiler state
   */
  getSnapshot(): CompilerSnapshot {
    const unitsObj: Record<string, CompilationUnit> = {};
    this.units.forEach((u, id) => { unitsObj[id] = u; });

    const modulesObj: Record<string, CompiledModule> = {};
    this.modules.forEach((m, id) => { modulesObj[id] = m; });

    return {
      units: unitsObj,
      modules: modulesObj,
      metrics: {
        totalUnits: this.units.size,
        totalModules: this.modules.size,
        compilations: this.compilations,
        parses: this.parses,
        errors: this.errors,
        warnings: this.warnings,
      },
    };
  }

  /**
   * Reset all compiler state
   */
  reset(): void {
    this.units.clear();
    this.modules.clear();
    this.compilations = 0;
    this.parses = 0;
    this.errors = 0;
    this.warnings = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Compiler Report ===',
      `Total Units: ${snap.metrics.totalUnits}`,
      `Total Modules: ${snap.metrics.totalModules}`,
      `Compilations: ${snap.metrics.compilations}`,
      `Parses: ${snap.metrics.parses}`,
      `Errors: ${snap.metrics.errors}`,
      `Warnings: ${snap.metrics.warnings}`,
      '',
      'Compiled Modules:',
    ];

    if (snap.modules && Object.keys(snap.modules).length > 0) {
      Object.values(snap.modules).forEach(m => {
        lines.push(`  [${m.id}] ${m.name} (${m.exports.length} exports)`);
      });
    } else {
      lines.push('  (none)');
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      totalUnits: snap.metrics.totalUnits,
      totalModules: snap.metrics.totalModules,
      compilations: snap.metrics.compilations,
      parses: snap.metrics.parses,
      errors: snap.metrics.errors,
      warnings: snap.metrics.warnings,
      units: Object.keys(snap.units).length,
      modules: Object.keys(snap.modules).length,
    };
  }

  // Private helper methods
  private tokenize(source: string): string[] {
    const tokens: string[] = [];
    const regex = /\s+|[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|[=+\-*/()<>;.]/g;
    let match;
    while ((match = regex.exec(source)) !== null) {
      if (match[0].trim()) tokens.push(match[0]);
    }
    return tokens;
  }

  private parseTokens(tokens: string[]): unknown[] {
    const nodes: unknown[] = [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === 'function') {
        nodes.push({ type: 'FunctionDeclaration', name: tokens[++i] || 'anonymous' });
      } else if (token === 'const' || token === 'let' || token === 'var') {
        nodes.push({ type: 'VariableDeclaration', name: tokens[++i] || 'unknown' });
      } else if (token === '=') {
        nodes.push({ type: 'Assignment', target: tokens[i - 1] || 'unknown' });
      } else if (/^[0-9]+$/.test(token)) {
        nodes.push({ type: 'Literal', value: parseInt(token, 10) });
      } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
        nodes.push({ type: 'Identifier', name: token });
      }
      i++;
    }
    return nodes;
  }

  private generateBytecode(ast: unknown): Uint8Array {
    // Simple bytecode generator - just encodes the AST as bytes
    const encoded = JSON.stringify(ast);
    const bytes = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) {
      bytes[i] = encoded.charCodeAt(i);
    }
    return bytes;
  }

  private extractDependencies(ast: unknown): { exports: string[]; imports: Record<string, string[]> } {
    const exports: string[] = ['default'];
    const imports: Record<string, string[]> = {};
    return { exports, imports };
  }
}

export default Compiler;