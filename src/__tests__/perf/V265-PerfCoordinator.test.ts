import { describe, it, expect } from 'vitest';
import {
  createCoordinatorState, addBudget, reserveTokens, releaseReservation,
  consumeTokens, getBudget, getAvailableTokens, getCoordinatorReport,
} from '../../perf/V265-PerfCoordinator';

describe('V265 PerfCoordinator', () => {
  it('should create empty state', () => {
    const s = createCoordinatorState();
    expect(s.budgets.size).toBe(0);
  });

  it('should add budget', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    expect(s.budgets.size).toBe(1);
  });

  it('should reserve within budget', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    const r = reserveTokens(s, 'tokens', 100, 'agent1');
    expect(r.allowed).toBe(true);
    expect(r.reservationId).toBeDefined();
  });

  it('should reject when over budget', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 100, 1000);
    const r = reserveTokens(s, 'tokens', 200, 'agent1');
    expect(r.allowed).toBe(false);
  });

  it('should release reservation', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    const r = reserveTokens(s, 'tokens', 100, 'agent1');
    s = releaseReservation(r.state, 'tokens', r.reservationId!);
    expect(getAvailableTokens(s, 'tokens')).toBe(1000);
  });

  it('should consume tokens', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    s = consumeTokens(s, 'tokens', 200);
    expect(getBudget(s, 'tokens')!.usedTokens).toBe(200);
  });

  it('should get available tokens', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    s = consumeTokens(s, 'tokens', 200);
    expect(getAvailableTokens(s, 'tokens')).toBe(800);
  });

  it('should reject for missing budget', () => {
    const s = createCoordinatorState();
    const r = reserveTokens(s, 'missing', 100, 'a');
    expect(r.allowed).toBe(false);
  });

  it('should release non-existent reservation gracefully', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    s = releaseReservation(s, 'tokens', 'nonexistent');
    expect(getAvailableTokens(s, 'tokens')).toBe(1000);
  });

  it('should not count reservations after consume', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    s = consumeTokens(s, 'tokens', 100);
    expect(getAvailableTokens(s, 'tokens')).toBe(900);
  });

  it('should produce report', () => {
    let s = createCoordinatorState();
    s = addBudget(s, 'tokens', 1000, 1000);
    s = consumeTokens(s, 'tokens', 100);
    const r = getCoordinatorReport(s);
    expect(r.byBudget.tokens).toBe(100);
  });
});
