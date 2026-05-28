import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from '../agents/AgentRegistry';
import type { AgentManifest, AgentRole } from '../agents/types';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  const createManifest = (
    id: string,
    role: AgentRole = 'planner',
    capabilities: string[] = []
  ): AgentManifest => ({
    id,
    name: `Agent ${id}`,
    role,
    capabilities,
    version: '1.0.0',
    metadata: {},
  });

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register and unregister', () => {
    it('should register and retrieve agent', () => {
      const manifest = createManifest('agent-1', 'planner', ['planning']);
      const result = registry.register(manifest);
      expect(result).toBe(true);
      expect(registry.has('agent-1')).toBe(true);
    });

    it('should throw when registering duplicate agent', () => {
      const manifest = createManifest('agent-1');
      registry.register(manifest);
      expect(() => registry.register(manifest)).toThrow('already registered');
    });

    it('should unregister agent', () => {
      registry.register(createManifest('agent-1'));
      expect(registry.has('agent-1')).toBe(true);
      const result = registry.unregister('agent-1');
      expect(result).toBe(true);
      expect(registry.has('agent-1')).toBe(false);
    });

    it('should return false when unregistering non-existent agent', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('get operations', () => {
    it('should get agent manifest', () => {
      const manifest = createManifest('agent-1', 'editor', ['editing', 'writing']);
      registry.register(manifest);

      const retrieved = registry.get('agent-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe('agent-1');
      expect(retrieved!.role).toBe('editor');
    });

    it('should return undefined for non-existent agent', () => {
      const result = registry.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should get all registered agents', () => {
      registry.register(createManifest('agent-1'));
      registry.register(createManifest('agent-2'));
      registry.register(createManifest('agent-3'));

      const all = registry.getAll();
      expect(all.length).toBe(3);
    });

    it('should get all registrations with status', () => {
      registry.register(createManifest('agent-1'));
      const regs = registry.getAllRegistrations();
      expect(regs.length).toBe(1);
      expect(regs[0].status).toBe('active');
    });
  });

  describe('capability-based discovery', () => {
    it('should find agents by capability', () => {
      registry.register(createManifest('planner-1', 'planner', ['planning', 'reasoning']));
      registry.register(createManifest('editor-1', 'editor', ['editing', 'writing']));
      registry.register(createManifest('editor-2', 'editor', ['editing', 'formatting']));
      registry.register(createManifest('reviewer-1', 'reviewer', ['reviewing', 'planning']));

      const editors = registry.findByCapability('editing');
      expect(editors.length).toBe(2);

      const planners = registry.findByCapability('planning');
      expect(planners.length).toBe(2); // planner-1 and reviewer-1
    });

    it('should find agents by multiple capabilities (AND)', () => {
      registry.register(createManifest('agent-1', 'planner', ['planning', 'reasoning']));
      registry.register(createManifest('agent-2', 'planner', ['planning']));
      registry.register(createManifest('agent-3', 'editor', ['planning', 'editing']));

      const results = registry.findByCapabilities(['planning', 'reasoning']);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('agent-1');
    });

    it('should return empty array for non-existent capability', () => {
      registry.register(createManifest('agent-1', 'planner', ['planning']));
      const results = registry.findByCapability('non-existent');
      expect(results.length).toBe(0);
    });
  });

  describe('role-based discovery', () => {
    it('should find agents by role', () => {
      registry.register(createManifest('planner-1', 'planner'));
      registry.register(createManifest('planner-2', 'planner'));
      registry.register(createManifest('editor-1', 'editor'));
      registry.register(createManifest('reviewer-1', 'reviewer'));

      const planners = registry.findByRole('planner');
      expect(planners.length).toBe(2);

      const editors = registry.findByRole('editor');
      expect(editors.length).toBe(1);
    });
  });

  describe('status management', () => {
    it('should update agent status', () => {
      registry.register(createManifest('agent-1'));
      const result = registry.updateStatus('agent-1', 'busy');
      expect(result).toBe(true);

      const reg = registry.getRegistration('agent-1');
      expect(reg!.status).toBe('busy');
    });

    it('should touch agent (heartbeat)', () => {
      registry.register(createManifest('agent-1'));
      const before = registry.getRegistration('agent-1')!.lastSeen;

      // Small delay
      const start = Date.now();
      while (Date.now() < start + 10) {
        // busy wait
      }

      registry.touch('agent-1');
      const after = registry.getRegistration('agent-1')!.lastSeen;
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('should get active agents', () => {
      registry.register(createManifest('agent-1'));
      registry.register(createManifest('agent-2'));

      registry.updateStatus('agent-2', 'inactive');

      const active = registry.getActive();
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('agent-1');
    });
  });

  describe('stale detection', () => {
    it('should detect stale agents', () => {
      registry.register(createManifest('agent-1'));

      // Manually set lastSeen to past
      const regs = registry.getAllRegistrations();
      const reg = regs[0];
      reg.lastSeen = Date.now() - 100000; // 100 seconds ago

      const stale = registry.getStale(60000); // 60 second threshold
      expect(stale.length).toBe(1);
      expect(stale[0].id).toBe('agent-1');
    });

    it('should not mark recent agents as stale', () => {
      registry.register(createManifest('agent-1'));
      const stale = registry.getStale(60000);
      expect(stale.length).toBe(0);
    });
  });

  describe('statistics', () => {
    it('should report correct size', () => {
      expect(registry.size()).toBe(0);
      registry.register(createManifest('agent-1'));
      registry.register(createManifest('agent-2'));
      expect(registry.size()).toBe(2);
    });

    it('should report active count', () => {
      registry.register(createManifest('agent-1'));
      registry.register(createManifest('agent-2'));
      registry.register(createManifest('agent-3'));

      registry.updateStatus('agent-2', 'inactive');

      expect(registry.getActiveCount()).toBe(2);
    });

    it('should list all capabilities', () => {
      registry.register(createManifest('agent-1', 'planner', ['planning', 'reasoning']));
      registry.register(createManifest('agent-2', 'editor', ['editing']));

      const caps = registry.getCapabilities();
      expect(caps).toContain('planning');
      expect(caps).toContain('reasoning');
      expect(caps).toContain('editing');
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      registry.register(createManifest('agent-1'));
      registry.register(createManifest('agent-2'));
      expect(registry.size()).toBe(2);

      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });

  describe('error cases', () => {
    it('should throw when max agents reached', () => {
      const smallRegistry = new AgentRegistry({ maxAgents: 2 });

      smallRegistry.register(createManifest('agent-1'));
      smallRegistry.register(createManifest('agent-2'));

      expect(() => smallRegistry.register(createManifest('agent-3'))).toThrow('Max agents');
    });

    it('should return false for updateStatus on non-existent agent', () => {
      const result = registry.updateStatus('non-existent', 'active');
      expect(result).toBe(false);
    });
  });
});
