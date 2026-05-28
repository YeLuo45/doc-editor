/**
 * RenderAnalyzer.ts - React render cycle profiling for doc-editor V22
 */

export interface RenderEvent {
  componentId: string;
  phase: 'mount' | 'update' | 'unmount';
  duration: number;
  timestamp: number;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

export interface ComponentRenderStats {
  componentId: string;
  mountCount: number;
  updateCount: number;
  totalMountTime: number;
  totalUpdateTime: number;
  avgMountTime: number;
  avgUpdateTime: number;
  lastRender: number;
  maxDuration: number;
}

export interface RenderReport {
  totalMounts: number;
  totalUpdates: number;
  totalUnmounts: number;
  avgMountTime: number;
  avgUpdateTime: number;
  slowestComponent: string;
  mostUpdatedComponent: string;
  components: ComponentRenderStats[];
}

export class RenderAnalyzer {
  private events: RenderEvent[] = [];
  private componentStats: Map<string, ComponentRenderStats> = new Map();
  private activeComponents: Set<string> = new Set();

  trackMount(componentId: string, duration: number, props?: Record<string, unknown>): void {
    const event: RenderEvent = {
      componentId,
      phase: 'mount',
      duration,
      timestamp: Date.now(),
      props,
    };
    this.events.push(event);
    this.activeComponents.add(componentId);
    this.updateComponentStats(componentId, 'mount', duration);
  }

  trackUpdate(
    componentId: string,
    duration: number,
    state?: Record<string, unknown>,
    props?: Record<string, unknown>
  ): void {
    const event: RenderEvent = {
      componentId,
      phase: 'update',
      duration,
      timestamp: Date.now(),
      props,
      state,
    };
    this.events.push(event);
    this.updateComponentStats(componentId, 'update', duration);
  }

  trackUnmount(componentId: string, duration: number = 0): void {
    const event: RenderEvent = {
      componentId,
      phase: 'unmount',
      duration,
      timestamp: Date.now(),
    };
    this.events.push(event);
    this.activeComponents.delete(componentId);
    this.updateComponentStats(componentId, 'unmount', duration);
  }

  getRenderStats(componentId?: string): ComponentRenderStats | RenderReport {
    if (componentId) {
      return this.componentStats.get(componentId) || this.createEmptyStats(componentId);
    }
    return this.getReport();
  }

  getReport(): RenderReport {
    const allStats = Array.from(this.componentStats.values());
    const totalMounts = allStats.reduce((sum, s) => sum + s.mountCount, 0);
    const totalUpdates = allStats.reduce((sum, s) => sum + s.updateCount, 0);
    const totalUnmounts = this.events.filter(e => e.phase === 'unmount').length;

    const avgMountTime = totalMounts > 0
      ? allStats.reduce((sum, s) => sum + s.totalMountTime, 0) / totalMounts
      : 0;
    const avgUpdateTime = totalUpdates > 0
      ? allStats.reduce((sum, s) => sum + s.totalUpdateTime, 0) / totalUpdates
      : 0;

    const slowest = allStats.reduce(
      (max, s) => (s.maxDuration > max.maxDuration ? s : max),
      { maxDuration: 0, componentId: '' } as ComponentRenderStats
    );

    const mostUpdated = allStats.reduce(
      (max, s) => (s.updateCount > max.updateCount ? s : max),
      { updateCount: 0, componentId: '' } as ComponentRenderStats
    );

    return {
      totalMounts,
      totalUpdates,
      totalUnmounts,
      avgMountTime,
      avgUpdateTime,
      slowestComponent: slowest.componentId,
      mostUpdatedComponent: mostUpdated.componentId,
      components: allStats,
    };
  }

  getSnapshot(): {
    eventCount: number;
    activeComponents: number;
    totalMounts: number;
    totalUpdates: number;
  } {
    return {
      eventCount: this.events.length,
      activeComponents: this.activeComponents.size,
      totalMounts: this.events.filter(e => e.phase === 'mount').length,
      totalUpdates: this.events.filter(e => e.phase === 'update').length,
    };
  }

  reset(): void {
    this.events = [];
    this.componentStats.clear();
    this.activeComponents.clear();
  }

  exportMetrics(): Record<string, unknown> {
    const report = this.getReport();
    return {
      timestamp: Date.now(),
      summary: {
        totalMounts: report.totalMounts,
        totalUpdates: report.totalUpdates,
        totalUnmounts: report.totalUnmounts,
        avgMountTime: report.avgMountTime,
        avgUpdateTime: report.avgUpdateTime,
      },
      events: this.events.slice(-100).map(e => ({
        componentId: e.componentId,
        phase: e.phase,
        duration: e.duration,
        timestamp: e.timestamp,
      })),
      components: report.components.map(c => ({
        componentId: c.componentId,
        mountCount: c.mountCount,
        updateCount: c.updateCount,
        avgMountTime: c.avgMountTime,
        avgUpdateTime: c.avgUpdateTime,
      })),
    };
  }

  getActiveComponents(): string[] {
    return Array.from(this.activeComponents);
  }

  getRecentEvents(count: number = 10): RenderEvent[] {
    return this.events.slice(-count);
  }

  private updateComponentStats(
    componentId: string,
    phase: 'mount' | 'update' | 'unmount',
    duration: number
  ): void {
    let stats = this.componentStats.get(componentId);
    if (!stats) {
      stats = this.createEmptyStats(componentId);
      this.componentStats.set(componentId, stats);
    }

    stats.lastRender = Date.now();

    if (phase === 'mount') {
      stats.mountCount++;
      stats.totalMountTime += duration;
      stats.avgMountTime = stats.totalMountTime / stats.mountCount;
    } else if (phase === 'update') {
      stats.updateCount++;
      stats.totalUpdateTime += duration;
      stats.avgUpdateTime = stats.totalUpdateTime / stats.updateCount;
    }

    if (duration > stats.maxDuration) {
      stats.maxDuration = duration;
    }
  }

  private createEmptyStats(componentId: string): ComponentRenderStats {
    return {
      componentId,
      mountCount: 0,
      updateCount: 0,
      totalMountTime: 0,
      totalUpdateTime: 0,
      avgMountTime: 0,
      avgUpdateTime: 0,
      lastRender: 0,
      maxDuration: 0,
    };
  }
}

export const defaultRenderAnalyzer = new RenderAnalyzer();