import { describe, it, expect } from 'vitest';
import {
  createTrustOrchestratorState, registerTrustEngine, registerAllTrustEngines,
  updateTrustEngine, deactivateTrustEngine, getTrustEngineSnapshot, getAllTrustSnapshots, getTrustOrchestratorReport,
  V275_V302_ENGINES,
} from '../../trust/V303-TrustOrchestrator';

describe('V303 TrustOrchestrator', () => {
  it('should create empty state', () => {
    const s = createTrustOrchestratorState();
    expect(s.engines.size).toBe(0);
  });

  it('should register engine', () => {
    let s = createTrustOrchestratorState();
    s = registerTrustEngine(s, { id: 'V275', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    expect(s.engines.size).toBe(1);
  });

  it('should register all 28 engines', () => {
    let s = createTrustOrchestratorState();
    s = registerAllTrustEngines(s, V275_V302_ENGINES);
    expect(s.engines.size).toBe(28);
  });

  it('should compute density/coherence/resonance', () => {
    let s = createTrustOrchestratorState();
    s = registerAllTrustEngines(s, V275_V302_ENGINES);
    expect(s.density).toBeGreaterThan(0);
    expect(s.coherence).toBeGreaterThan(0);
    expect(s.resonance).toBeGreaterThan(0);
  });

  it('should update engine', () => {
    let s = createTrustOrchestratorState();
    s = registerTrustEngine(s, { id: 'V275', category: 'thunderbolt', score: 0.5, metric: 0.5, active: true });
    s = updateTrustEngine(s, 'V275', 0.9, 0.9);
    expect(getTrustEngineSnapshot(s, 'V275')!.score).toBe(0.9);
  });

  it('should deactivate engine', () => {
    let s = createTrustOrchestratorState();
    s = registerTrustEngine(s, { id: 'V275', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    s = deactivateTrustEngine(s, 'V275');
    expect(s.engines.get('V275')!.active).toBe(false);
  });

  it('should track categories', () => {
    let s = createTrustOrchestratorState();
    s = registerAllTrustEngines(s, V275_V302_ENGINES);
    const r = getTrustOrchestratorReport(s);
    expect(r.byCategory.thunderbolt).toBe(8);
    expect(r.byCategory.nanobot).toBe(7);
    expect(r.byCategory.ruflo).toBe(5);
    expect(r.byCategory.chatdev).toBe(4);
    expect(r.byCategory['generic-agent']).toBe(4);
  });

  it('should produce report', () => {
    let s = createTrustOrchestratorState();
    s = registerAllTrustEngines(s, V275_V302_ENGINES);
    const r = getTrustOrchestratorReport(s);
    expect(r.total).toBe(28);
  });

  it('should get all snapshots', () => {
    let s = createTrustOrchestratorState();
    s = registerAllTrustEngines(s, V275_V302_ENGINES);
    expect(getAllTrustSnapshots(s)).toHaveLength(28);
  });

  it('should have 28 active engines', () => {
    let s = createTrustOrchestratorState();
    s = registerAllTrustEngines(s, V275_V302_ENGINES);
    expect(s.activeEngines).toBe(28);
  });
});
