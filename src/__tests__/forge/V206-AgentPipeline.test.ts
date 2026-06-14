import { describe, it, expect } from 'vitest';
import {
  createPipelineState, addPhase, startPipeline, completePhase, failPhase,
  getCurrentPhase, getPhaseByName, getPassedPhases, getFailedPhases, getPipelineReport,
} from '../../forge/V206-AgentPipeline';

describe('V206 AgentPipeline', () => {
  it('should create empty state', () => {
    const s = createPipelineState();
    expect(s.phases).toHaveLength(0);
  });

  it('should add phase', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    expect(s.phases).toHaveLength(1);
  });

  it('should start pipeline', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = startPipeline(s);
    expect(s.startedAt).toBeGreaterThan(0);
    expect(s.phases[0].status).toBe('running');
  });

  it('should complete phase and advance', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = addPhase(s, 'code', 'b');
    s = startPipeline(s);
    s = completePhase(s, { design: 'ok' });
    expect(s.phases[0].status).toBe('passed');
    expect(s.phases[1].status).toBe('running');
  });

  it('should complete all phases', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = addPhase(s, 'code', 'b');
    s = startPipeline(s);
    s = completePhase(s, {});
    s = completePhase(s, {});
    expect(s.success).toBe(true);
    expect(s.completedAt).toBeDefined();
  });

  it('should fail phase and skip rest', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = addPhase(s, 'code', 'b');
    s = startPipeline(s);
    s = failPhase(s, 'design failed');
    expect(s.success).toBe(false);
    expect(s.phases[1].status).toBe('skipped');
  });

  it('should get current phase', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = startPipeline(s);
    expect(getCurrentPhase(s)!.name).toBe('design');
  });

  it('should get phase by name', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = addPhase(s, 'code', 'b');
    expect(getPhaseByName(s, 'code')!.agentId).toBe('b');
  });

  it('should get passed phases', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = addPhase(s, 'code', 'b');
    s = startPipeline(s);
    s = completePhase(s, {});
    expect(getPassedPhases(s)).toHaveLength(1);
  });

  it('should get failed phases', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = startPipeline(s);
    s = failPhase(s, 'fail');
    expect(getFailedPhases(s)).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createPipelineState();
    s = addPhase(s, 'design', 'a');
    s = startPipeline(s);
    s = completePhase(s, {});
    const r = getPipelineReport(s);
    expect(r.totalPhases).toBe(1);
    expect(r.passed).toBe(1);
  });
});
