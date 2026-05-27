import { describe, it, expect } from 'vitest';
import { createPhaseGate, getNextPhase, getPrevPhase } from '../canvas/PhaseGate';
import type { PhaseType } from '../canvas/PhaseGate';

describe('PhaseGate', () => {
  describe('createPhaseGate', () => {
    it('creates design phase with correct defaults', () => {
      const gate = createPhaseGate('id-1', 'design', 50, 75);
      expect(gate.id).toBe('id-1');
      expect(gate.phase).toBe('design');
      expect(gate.name).toBe('Design Phase');
      expect(gate.x).toBe(50);
      expect(gate.y).toBe(75);
      expect(gate.guardEnabled).toBe(false); // design has no guard
      expect(gate.approved).toBe(false);
    });

    it('creates edit phase with guard enabled', () => {
      const gate = createPhaseGate('id-2', 'edit', 0, 0);
      expect(gate.guardEnabled).toBe(true);
      expect(gate.phase).toBe('edit');
    });

    it('creates review phase with guard enabled', () => {
      const gate = createPhaseGate('id-3', 'review', 0, 0);
      expect(gate.guardEnabled).toBe(true);
      expect(gate.phase).toBe('review');
    });

    it('creates publish phase with guard enabled', () => {
      const gate = createPhaseGate('id-4', 'publish', 0, 0);
      expect(gate.guardEnabled).toBe(true);
      expect(gate.phase).toBe('publish');
    });

    it('name follows pattern Phase', () => {
      const phases: PhaseType[] = ['design', 'edit', 'review', 'publish'];
      phases.forEach(phase => {
        const gate = createPhaseGate(`id-${phase}`, phase, 0, 0);
        expect(gate.name).toBe(`${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`);
      });
    });

    it('positions are set correctly', () => {
      const gate = createPhaseGate('id-5', 'design', 100, 200);
      expect(gate.x).toBe(100);
      expect(gate.y).toBe(200);
    });

    it('approved is always false initially', () => {
      const gate = createPhaseGate('id-6', 'edit', 0, 0);
      expect(gate.approved).toBe(false);
    });

    it('guardEnabled is true for non-design phases', () => {
      const nonDesignPhases: PhaseType[] = ['edit', 'review', 'publish'];
      nonDesignPhases.forEach(phase => {
        const gate = createPhaseGate(`id-${phase}`, phase, 0, 0);
        expect(gate.guardEnabled).toBe(true);
      });
    });

    it('guardEnabled is false for design phase', () => {
      const gate = createPhaseGate('id-design', 'design', 0, 0);
      expect(gate.guardEnabled).toBe(false);
    });
  });

  describe('getNextPhase', () => {
    it('returns edit for design', () => {
      expect(getNextPhase('design')).toBe('edit');
    });

    it('returns review for edit', () => {
      expect(getNextPhase('edit')).toBe('review');
    });

    it('returns publish for review', () => {
      expect(getNextPhase('review')).toBe('publish');
    });

    it('returns null for publish (last phase)', () => {
      expect(getNextPhase('publish')).toBeNull();
    });

    it('is symmetric with getPrevPhase', () => {
      const phases: PhaseType[] = ['design', 'edit', 'review', 'publish'];
      phases.forEach(phase => {
        const next = getNextPhase(phase);
        if (next) {
          expect(getPrevPhase(next)).toBe(phase);
        }
      });
    });
  });

  describe('getPrevPhase', () => {
    it('returns null for design (first phase)', () => {
      expect(getPrevPhase('design')).toBeNull();
    });

    it('returns design for edit', () => {
      expect(getPrevPhase('edit')).toBe('design');
    });

    it('returns edit for review', () => {
      expect(getPrevPhase('review')).toBe('edit');
    });

    it('returns review for publish', () => {
      expect(getPrevPhase('publish')).toBe('review');
    });

    it('is symmetric with getNextPhase', () => {
      const phases: PhaseType[] = ['design', 'edit', 'review', 'publish'];
      phases.forEach(phase => {
        const prev = getPrevPhase(phase);
        if (prev) {
          expect(getNextPhase(prev)).toBe(phase);
        }
      });
    });
  });

  describe('PhaseType enum values', () => {
    it('has all four phase types', () => {
      const phases: PhaseType[] = ['design', 'edit', 'review', 'publish'];
      expect(phases).toHaveLength(4);
    });

    it('can create gates for all phase types', () => {
      const phases: PhaseType[] = ['design', 'edit', 'review', 'publish'];
      phases.forEach((phase, index) => {
        const gate = createPhaseGate(`id-${index}`, phase, 0, 0);
        expect(gate.phase).toBe(phase);
      });
    });
  });

  describe('PhaseGateData structure', () => {
    it('has all required fields', () => {
      const gate = createPhaseGate('test-id', 'design', 100, 200);
      expect(gate).toHaveProperty('id');
      expect(gate).toHaveProperty('phase');
      expect(gate).toHaveProperty('name');
      expect(gate).toHaveProperty('x');
      expect(gate).toHaveProperty('y');
      expect(gate).toHaveProperty('guardEnabled');
      expect(gate).toHaveProperty('approved');
    });

    it('guardEnabled and approved are boolean', () => {
      const gate = createPhaseGate('test', 'edit', 0, 0);
      expect(typeof gate.guardEnabled).toBe('boolean');
      expect(typeof gate.approved).toBe('boolean');
    });
  });
});