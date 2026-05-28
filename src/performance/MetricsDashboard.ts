/**
 * MetricsDashboard - Metrics Dashboard
 * Aggregates KPIs from Hook, MCP, Sync, and Coach modules.
 */

import { PerfProfiler } from './PerfProfiler';
import type { ProfilerSummary } from './PerfProfiler';

export type ModuleCategory = 'Hook' | 'MCP' | 'Sync' | 'Coach' | 'Other';

export interface ModuleKPI {
  moduleName: string;
  category: ModuleCategory;
  callCount: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
  memoryUsage: number;
  healthScore: number;
  timestamp: number;
}

export interface CategoryKPI {
  category: ModuleCategory;
  totalCalls: number;
  avgResponseTime: number;
  totalMemory: number;
  moduleCount: number;
  healthScore: number;
}

export interface DashboardSnapshot {
  timestamp: number;
  totalModules: number;
  categories: CategoryKPI[];
  topModules: ModuleKPI[];
  overallHealthScore: number;
}

const HEALTH_MEMORY_THRESHOLD = 50 * 1024 * 1024; // 50MB
const HEALTH_TIME_THRESHOLD = 1000; // 1 second

export class MetricsDashboard {
  private profiler: PerfProfiler;
  private categoryMap: Map<string, ModuleCategory>;
  private snapshots: DashboardSnapshot[] = [];
  private maxSnapshots: number = 100;

  constructor(profiler?: PerfProfiler) {
    this.profiler = profiler ?? new PerfProfiler();
    this.categoryMap = new Map();
    this.initializeCategoryMap();
  }

  /**
   * Initialize default category mappings
   */
  private initializeCategoryMap(): void {
    // Hook modules
    this.categoryMap.set('hookRegistry', 'Hook');
    this.categoryMap.set('hookLifecycle', 'Hook');
    this.categoryMap.set('adaptiveSuggestions', 'Hook');

    // MCP modules
    this.categoryMap.set('mcpServer', 'MCP');
    this.categoryMap.set('toolRegistry', 'MCP');
    this.categoryMap.set('resourceRegistry', 'MCP');
    this.categoryMap.set('providerFactory', 'MCP');

    // Sync modules
    this.categoryMap.set('syncStorage', 'Sync');
    this.categoryMap.set('conflictResolver', 'Sync');

    // Coach modules
    this.categoryMap.set('writingCoach', 'Coach');
    this.categoryMap.set('writingStyleAnalyzer', 'Coach');
    this.categoryMap.set('styleCrystallizer', 'Coach');
  }

  /**
   * Register a module to a category
   */
  registerModule(moduleName: string, category: ModuleCategory): void {
    this.categoryMap.set(moduleName, category);
  }

  /**
   * Get category for a module
   */
  private getCategory(moduleName: string): ModuleCategory {
    return this.categoryMap.get(moduleName) ?? 'Other';
  }

  /**
   * Calculate health score for a module
   */
  private calculateHealthScore(kpi: ProfilerSummary): number {
    let score = 100;

    // Memory impact (max 50 points deduction)
    const memoryMB = kpi.totalMemory / (1024 * 1024);
    if (memoryMB > HEALTH_MEMORY_THRESHOLD / (1024 * 1024)) {
      score -= Math.min(50, (memoryMB - HEALTH_MEMORY_THRESHOLD / (1024 * 1024)) * 2);
    }

    // Time impact (max 50 points deduction)
    if (kpi.totalTime > HEALTH_TIME_THRESHOLD) {
      score -= Math.min(50, (kpi.totalTime - HEALTH_TIME_THRESHOLD) / 100);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Get KPI for a specific module
   */
  getModuleKPI(moduleName: string): ModuleKPI | null {
    const summary = this.profiler.getModuleSummary(moduleName);
    if (!summary) {
      return null;
    }

    const category = this.getCategory(moduleName);
    const memoryMB = summary.totalMemory / (1024 * 1024);
    const healthScore = this.calculateHealthScore(summary);

    return {
      moduleName,
      category,
      callCount: summary.callCount,
      avgExecutionTime: summary.avgTime,
      totalExecutionTime: summary.totalTime,
      memoryUsage: memoryMB,
      healthScore,
      timestamp: Date.now(),
    };
  }

  /**
   * Get KPIs for all modules
   */
  getAllKPIs(): ModuleKPI[] {
    const summaries = this.profiler.getAllSummaries();
    return summaries.map((summary) => {
      const category = this.getCategory(summary.moduleName);
      const memoryMB = summary.totalMemory / (1024 * 1024);
      const healthScore = this.calculateHealthScore(summary);

      return {
        moduleName: summary.moduleName,
        category,
        callCount: summary.callCount,
        avgExecutionTime: summary.avgTime,
        totalExecutionTime: summary.totalTime,
        memoryUsage: memoryMB,
        healthScore,
        timestamp: Date.now(),
      };
    });
  }

  /**
   * Get KPIs grouped by category
   */
  getKPIsByCategory(): Map<ModuleCategory, ModuleKPI[]> {
    const kpis = this.getAllKPIs();
    const result = new Map<ModuleCategory, ModuleKPI[]>();

    kpis.forEach((kpi) => {
      const existing = result.get(kpi.category) ?? [];
      existing.push(kpi);
      result.set(kpi.category, existing);
    });

    return result;
  }

  /**
   * Get category summary KPI
   */
  getCategoryKPI(category: ModuleCategory): CategoryKPI | null {
    const categoryKPIs = this.getKPIsByCategory().get(category);
    if (!categoryKPIs || categoryKPIs.length === 0) {
      return null;
    }

    const totalCalls = categoryKPIs.reduce((sum, kpi) => sum + kpi.callCount, 0);
    const totalTime = categoryKPIs.reduce((sum, kpi) => sum + kpi.totalExecutionTime, 0);
    const totalMemory = categoryKPIs.reduce((sum, kpi) => sum + kpi.memoryUsage, 0);
    const avgResponseTime = totalCalls > 0 ? totalTime / totalCalls : 0;
    const healthScore = Math.round(
      categoryKPIs.reduce((sum, kpi) => sum + kpi.healthScore, 0) / categoryKPIs.length
    );

    return {
      category,
      totalCalls,
      avgResponseTime,
      totalMemory,
      moduleCount: categoryKPIs.length,
      healthScore,
    };
  }

  /**
   * Get all category summaries
   */
  getAllCategoryKPIs(): CategoryKPI[] {
    const categories: ModuleCategory[] = ['Hook', 'MCP', 'Sync', 'Coach', 'Other'];
    const results: CategoryKPI[] = [];

    categories.forEach((category) => {
      const kpi = this.getCategoryKPI(category);
      if (kpi) {
        results.push(kpi);
      }
    });

    return results;
  }

  /**
   * Get top N modules by call count
   */
  getTopModulesByCalls(count: number = 5): ModuleKPI[] {
    const kpis = this.getAllKPIs();
    return kpis
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, count);
  }

  /**
   * Get top N modules by execution time
   */
  getTopModulesByTime(count: number = 5): ModuleKPI[] {
    const kpis = this.getAllKPIs();
    return kpis
      .sort((a, b) => b.totalExecutionTime - a.totalExecutionTime)
      .slice(0, count);
  }

  /**
   * Get top N modules by memory usage
   */
  getTopModulesByMemory(count: number = 5): ModuleKPI[] {
    const kpis = this.getAllKPIs();
    return kpis
      .sort((a, b) => b.memoryUsage - a.memoryUsage)
      .slice(0, count);
  }

  /**
   * Get current dashboard snapshot
   */
  getSnapshot(): DashboardSnapshot {
    const allKPIs = this.getAllKPIs();
    const categoryKPIs = this.getAllCategoryKPIs();
    const topModules = allKPIs
      .sort((a, b) => b.healthScore - a.healthScore)
      .slice(0, 10);

    const overallHealthScore =
      categoryKPIs.length > 0
        ? Math.round(
            categoryKPIs.reduce((sum, cat) => sum + cat.healthScore, 0) / categoryKPIs.length
          )
        : 100;

    return {
      timestamp: Date.now(),
      totalModules: allKPIs.length,
      categories: categoryKPIs,
      topModules,
      overallHealthScore,
    };
  }

  /**
   * Save a snapshot
   */
  saveSnapshot(): void {
    const snapshot = this.getSnapshot();
    this.snapshots.push(snapshot);

    // Limit stored snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  /**
   * Get historical snapshots
   */
  getSnapshots(): DashboardSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
  }

  /**
   * Get the underlying profiler
   */
  getProfiler(): PerfProfiler {
    return this.profiler;
  }
}

export const defaultDashboard = new MetricsDashboard();