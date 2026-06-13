import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFlowStateDetector, recordEvent, getFlowSnapshot,
  resetFlowState, detectTrend, generateRecommendation, getFlowReport,
  type EditEvent, type FlowSnapshot,
} from '../../mind/V155-FlowStateDetector';

describe('V155 FlowStateDetector', () => {
  let state: FlowSnapshot;
  beforeEach(() => { state = createFlowStateDetector(); });

  it('should initialize with cold state', () => {
    expect(state.level).toBe('cold');
    expect(state.score).toBe(0);
    expect(state.events).toEqual([]);
  });

  it('should record insert event and increase score', () => {
    const e: EditEvent = { type: 'insert', timestamp: Date.now(), chars: 30 };
    const next = recordEvent(state, e);
    expect(next.events).toHaveLength(1);
    expect(next.score).toBeGreaterThan(0);
  });

  it('should record pause and decrease score', () => {
    const warm = recordEvent(state, { type: 'insert', timestamp: Date.now(), chars: 100 });
    const afterPause = recordEvent(warm, { type: 'pause', timestamp: Date.now() + 1000, chars: 0 });
    expect(afterPause.score).toBeLessThanOrEqual(warm.score);
  });

  it('should detect rising trend', () => {
    let s = state;
    for (let i = 0; i < 5; i++) {
      s = recordEvent(s, { type: 'insert', timestamp: Date.now() + i, chars: 50 });
    }
    const hist = s.events.map((_, i) => ({ ...s, score: i * 0.15 }));
    expect(detectTrend(hist)).toBe('rising');
  });

  it('should generate recommendation for each level', () => {
    expect(generateRecommendation({ ...state, level: 'cold' })).toContain('热身');
    expect(generateRecommendation({ ...state, level: 'flowing' })).toContain('专注');
    expect(generateRecommendation({ ...state, level: 'transcendent' })).toContain('巅峰');
  });

  it('should reset to defaults', () => {
    const modified = recordEvent(state, { type: 'insert', timestamp: Date.now(), chars: 50 });
    const fresh = resetFlowState();
    expect(fresh.score).toBe(0);
    expect(modified.events).toHaveLength(1);
  });

  it('should produce complete report', () => {
    const s = recordEvent(state, { type: 'insert', timestamp: Date.now(), chars: 30 });
    const report = getFlowReport(s);
    expect(report.current.level).toBeDefined();
    expect(report.trend).toBeDefined();
    expect(report.recommendation).toBeTruthy();
    expect(report.history).toHaveLength(1);
  });

  it('should cap events at 200', () => {
    let s = state;
    for (let i = 0; i < 250; i++) {
      s = recordEvent(s, { type: 'insert', timestamp: Date.now() + i, chars: 1 });
    }
    expect(s.events).toHaveLength(200);
  });

  it('should return deep flow for sustained typing', () => {
    let s = state;
    for (let i = 0; i < 30; i++) {
      s = recordEvent(s, { type: 'insert', timestamp: Date.now() + i * 100, chars: 50 });
    }
    expect(['deep', 'transcendent', 'flowing']).toContain(s.level);
  });

  it('should get snapshot with copied events array', () => {
    const snap = getFlowSnapshot(state);
    expect(snap).not.toBe(state);
    expect(snap.events).not.toBe(state.events);
  });
});
