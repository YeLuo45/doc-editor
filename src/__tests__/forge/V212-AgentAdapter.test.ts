import { describe, it, expect } from 'vitest';
import {
  createAdapterState, setAgentConfig, adaptAgent, recordEffectiveness,
  revertAdaptation, getAdaptationsForAgent, getConfig, clearAdaptations, getAdapterReport,
} from '../../forge/V212-AgentAdapter';

describe('V212 AgentAdapter', () => {
  it('should create empty state', () => {
    const s = createAdapterState();
    expect(s.adaptations.size).toBe(0);
  });

  it('should set agent config', () => {
    let s = createAdapterState();
    s = setAgentConfig(s, 'a', { temp: 0.7 });
    expect(s.agentConfig.size).toBe(1);
  });

  it('should adapt agent', () => {
    let s = createAdapterState();
    s = setAgentConfig(s, 'a', { temp: 0.7 });
    s = adaptAgent(s, 'a', 'user_input', { temp: 0.5 }, 'user prefers conservative');
    expect(s.adaptations.size).toBe(1);
    expect(getConfig(s, 'a').temp).toBe(0.5);
  });

  it('should record effectiveness', () => {
    let s = createAdapterState();
    s = setAgentConfig(s, 'a', { temp: 0.7 });
    s = adaptAgent(s, 'a', 'user_input', { temp: 0.5 }, 'reason');
    const id = Array.from(s.adaptations.keys())[0];
    s = recordEffectiveness(s, id, 0.8);
    expect(s.adaptations.get(id)!.effectiveness).toBe(0.8);
  });

  it('should revert adaptation', () => {
    let s = createAdapterState();
    s = setAgentConfig(s, 'a', { temp: 0.7 });
    s = adaptAgent(s, 'a', 'user_input', { temp: 0.5 }, 'reason');
    const id = Array.from(s.adaptations.keys())[0];
    s = revertAdaptation(s, id);
    expect(getConfig(s, 'a').temp).toBe(0.7);
  });

  it('should get adaptations for agent', () => {
    let s = createAdapterState();
    s = adaptAgent(s, 'a', 'user_input', {}, 'r');
    s = adaptAgent(s, 'b', 'user_input', {}, 'r');
    expect(getAdaptationsForAgent(s, 'a')).toHaveLength(1);
  });

  it('should get config', () => {
    let s = createAdapterState();
    s = setAgentConfig(s, 'a', { temp: 0.7 });
    expect(getConfig(s, 'a').temp).toBe(0.7);
  });

  it('should return empty config for unknown', () => {
    const s = createAdapterState();
    expect(getConfig(s, 'unknown')).toEqual({});
  });

  it('should clear adaptations', () => {
    let s = createAdapterState();
    s = adaptAgent(s, 'a', 'user_input', {}, 'r');
    s = clearAdaptations(s);
    expect(s.adaptations.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createAdapterState();
    s = setAgentConfig(s, 'a', { temp: 0.7 });
    s = adaptAgent(s, 'a', 'user_input', { temp: 0.5 }, 'r');
    const id = Array.from(s.adaptations.keys())[0];
    s = recordEffectiveness(s, id, 0.8);
    const r = getAdapterReport(s);
    expect(r.adaptations).toBe(1);
    expect(r.agents).toBe(1);
    expect(r.avgEffectiveness).toBe(0.8);
  });
});
