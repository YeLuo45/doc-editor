/**
 * Intelligence Module Index - V28 Intelligence System for doc-editor
 * Exports all intelligence modules
 */

export { IntelligenceEngine } from './IntelligenceEngine';
export type {
  IntelligenceConfig,
  AnalysisResult,
  Snapshot as IntelligenceSnapshot,
} from './IntelligenceEngine';

export { PatternAnalyzer } from './PatternAnalyzer';
export type {
  Pattern,
  TrendAnalysis,
  PatternReport,
  Snapshot as PatternSnapshot,
} from './PatternAnalyzer';

export { AdaptiveOptimizer } from './AdaptiveOptimizer';
export type {
  OptimizationTarget,
  OptimizationResult,
  Recommendation,
  Snapshot as OptimizerSnapshot,
} from './AdaptiveOptimizer';

export { ContextBuilder } from './ContextBuilder';
export type {
  ContextData,
  ParsedContext,
  BuildOptions,
  Snapshot as ContextSnapshot,
} from './ContextBuilder';

export { LearningEngine } from './LearningEngine';
export type {
  LearningSample,
  PredictionResult,
  Insight,
  Snapshot as LearningSnapshot,
} from './LearningEngine';

export { IntelligenceMetrics } from './IntelligenceMetrics';
export type {
  MetricEntry,
  MetricsSnapshot,
  MetricsHistory,
  Snapshot as MetricsSnapshotData,
} from './IntelligenceMetrics';