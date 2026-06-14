import { describe, it, expect } from 'vitest';
import {
  createDocFederationOrchestratorState, registerSyncEngine, registerAllSyncEngines,
  updateSyncEngine, deactivateSyncEngine, getSyncEngineSnapshot, getAllSyncSnapshots, getDocFederationOrchestratorReport,
  V215_V242_ENGINES,
} from '../../federation/V243-DocFederationOrchestrator';

describe('V243 DocFederationOrchestrator', () => {
  it('should create empty state', () => {
    const s = createDocFederationOrchestratorState();
    expect(s.engines.size).toBe(0);
  });

  it('should register engine', () => {
    let s = createDocFederationOrchestratorState();
    s = registerSyncEngine(s, { id: 'V215', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    expect(s.engines.size).toBe(1);
  });

  it('should register all 28 engines', () => {
    let s = createDocFederationOrchestratorState();
    s = registerAllSyncEngines(s, V215_V242_ENGINES);
    expect(s.engines.size).toBe(28);
  });

  it('should compute density/coherence/resonance', () => {
    let s = createDocFederationOrchestratorState();
    s = registerAllSyncEngines(s, V215_V242_ENGINES);
    expect(s.density).toBeGreaterThan(0);
    expect(s.coherence).toBeGreaterThan(0);
    expect(s.resonance).toBeGreaterThan(0);
  });

  it('should update engine', () => {
    let s = createDocFederationOrchestratorState();
    s = registerSyncEngine(s, { id: 'V215', category: 'thunderbolt', score: 0.5, metric: 0.5, active: true });
    s = updateSyncEngine(s, 'V215', 0.9, 0.9);
    expect(getSyncEngineSnapshot(s, 'V215')!.score).toBe(0.9);
  });

  it('should deactivate engine', () => {
    let s = createDocFederationOrchestratorState();
    s = registerSyncEngine(s, { id: 'V215', category: 'thunderbolt', score: 0.9, metric: 0.8, active: true });
    s = deactivateSyncEngine(s, 'V215');
    expect(s.engines.get('V215')!.active).toBe(false);
  });

  it('should track 8 thunderbolt + 7 nanobot + 5 ruflo + 4 chatdev + 4 generic-agent', () => {
    let s = createDocFederationOrchestratorState();
    s = registerAllSyncEngines(s, V215_V242_ENGINES);
    const r = getDocFederationOrchestratorReport(s);
    expect(r.byCategory.thunderbolt).toBe(8);
    expect(r.byCategory.nanobot).toBe(7);
    expect(r.byCategory.ruflo).toBe(5);
    expect(r.byCategory.chatdev).toBe(4);
    expect(r.byCategory['generic-agent']).toBe(4);
  });

  it('should produce report', () => {
    let s = createDocFederationOrchestratorState();
    s = registerAllSyncEngines(s, V215_V242_ENGINES);
    const r = getDocFederationOrchestratorReport(s);
    expect(r.total).toBe(28);
  });

  it('should get all snapshots', () => {
    let s = createDocFederationOrchestratorState();
    s = registerAllSyncEngines(s, V215_V242_ENGINES);
    expect(getAllSyncSnapshots(s)).toHaveLength(28);
  });

  it('should have 28 active engines', () => {
    let s = createDocFederationOrchestratorState();
    s = registerAllSyncEngines(s, V215_V242_ENGINES);
    expect(s.activeEngines).toBe(28);
  });
});
