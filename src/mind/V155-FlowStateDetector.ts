/**
 * V155 FlowStateDetector - Direction A Writing Mind (Iter 1/30)
 * thunderbolt: real-time feedback loop on writer's flow state
 */
export type FlowLevel = 'cold' | 'warming' | 'flowing' | 'deep' | 'transcendent';

export interface EditEvent {
  type: 'insert' | 'delete' | 'pause' | 'undo' | 'redo';
  timestamp: number;
  chars: number;
}

export interface FlowSnapshot {
  level: FlowLevel;
  score: number;       // 0..1
  events: EditEvent[];
  lastUpdate: number;
}

export interface FlowReport {
  current: FlowSnapshot;
  trend: 'rising' | 'falling' | 'stable';
  history: FlowSnapshot[];
  recommendation: string;
}

const FLOW_THRESHOLDS: Array<{ min: number; level: FlowLevel }> = [
  { min: 0.0,  level: 'cold' },
  { min: 0.2,  level: 'warming' },
  { min: 0.5,  level: 'flowing' },
  { min: 0.75, level: 'deep' },
  { min: 0.9,  level: 'transcendent' },
];

export function createFlowStateDetector(): FlowSnapshot {
  return { level: 'cold', score: 0, events: [], lastUpdate: Date.now() };
}

export function recordEvent(state: FlowSnapshot, event: EditEvent): FlowSnapshot {
  const events = [...state.events, event].slice(-200);
  let score = state.score * 0.85;
  if (event.type === 'insert') score += 0.12 * Math.min(event.chars, 50) / 50;
  else if (event.type === 'delete') score += 0.04 * Math.min(event.chars, 30) / 30;
  else if (event.type === 'pause') score -= 0.05;
  else if (event.type === 'undo') score -= 0.08;
  else if (event.type === 'redo') score += 0.05;
  score = Math.max(0, Math.min(1, score));
  const level = FLOW_THRESHOLDS.reduce((p, t) => score >= t.min ? t.level : p, 'cold' as FlowLevel);
  return { level, score, events, lastUpdate: event.timestamp };
}

export function getFlowSnapshot(state: FlowSnapshot): FlowSnapshot {
  return { ...state, events: [...state.events] };
}

export function resetFlowState(): FlowSnapshot {
  return createFlowStateDetector();
}

export function detectTrend(history: FlowSnapshot[]): 'rising' | 'falling' | 'stable' {
  if (history.length < 2) return 'stable';
  const recent = history.slice(-5);
  const diff = recent[recent.length - 1].score - recent[0].score;
  if (diff > 0.1) return 'rising';
  if (diff < -0.1) return 'falling';
  return 'stable';
}

export function generateRecommendation(state: FlowSnapshot): string {
  if (state.level === 'cold') return '建议先写下今天的小目标，让大脑热身';
  if (state.level === 'warming') return '继续，保持节奏，5-10分钟后进入 flow';
  if (state.level === 'flowing') return '当前状态良好，专注产出';
  if (state.level === 'deep') return '深度专注中，避免被任何通知打断';
  return '心流巅峰，保护这个状态';
}

export function getFlowReport(state: FlowSnapshot, history: FlowSnapshot[] = []): FlowReport {
  const allHistory = [...history, state];
  return {
    current: getFlowSnapshot(state),
    trend: detectTrend(allHistory),
    history: allHistory,
    recommendation: generateRecommendation(state),
  };
}
