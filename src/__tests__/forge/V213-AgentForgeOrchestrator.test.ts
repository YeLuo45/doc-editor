import { describe, it, expect } from 'vitest';
import {
  createForgeOrchestratorState, registerEngine, registerAllEngines,
  updateEngineMetric, deactivateEngine, getEngineSnapshot, getAllSnapshots, getForgeOrchestratorReport,
  V185_V212_ENGINES,
} from '../../forge/V213-AgentForgeOrchestrator';

describe('V213 AgentForgeOrchestrator', () => {
  it('should create empty state', () => {
    const s = createForgeOrchestratorState();
    expect(s.engines.size).toBe(0);
  });

  it('should register engine', () => {
    let s = createForgeOrchestratorState();
    s = registerEngine(s, { id: 'V185', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    expect(s.engines.size).toBe(1);
  });

  it('should register all 28 engines', () => {
    let s = createForgeOrchestratorState();
    s = registerAllEngines(s, V185_V212_ENGINES);
    expect(s.engines.size).toBe(28);
  });

  it('should compute density/coherence/resonance', () => {
    let s = createForgeOrchestratorState();
    s = registerAllEngines(s, V185_V212_ENGINES);
    expect(s.density).toBeGreaterThan(0);
    expect(s.coherence).toBeGreaterThan(0);
    expect(s.resonance).toBeGreaterThan(0);
  });

  it('should update engine metric', () => {
    let s = createForgeOrchestratorState();
    s = registerEngine(s, { id: 'V185', category: 'thunderbolt', score: 0.5, metric: 0.5, active: true });
    s = updateEngineMetric(s, 'V185', 0.9, 0.9);
    expect(getEngineSnapshot(s, 'V185')!.score).toBe(0.9);
  });

  it('should deactivate engine', () => {
    let s = createForgeOrchestratorState();
    s = registerEngine(s, { id: 'V185', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    s = deactivateEngine(s, 'V185');
    expect(s.engines.get('V185')!.active).toBe(false);
  });

  it('should track 8 thunderbolt + 7 nanobot + 5 ruflo + 4 chatdev + 4 generic-agent', () => {
    let s = createForgeOrchestratorState();
    s = registerAllEngines(s, V185_V212_ENGINES);
    const r = getForgeOrchestratorReport(s);
    expect(r.byCategory.thunderbolt).toBe(8);
    expect(r.byCategory.nanobot).toBe(7);
    expect(r.byCategory.ruflo).toBe(5);
    expect(r.byCategory.chatdev).toBe(4);
    expect(r.byCategory['generic-agent']).toBe(4);
  });

  it('should produce report', () => {
    let s = createForgeOrchestratorState();
    s = registerAllEngines(s, V185_V212_ENGINES);
    const r = getForgeOrchestratorReport(s);
    expect(r.total).toBe(28);
  });

  it('should get all snapshots', () => {
    let s = createForgeOrchestratorState();
    s = registerAllEngines(s, V185_V212_ENGINES);
    expect(getAllSnapshots(s)).toHaveLength(28);
  });

  it('should have 28 active engines', () => {
    let s = createForgeOrchestratorState();
    s = registerAllEngines(s, V185_V212_ENGINES);
    expect(s.activeEngines).toBe(28);
  });
});
