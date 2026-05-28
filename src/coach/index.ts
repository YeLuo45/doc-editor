/**
 * Writing Coach - Main Index
 * V24 Self-Evolution Writing Coach (Direction C)
 */

export { WritingCoach } from './WritingCoach';
export type {
  CoachSuggestion,
  CoachSnapshot,
  CoachReport,
  CoachMetrics,
} from './WritingCoach';

export { WritingStyle } from './WritingStyle';
export type {
  StyleAnalysisResult,
  ToneAnalysis,
  ClarityAnalysis,
  StructureAnalysis,
  StyleSnapshot,
  StyleReport,
  StyleMetrics,
} from './WritingStyle';

export { WritingFeedback } from './WritingFeedback';
export type {
  FeedbackItem,
  FeedbackPrioritization,
  FeedbackSnapshot,
  FeedbackReport,
  FeedbackMetrics,
} from './WritingFeedback';

export { WritingGoals } from './WritingGoals';
export type {
  WritingGoal,
  GoalProgress,
  GoalEvaluation,
  GoalsSnapshot,
  GoalsReport,
  GoalsMetrics,
} from './WritingGoals';

export { WritingPlan } from './WritingPlan';
export type {
  WritingPlanItem,
  WritingPlan,
  PlanSummary,
  PlanSnapshot,
  PlanReport,
  PlanMetrics,
} from './WritingPlan';

export { WritingSession } from './WritingSession';
export type {
  SessionStatus,
  SessionMetrics,
  WritingSession as Session,
  SessionSnapshot,
  SessionReport,
  SessionMetricsExport,
} from './WritingSession';

export type {
  WritingPattern,
  SentenceMetrics,
  TextAnalysis,
  L3Skill,
} from './types';