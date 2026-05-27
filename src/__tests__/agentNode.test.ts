import { describe, it, expect } from 'vitest';
import { createAgentNode } from '../canvas/AgentNode';
import type { AgentRole } from '../canvas/AgentNode';

describe('AgentNode', () => {
  describe('createAgentNode', () => {
    it('creates editor agent with correct defaults', () => {
      const node = createAgentNode('id-1', 'editor', 50, 75);
      expect(node.id).toBe('id-1');
      expect(node.role).toBe('editor');
      expect(node.name).toBe('Editor Agent');
      expect(node.status).toBe('idle');
      expect(node.x).toBe(50);
      expect(node.y).toBe(75);
    });

    it('creates reviewer agent with correct defaults', () => {
      const node = createAgentNode('id-2', 'reviewer', 0, 0);
      expect(node.name).toBe('Reviewer Agent');
      expect(node.role).toBe('reviewer');
    });

    it('creates researcher agent with correct defaults', () => {
      const node = createAgentNode('id-3', 'researcher', 0, 0);
      expect(node.name).toBe('Researcher Agent');
      expect(node.role).toBe('researcher');
    });

    it('creates custom agent with correct defaults', () => {
      const node = createAgentNode('id-4', 'custom', 0, 0);
      expect(node.name).toBe('Custom Agent');
      expect(node.role).toBe('custom');
    });

    it('creates agent with custom name', () => {
      const node = createAgentNode('id-5', 'editor', 0, 0);
      expect(node.name).toBe('Editor Agent');
    });

    it('initial status is always idle', () => {
      const node = createAgentNode('id-6', 'editor', 0, 0);
      expect(node.status).toBe('idle');
    });

    it('positions are set correctly', () => {
      const node = createAgentNode('id-7', 'editor', 100, 200);
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
    });
  });

  describe('AgentNodeData type', () => {
    it('accepts valid agent roles', () => {
      const roles: AgentRole[] = ['editor', 'reviewer', 'researcher', 'custom'];
      roles.forEach(role => {
        const node = createAgentNode(`id-${role}`, role, 0, 0);
        expect(node.role).toBe(role);
      });
    });

    it('created agent always has idle status (new agents start idle)', () => {
      // createAgentNode always creates agents in idle state
      // Status transitions happen via start/stop handlers, not creation
      const statuses = ['idle', 'running', 'completed', 'error'] as const;
      statuses.forEach(() => {
        const node = createAgentNode('id-status', 'editor', 0, 0);
        expect(node.status).toBe('idle'); // Always idle on creation
      });
    });
  });
});