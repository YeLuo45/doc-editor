/**
 * Deployer.ts - V38 Iteration 8
 * Deployment handler with deploy, rollback, and getStatus capabilities
 */

export type DeploymentStatus = 'pending' | 'in_progress' | 'deployed' | 'failed' | 'rolled_back';

export interface Deployment {
  id: string;
  name: string;
  version: string;
  status: DeploymentStatus;
  environment: string;
  artifacts: string[];
  startedAt: number;
  completedAt?: number;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface DeploymentTarget {
  name: string;
  url: string;
  credentials?: Record<string, string>;
  region?: string;
}

export interface DeploymentSnapshot {
  deployments: Record<string, Deployment>;
  history: Deployment[];
  metrics: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    rollbacks: number;
    activeDeployments: number;
    averageDeploymentTime: number;
  };
}

export class Deployer {
  private deployments: Map<string, Deployment> = new Map();
  private history: Deployment[] = [];
  private totalDeployments: number = 0;
  private successfulDeployments: number = 0;
  private failedDeployments: number = 0;
  private rollbacks: number = 0;
  private deploymentTimes: number[] = [];

  constructor() {
    this.reset();
  }

  /**
   * Deploy artifacts to a target environment
   */
  deploy(
    name: string,
    version: string,
    artifacts: string[],
    target: DeploymentTarget
  ): Deployment | null {
    this.totalDeployments++;

    const id = `deploy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const deployment: Deployment = {
      id,
      name,
      version,
      status: 'in_progress',
      environment: target.region || 'default',
      artifacts: [...artifacts],
      startedAt: Date.now(),
      metadata: {
        targetUrl: target.url,
        targetRegion: target.region,
        credentials: target.credentials ? '[REDACTED]' : undefined,
      },
    };

    this.deployments.set(id, deployment);

    // Simulate deployment success/failure
    try {
      const successRate = 0.9;
      if (Math.random() < successRate) {
        deployment.status = 'deployed';
        deployment.completedAt = Date.now();
        this.successfulDeployments++;
        
        const duration = deployment.completedAt - deployment.startedAt;
        this.deploymentTimes.push(duration);
      } else {
        deployment.status = 'failed';
        deployment.error = 'Simulated deployment failure';
        deployment.completedAt = Date.now();
        this.failedDeployments++;
      }
    } catch (err) {
      deployment.status = 'failed';
      deployment.error = err instanceof Error ? err.message : 'Unknown error';
      deployment.completedAt = Date.now();
      this.failedDeployments++;
    }

    return deployment;
  }

  /**
   * Rollback a deployment to a previous version
   */
  rollback(deploymentId: string, targetVersion?: string): Deployment | null {
    const original = this.deployments.get(deploymentId);
    if (!original) return null;

    this.rollbacks++;

    const id = `rollback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const rollback: Deployment = {
      id,
      name: original.name,
      version: targetVersion || this.getPreviousVersion(original.version),
      status: 'in_progress',
      environment: original.environment,
      artifacts: [...original.artifacts],
      startedAt: Date.now(),
      metadata: {
        rollbackOf: deploymentId,
        previousVersion: original.version,
      },
    };

    this.deployments.set(id, rollback);

    // Simulate rollback success
    rollback.status = 'rolled_back';
    rollback.completedAt = Date.now();

    const duration = rollback.completedAt - rollback.startedAt;
    this.deploymentTimes.push(duration);

    return rollback;
  }

  /**
   * Get deployment status
   */
  getStatus(deploymentId: string): Deployment | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Get all deployments
   */
  getDeployments(): Deployment[] {
    return Array.from(this.deployments.values());
  }

  /**
   * Get active (in_progress) deployments
   */
  getActiveDeployments(): Deployment[] {
    return Array.from(this.deployments.values()).filter(d => d.status === 'in_progress');
  }

  /**
   * Get deployment history
   */
  getHistory(): Deployment[] {
    return [...this.history];
  }

  /**
   * Get current snapshot of deployer state
   */
  getSnapshot(): DeploymentSnapshot {
    const deploymentsObj: Record<string, Deployment> = {};
    this.deployments.forEach((d, id) => { deploymentsObj[id] = d; });

    const avgTime = this.deploymentTimes.length > 0
      ? this.deploymentTimes.reduce((a, b) => a + b, 0) / this.deploymentTimes.length
      : 0;

    return {
      deployments: deploymentsObj,
      history: [...this.history],
      metrics: {
        totalDeployments: this.totalDeployments,
        successfulDeployments: this.successfulDeployments,
        failedDeployments: this.failedDeployments,
        rollbacks: this.rollbacks,
        activeDeployments: this.getActiveDeployments().length,
        averageDeploymentTime: Math.round(avgTime),
      },
    };
  }

  /**
   * Reset all deployer state
   */
  reset(): void {
    // Save current deployments to history before reset
    this.deployments.forEach(d => {
      if (d.status === 'deployed' || d.status === 'rolled_back') {
        this.history.push(d);
      }
    });
    
    this.deployments.clear();
    this.totalDeployments = 0;
    this.successfulDeployments = 0;
    this.failedDeployments = 0;
    this.rollbacks = 0;
    this.deploymentTimes = [];
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Deployer Report ===',
      `Total Deployments: ${snap.metrics.totalDeployments}`,
      `Successful: ${snap.metrics.successfulDeployments}`,
      `Failed: ${snap.metrics.failedDeployments}`,
      `Rollbacks: ${snap.metrics.rollbacks}`,
      `Active: ${snap.metrics.activeDeployments}`,
      `Avg Time: ${snap.metrics.averageDeploymentTime}ms`,
      '',
      'Active Deployments:',
    ];

    const active = this.getActiveDeployments();
    if (active.length === 0) {
      lines.push('  (none)');
    } else {
      active.forEach(d => {
        lines.push(`  [${d.id}] ${d.name}@${d.version} (${d.status})`);
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
      totalDeployments: snap.metrics.totalDeployments,
      successfulDeployments: snap.metrics.successfulDeployments,
      failedDeployments: snap.metrics.failedDeployments,
      rollbacks: snap.metrics.rollbacks,
      activeDeployments: snap.metrics.activeDeployments,
      averageDeploymentTime: snap.metrics.averageDeploymentTime,
      deploymentCount: Object.keys(snap.deployments).length,
      historyCount: snap.history.length,
    };
  }

  // Private helper methods
  private getPreviousVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length >= 2) {
      const minor = parseInt(parts[1], 10) - 1;
      return `${parts[0]}.${minor}.0`;
    }
    return '0.0.1';
  }
}

export default Deployer;