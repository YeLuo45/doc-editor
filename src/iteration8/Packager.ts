/**
 * Packager.ts - V38 Iteration 8
 * Module packager with pack, bundle, and getPackages capabilities
 */

export interface Package {
  id: string;
  name: string;
  version: string;
  modules: string[];
  size: number;
  checksum: string;
  metadata: Record<string, unknown>;
}

export interface BundleOptions {
  format: 'esm' | 'cjs' | 'umd' | 'iife';
  minify: boolean;
  sourceMap: boolean;
  treeShake: boolean;
  externals: string[];
}

export interface PackagerSnapshot {
  packages: Record<string, Package>;
  bundles: Array<{
    id: string;
    name: string;
    format: BundleOptions['format'];
    modules: string[];
    size: number;
  }>;
  metrics: {
    totalPacks: number;
    totalBundles: number;
    totalModules: number;
    successfulPacks: number;
    failedPacks: number;
    totalSize: number;
  };
}

export class Packager {
  private packages: Map<string, Package> = new Map();
  private bundles: Array<{ id: string; name: string; format: BundleOptions['format']; modules: string[]; size: number }> = [];
  private totalPacks: number = 0;
  private totalBundles: number = 0;
  private totalModules: number = 0;
  private successfulPacks: number = 0;
  private failedPacks: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Pack modules into a distributable package
   */
  pack(moduleIds: string[], name: string, version: string = '1.0.0'): Package | null {
    this.totalPacks++;

    try {
      const id = `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      // Simulate module content aggregation
      let totalSize = 0;
      for (let i = 0; i < moduleIds.length; i++) {
        totalSize += moduleIds[i].length * 10;
        this.totalModules++;
      }

      const pkg: Package = {
        id,
        name,
        version,
        modules: [...moduleIds],
        size: totalSize,
        checksum: this.computeChecksum(moduleIds),
        metadata: {
          packedAt: Date.now(),
          moduleCount: moduleIds.length,
          format: 'default',
        },
      };

      this.packages.set(id, pkg);
      this.successfulPacks++;
      return pkg;
    } catch (err) {
      this.failedPacks++;
      return null;
    }
  }

  /**
   * Bundle modules with specific options
   */
  bundle(moduleIds: string[], name: string, options: BundleOptions): Package | null {
    this.totalBundles++;

    try {
      const id = `bundle_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      
      // Calculate bundle size based on modules and options
      let baseSize = moduleIds.reduce((sum, modId) => sum + modId.length * 8, 0);
      if (options.minify) baseSize = Math.floor(baseSize * 0.6);
      if (options.treeShake) baseSize = Math.floor(baseSize * 0.7);
      if (options.sourceMap) baseSize += 500;

      const bundleModules = options.treeShake 
        ? moduleIds.slice(0, Math.ceil(moduleIds.length * 0.8))
        : moduleIds;

      const pkg: Package = {
        id,
        name,
        version: 'bundle',
        modules: bundleModules,
        size: baseSize,
        checksum: this.computeChecksum(bundleModules, options),
        metadata: {
          format: options.format,
          minify: options.minify,
          sourceMap: options.sourceMap,
          treeShake: options.treeShake,
          externals: options.externals,
          bundledAt: Date.now(),
        },
      };

      this.packages.set(id, pkg);
      this.bundles.push({
        id,
        name,
        format: options.format,
        modules: bundleModules,
        size: baseSize,
      });

      return pkg;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get all packages
   */
  getPackages(): Package[] {
    return Array.from(this.packages.values());
  }

  /**
   * Get package by id
   */
  getPackage(id: string): Package | undefined {
    return this.packages.get(id);
  }

  /**
   * Get bundles
   */
  getBundles(): Array<{ id: string; name: string; format: BundleOptions['format']; modules: string[]; size: number }> {
    return [...this.bundles];
  }

  /**
   * Get current snapshot of packager state
   */
  getSnapshot(): PackagerSnapshot {
    const packagesObj: Record<string, Package> = {};
    this.packages.forEach((p, id) => { packagesObj[id] = p; });

    const totalSize = Array.from(this.packages.values()).reduce((sum, p) => sum + p.size, 0);

    return {
      packages: packagesObj,
      bundles: [...this.bundles],
      metrics: {
        totalPacks: this.totalPacks,
        totalBundles: this.totalBundles,
        totalModules: this.totalModules,
        successfulPacks: this.successfulPacks,
        failedPacks: this.failedPacks,
        totalSize,
      },
    };
  }

  /**
   * Reset all packager state
   */
  reset(): void {
    this.packages.clear();
    this.bundles = [];
    this.totalPacks = 0;
    this.totalBundles = 0;
    this.totalModules = 0;
    this.successfulPacks = 0;
    this.failedPacks = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Packager Report ===',
      `Total Packs: ${snap.metrics.totalPacks}`,
      `Total Bundles: ${snap.metrics.totalBundles}`,
      `Total Modules: ${snap.metrics.totalModules}`,
      `Successful: ${snap.metrics.successfulPacks}`,
      `Failed: ${snap.metrics.failedPacks}`,
      `Total Size: ${snap.metrics.totalSize} bytes`,
      '',
      'Packages:',
    ];

    const packages = this.getPackages();
    if (packages.length === 0) {
      lines.push('  (none)');
    } else {
      packages.forEach(p => {
        lines.push(`  [${p.id}] ${p.name}@${p.version} (${p.modules.length} modules, ${p.size} bytes)`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      totalPacks: snap.metrics.totalPacks,
      totalBundles: snap.metrics.totalBundles,
      totalModules: snap.metrics.totalModules,
      successfulPacks: snap.metrics.successfulPacks,
      failedPacks: snap.metrics.failedPacks,
      totalSize: snap.metrics.totalSize,
      packageCount: Object.keys(snap.packages).length,
      bundleCount: snap.bundles.length,
    };
  }

  // Private helper methods
  private computeChecksum(data: string[], options?: BundleOptions): string {
    let hash = 0;
    const str = JSON.stringify({ data, options: options?.format || 'default' });
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export default Packager;