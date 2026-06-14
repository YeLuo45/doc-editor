import { describe, it, expect } from 'vitest';
import {
  createConsensusState, majorityVote, weightedVote, unanimousVote, bestOfVote, mergeVote,
  reachConsensus, getConsensusRounds, getConsensusReport,
  type AgentVote,
} from '../../forge/V208-AgentConsensus';

describe('V208 AgentConsensus', () => {
  it('should create empty state', () => {
    const s = createConsensusState();
    expect(s.rounds).toHaveLength(0);
  });

  it('should do majority vote', () => {
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'yes', confidence: 0.5, weight: 1 },
      { agentId: 'b', value: 'yes', confidence: 0.5, weight: 1 },
      { agentId: 'c', value: 'no', confidence: 0.5, weight: 1 },
    ];
    const r = majorityVote(votes);
    expect(r.result).toBe('yes');
    expect(r.agreement).toBeCloseTo(0.666, 2);
  });

  it('should do weighted vote', () => {
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'yes', confidence: 0.9, weight: 1 },
      { agentId: 'b', value: 'no', confidence: 0.1, weight: 1 },
    ];
    const r = weightedVote(votes);
    expect(r.result).toBe('yes');
  });

  it('should do unanimous vote', () => {
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'x', confidence: 0.5, weight: 1 },
      { agentId: 'b', value: 'x', confidence: 0.5, weight: 1 },
    ];
    const r = unanimousVote(votes);
    expect(r.result).toBe('x');
    expect(r.agreement).toBe(1);
  });

  it('should fail unanimous on disagreement', () => {
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'x', confidence: 0.5, weight: 1 },
      { agentId: 'b', value: 'y', confidence: 0.5, weight: 1 },
    ];
    const r = unanimousVote(votes);
    expect(r.result).toBeNull();
    expect(r.agreement).toBe(0);
  });

  it('should do best_of vote', () => {
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'low', confidence: 0.3, weight: 1 },
      { agentId: 'b', value: 'high', confidence: 0.9, weight: 1 },
    ];
    const r = bestOfVote(votes);
    expect(r.result).toBe('high');
  });

  it('should merge votes', () => {
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'x', confidence: 0.9, weight: 1 },
      { agentId: 'b', value: 'y', confidence: 0.5, weight: 1 },
    ];
    const r = mergeVote(votes);
    expect(Array.isArray(r.result)).toBe(true);
    expect((r.result as any[])).toContain('x');
    expect((r.result as any[])).toContain('y');
  });

  it('should reach consensus via strategy', () => {
    const s = createConsensusState();
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'x', confidence: 0.9, weight: 1 },
      { agentId: 'b', value: 'x', confidence: 0.9, weight: 1 },
    ];
    const newState = reachConsensus(s, votes, 'majority');
    expect(newState.rounds).toHaveLength(1);
  });

  it('should handle empty votes', () => {
    const r = majorityVote([]);
    expect(r.result).toBeNull();
    expect(r.participatingAgents).toBe(0);
  });

  it('should produce report', () => {
    let s = createConsensusState();
    const votes: AgentVote[] = [
      { agentId: 'a', value: 'x', confidence: 0.9, weight: 1 },
      { agentId: 'b', value: 'x', confidence: 0.9, weight: 1 },
    ];
    s = reachConsensus(s, votes, 'majority');
    const r = getConsensusReport(s);
    expect(r.rounds).toBe(1);
    expect(r.totalVotes).toBe(2);
  });

  it('should get consensus rounds', () => {
    let s = createConsensusState();
    s = reachConsensus(s, [{ agentId: 'a', value: 'x', confidence: 0.9, weight: 1 }], 'majority');
    expect(getConsensusRounds(s)).toHaveLength(1);
  });
});
