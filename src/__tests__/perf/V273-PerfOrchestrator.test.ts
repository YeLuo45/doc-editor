import { describe, it, expect } from 'vitest';
import {
  createPerfOrchestratorState, registerPerfEngine, registerAllPerfEngines,
  updatePerfEngine, deactivatePerfEngine, getPerfEngineSnapshot, getAllPerfSnapshots, getPerfOrchestratorReport,
  V245_V272_ENGINES,
} from '../../perf/V273-PerfOrchestrator';

describe('V273 PerfOrchestrator', () => {
  it('should create empty state', () => {
    const s = createPerfOrchestratorState();
    expect(s.engines.size).toBe(0);
  });

  it('should register engine', () => {
    let s = createPerfOrchestratorState();
    s = registerPerfEngine(s, { id: 'V245', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    expect(s.engines.size).toBe(1);
  });

  it('should register all 28 engines', () => {
    let s = createPerfOrchestratorState();
    s = registerAllPerfEngines(s, V245_V272_ENGINES);
    expect(s.engines.size).toBe(28);
  });

  it('should compute density/coherence/resonance', () => {
    let s = createPerfOrchestratorState();
    s = registerAllPerfEngines(s, V245_V272_ENGINES);
    expect(s.density).toBeGreaterThan(0);
    expect(s.coherence).toBeGreaterThan(0);
    expect(s.resonance).toBeGreaterThan(0);
  });

  it('should update engine', () => {
    let s = createPerfOrchestratorState();
    s = registerPerfEngine(s, { id: 'V245', category: 'thunderbolt', score: 0.5, metric: 0.5, active: true });
    s = updatePerfEngine(s, 'V245', 0.9, 0.9);
    expect(getPerfEngineSnapshot(s, 'V245')!.score).toBe(0.9);
  });

  it('should deactivate engine', () => {
    let s = createPerfOrchestratorState();
    s = registerPerfEngine(s, { id: 'V245', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    s = deactivatePerfEngine(s, 'V245');
    expect(s.engines.get('V245')!.active).toBe(false);
  });

  it('should track 8 thunderbolt + 7 nanobot + 5 ruflo + 4 chatdev + 4 generic-agent', () => {
    let s = createPerfOrchestratorState();
    s = registerAllPerfEngines(s, V245_V272_ENGINES);
    const r = getPerfOrchestratorReport(s);
    expect(r.byCategory.thunderbolt).toBe(8);
    expect(r.byCategory.nanobot).toBe(7);
    expect(r.byCategory.ruflo).toBe(5);
    expect(r.byCategory.chatdev).toBe(4);
    expect(r.byCategory['generic-agent']).toBe(4);
  });

  it('should produce report', () => {
    let s = createPerfOrchestratorState();
    s = registerAllPerfEngines(s, V245_V272_ENGINES);
    const r = getPerfOrchestratorReport(s);
    expect(r.total).toBe(28);
  });

  it('should get all snapshots', () => {
    let s = createPerfOrchestratorState();
    s = registerAllPerfEngines(s, V245_V272_ENGINES);
    expect(getAllPerfSnapshots(s)).toHaveLength(28);
  });

  it('should have 28 active engines', () => {
    let s = createPerfOrchestratorState();
    s = registerAllPerfEngines(s, V245_V272_ENGINES);
    expect(s.activeEngines).toBe(28);
  });
});
