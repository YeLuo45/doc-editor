/**
 * Builder.ts - V38 Iteration 8
 * Core builder module with build, assemble, and getBuilt capabilities
 */

export interface BuildArtifact {
  id: string;
  name: string;
  type: 'binary' | 'script' | 'module' | 'resource';
  content: Uint8Array;
  hash: string;
  metadata: Record<string, unknown>;
}

export interface BuildTarget {
  id: string;
  name: string;
  sources: string[];
  outputPath: string;
  dependencies: string[];
  options: Record<string, unknown>;
}

export interface BuilderSnapshot {
  artifacts: Record<string, BuildArtifact>;
  targets: Record<string, BuildTarget>;
  metrics: {
    totalBuilds: number;
    successfulBuilds: number;
    failedBuilds: number;
    artifactsBuilt: number;
    assemblyOperations: number;
    lastBuildTime: number;
  };
}

export class Builder {
  private artifacts: Map<string, BuildArtifact> = new Map();
  private targets: Map<string, BuildTarget> = new Map();
  private totalBuilds: number = 0;
  private successfulBuilds: number = 0;
  private failedBuilds: number = 0;
  private assemblyOps: number = 0;
  private lastBuildTime: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Build a target from sources
   */
  build(target: Omit<BuildTarget, 'id'>): BuildArtifact | null {
    this.totalBuilds++;
    const startTime = Date.now();

    try {
      const id = `build_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const artifact: BuildArtifact = {
        id,
        name: target.name,
        type: this.inferType(target),
        content: this.generateContent(target),
        hash: this.computeHash(target),
        metadata: {
          sources: target.sources,
          outputPath: target.outputPath,
          dependencies: target.dependencies,
          options: target.options,
          buildNumber: this.totalBuilds,
          timestamp: startTime,
        },
      };

      this.artifacts.set(id, artifact);
      this.targets.set(id, { ...target, id });
      this.successfulBuilds++;
      this.lastBuildTime = Date.now() - startTime;
      
      return artifact;
    } catch (err) {
      this.failedBuilds++;
      this.lastBuildTime = Date.now() - startTime;
      return null;
    }
  }

  /**
   * Assemble multiple artifacts into a final output
   */
  assemble(artifactIds: string[], outputName: string): BuildArtifact | null {
    this.assemblyOps++;

    const selected = artifactIds
      .map(id => this.artifacts.get(id))
      .filter((a): a is BuildArtifact => a !== undefined);

    if (selected.length === 0) {
      return null;
    }

    // Combine content from all selected artifacts
    const totalLength = selected.reduce((sum, a) => sum + a.content.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const artifact of selected) {
      combined.set(artifact.content, offset);
      offset += artifact.content.length;
    }

    const id = `assembled_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const assembled: BuildArtifact = {
      id,
      name: outputName,
      type: 'module',
      content: combined,
      hash: this.computeHashFromBytes(combined),
      metadata: {
        sourceArtifactIds: artifactIds,
        artifactCount: selected.length,
        assembledAt: Date.now(),
      },
    };

    this.artifacts.set(id, assembled);
    return assembled;
  }

  /**
   * Get all built artifacts
   */
  getBuilt(): BuildArtifact[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * Get artifact by id
   */
  getArtifact(id: string): BuildArtifact | undefined {
    return this.artifacts.get(id);
  }

  /**
   * Get target by id
   */
  getTarget(id: string): BuildTarget | undefined {
    return this.targets.get(id);
  }

  /**
   * Get current snapshot of builder state
   */
  getSnapshot(): BuilderSnapshot {
    const artifactsObj: Record<string, BuildArtifact> = {};
    this.artifacts.forEach((a, id) => { artifactsObj[id] = a; });

    const targetsObj: Record<string, BuildTarget> = {};
    this.targets.forEach((t, id) => { targetsObj[id] = t; });

    return {
      artifacts: artifactsObj,
      targets: targetsObj,
      metrics: {
        totalBuilds: this.totalBuilds,
        successfulBuilds: this.successfulBuilds,
        failedBuilds: this.failedBuilds,
        artifactsBuilt: this.artifacts.size,
        assemblyOperations: this.assemblyOps,
        lastBuildTime: this.lastBuildTime,
      },
    };
  }

  /**
   * Reset all builder state
   */
  reset(): void {
    this.artifacts.clear();
    this.targets.clear();
    this.totalBuilds = 0;
    this.successfulBuilds = 0;
    this.failedBuilds = 0;
    this.assemblyOps = 0;
    this.lastBuildTime = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Builder Report ===',
      `Total Builds: ${snap.metrics.totalBuilds}`,
      `Successful: ${snap.metrics.successfulBuilds}`,
      `Failed: ${snap.metrics.failedBuilds}`,
      `Artifacts: ${snap.metrics.artifactsBuilt}`,
      `Assembly Ops: ${snap.metrics.assemblyOperations}`,
      `Last Build Time: ${snap.metrics.lastBuildTime}ms`,
      '',
      'Artifacts:',
    ];

    const artifacts = this.getBuilt();
    if (artifacts.length === 0) {
      lines.push('  (none)');
    } else {
      artifacts.forEach(a => {
        lines.push(`  [${a.id}] ${a.name} (${a.type}) - ${a.content.length} bytes`);
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
      totalBuilds: snap.metrics.totalBuilds,
      successfulBuilds: snap.metrics.successfulBuilds,
      failedBuilds: snap.metrics.failedBuilds,
      artifactsBuilt: snap.metrics.artifactsBuilt,
      assemblyOperations: snap.metrics.assemblyOperations,
      lastBuildTime: snap.metrics.lastBuildTime,
      artifactCount: Object.keys(snap.artifacts).length,
      targetCount: Object.keys(snap.targets).length,
    };
  }

  // Private helper methods
  private inferType(target: BuildTarget): BuildArtifact['type'] {
    const name = target.name.toLowerCase();
    if (name.endsWith('.exe') || name.endsWith('.bin')) return 'binary';
    if (name.endsWith('.sh') || name.endsWith('.bat')) return 'script';
    if (name.endsWith('.dll') || name.endsWith('.so') || name.endsWith('.dylib')) return 'module';
    return 'resource';
  }

  private generateContent(target: BuildTarget): Uint8Array {
    const data = JSON.stringify({
      name: target.name,
      sources: target.sources,
      outputPath: target.outputPath,
      dependencies: target.dependencies,
      options: target.options,
      generated: Date.now(),
    });
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i);
    }
    return bytes;
  }

  private computeHash(target: BuildTarget): string {
    const data = JSON.stringify(target);
    return this.computeHashFromBytes(new TextEncoder().encode(data));
  }

  private computeHashFromBytes(bytes: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      const char = bytes[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export default Builder;