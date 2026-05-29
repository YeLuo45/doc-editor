/**
 * Linker.ts - V37 Iteration 7
 * Module linker with link, resolve, and getLinked capabilities
 */

export interface LinkedModule {
  id: string;
  name: string;
  resolvedImports: Record<string, string>;
  resolvedExports: Record<string, string>;
  bytecode: Uint8Array;
}

export interface LinkageResult {
  success: boolean;
  moduleId: string;
  errors: string[];
  warnings: string[];
}

export interface LinkerSnapshot {
  modules: Record<string, LinkedModule>;
  results: Record<string, LinkageResult>;
  metrics: {
    totalModules: number;
    successfulLinks: number;
    failedLinks: number;
    unresolvedImports: number;
    circularDeps: number;
  };
}

export class Linker {
  private modules: Map<string, LinkedModule> = new Map();
  private results: Map<string, LinkageResult> = new Map();
  private successfulLinks: number = 0;
  private failedLinks: number = 0;
  private unresolvedImports: number = 0;
  private circularDeps: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Link a module with its dependencies
   */
  link(moduleId: string, imports: Record<string, string[]>, bytecode: Uint8Array, name: string = 'module'): LinkageResult {
    const result: LinkageResult = {
      success: false,
      moduleId,
      errors: [],
      warnings: [],
    };

    const resolvedImports: Record<string, string> = {};
    const resolvedExports: Record<string, string> = {};

    // Resolve each import
    for (const [importName, possibleIds] of Object.entries(imports)) {
      let resolved = false;
      for (const possibleId of possibleIds) {
        if (this.modules.has(possibleId)) {
          resolvedImports[importName] = possibleId;
          resolved = true;
          break;
        }
      }
      if (!resolved) {
        result.errors.push(`Unresolved import: ${importName}`);
        this.unresolvedImports++;
      }
    }

    // Simulate export resolution
    for (const key of Object.keys(imports)) {
      resolvedExports[key] = `${moduleId}_export_${key}`;
    }

    if (result.errors.length === 0) {
      result.success = true;
      this.successfulLinks++;

      const linkedModule: LinkedModule = {
        id: moduleId,
        name,
        resolvedImports,
        resolvedExports,
        bytecode,
      };

      this.modules.set(moduleId, linkedModule);
      this.results.set(moduleId, result);
    } else {
      this.failedLinks++;
      this.results.set(moduleId, result);
    }

    return result;
  }

  /**
   * Resolve a module by id
   */
  resolve(moduleId: string): LinkedModule | null {
    return this.modules.get(moduleId) || null;
  }

  /**
   * Get all linked modules
   */
  getLinked(): LinkedModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Check for circular dependencies
   */
  detectCircular(moduleId: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(moduleId)) return true;
    visited.add(moduleId);

    const module = this.modules.get(moduleId);
    if (!module) return false;

    for (const depId of Object.values(module.resolvedImports)) {
      if (this.detectCircular(depId, new Set(visited))) {
        this.circularDeps++;
        return true;
      }
    }
    return false;
  }

  /**
   * Get link result for a module
   */
  getResult(moduleId: string): LinkageResult | undefined {
    return this.results.get(moduleId);
  }

  /**
   * Get current snapshot of linker state
   */
  getSnapshot(): LinkerSnapshot {
    const modulesObj: Record<string, LinkedModule> = {};
    this.modules.forEach((m, id) => { modulesObj[id] = m; });

    const resultsObj: Record<string, LinkageResult> = {};
    this.results.forEach((r, id) => { resultsObj[id] = r; });

    return {
      modules: modulesObj,
      results: resultsObj,
      metrics: {
        totalModules: this.modules.size,
        successfulLinks: this.successfulLinks,
        failedLinks: this.failedLinks,
        unresolvedImports: this.unresolvedImports,
        circularDeps: this.circularDeps,
      },
    };
  }

  /**
   * Reset all linker state
   */
  reset(): void {
    this.modules.clear();
    this.results.clear();
    this.successfulLinks = 0;
    this.failedLinks = 0;
    this.unresolvedImports = 0;
    this.circularDeps = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Linker Report ===',
      `Total Modules: ${snap.metrics.totalModules}`,
      `Successful Links: ${snap.metrics.successfulLinks}`,
      `Failed Links: ${snap.metrics.failedLinks}`,
      `Unresolved Imports: ${snap.metrics.unresolvedImports}`,
      `Circular Dependencies: ${snap.metrics.circularDeps}`,
      '',
      'Linked Modules:',
    ];

    if (snap.modules && Object.keys(snap.modules).length > 0) {
      Object.values(snap.modules).forEach(m => {
        const importCount = Object.keys(m.resolvedImports).length;
        lines.push(`  [${m.id}] ${m.name} (${importCount} resolved imports)`);
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
      totalModules: snap.metrics.totalModules,
      successfulLinks: snap.metrics.successfulLinks,
      failedLinks: snap.metrics.failedLinks,
      unresolvedImports: snap.metrics.unresolvedImports,
      circularDeps: snap.metrics.circularDeps,
      modules: Object.keys(snap.modules).length,
    };
  }
}

export default Linker;