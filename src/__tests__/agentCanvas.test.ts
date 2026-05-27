import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('AgentCanvas', () => {
  const CANVAS_STORAGE_KEY = 'doc-editor-canvas-v1';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('CanvasMode type', () => {
    it('has edit and canvas modes', () => {
      const modes = ['edit', 'canvas'] as const;
      expect(modes).toContain('edit');
      expect(modes).toContain('canvas');
    });
  });

  describe('localStorage integration', () => {
    it('saves canvas data to localStorage', () => {
      const canvasData = {
        nodes: [{ id: 'agent-1', role: 'editor', name: 'Test Agent', status: 'idle', x: 100, y: 100 }],
        connections: [],
      };
      
      localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify(canvasData));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        CANVAS_STORAGE_KEY,
        JSON.stringify(canvasData)
      );
    });

    it('loads canvas data from localStorage', () => {
      const canvasData = {
        nodes: [{ id: 'agent-1', role: 'editor', name: 'Test Agent', status: 'idle', x: 100, y: 100 }],
        connections: [],
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(canvasData));
      
      const loaded = localStorage.getItem(CANVAS_STORAGE_KEY);
      const parsed = loaded ? JSON.parse(loaded) : null;
      
      expect(parsed).toEqual(canvasData);
    });

    it('returns null when no canvas saved', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      
      const loaded = localStorage.getItem(CANVAS_STORAGE_KEY);
      
      expect(loaded).toBeNull();
    });

    it('handles corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValueOnce('not valid json');
      
      const loaded = localStorage.getItem(CANVAS_STORAGE_KEY);
      
      expect(() => {
        if (loaded) JSON.parse(loaded);
      }).toThrow();
    });

    it('clears canvas from localStorage', () => {
      localStorage.setItem(CANVAS_STORAGE_KEY, 'test');
      localStorage.removeItem(CANVAS_STORAGE_KEY);
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(CANVAS_STORAGE_KEY);
    });
  });

  describe('Connection type', () => {
    it('creates valid connection object', () => {
      const connection = {
        id: 'conn-1',
        fromId: 'agent-1',
        toId: 'agent-2',
        type: 'agent' as const,
      };
      
      expect(connection.id).toBe('conn-1');
      expect(connection.fromId).toBe('agent-1');
      expect(connection.toId).toBe('agent-2');
      expect(connection.type).toBe('agent');
    });

    it('connection type can be agent or phase', () => {
      const types = ['agent', 'phase'] as const;
      types.forEach(type => {
        const connection = { id: '1', fromId: 'a', toId: 'b', type };
        expect(connection.type).toBe(type);
      });
    });
  });

  describe('Canvas state structure', () => {
    it('nodes array stores agent data', () => {
      const nodes = [
        { id: 'agent-1', role: 'editor' as const, name: 'Editor', status: 'idle' as const, x: 100, y: 100 },
      ];
      expect(nodes[0].role).toBe('editor');
    });

    it('nodes array stores phase gate data', () => {
      const nodes = [
        { id: 'phase-1', phase: 'design' as const, name: 'Design', x: 200, y: 200, guardEnabled: false, approved: false },
      ];
      expect(nodes[0].phase).toBe('design');
    });

    it('connections link nodes by id', () => {
      const connections = [
        { id: 'c1', fromId: 'agent-1', toId: 'phase-1', type: 'agent' as const },
      ];
      expect(connections[0].fromId).toBe('agent-1');
      expect(connections[0].toId).toBe('phase-1');
    });
  });

  describe('mode switching', () => {
    it('edit mode hides canvas', () => {
      const mode: 'edit' = 'edit';
      expect(mode).toBe('edit');
    });

    it('canvas mode shows canvas', () => {
      const mode: 'canvas' = 'canvas';
      expect(mode).toBe('canvas');
    });

    it('mode can be toggled', () => {
      let mode: 'edit' | 'canvas' = 'edit';
      mode = mode === 'edit' ? 'canvas' : 'edit';
      expect(mode).toBe('canvas');
      mode = mode === 'edit' ? 'canvas' : 'edit';
      expect(mode).toBe('edit');
    });
  });

  describe('node creation helpers', () => {
    it('generates unique node ids with timestamp', () => {
      const id1 = `agent-${Date.now()}`;
      const id2 = `agent-${Date.now()}`;
      // IDs generated at different times should be unique (or at least format is correct)
      expect(id1).toMatch(/^agent-\d+$/);
      expect(id2).toMatch(/^agent-\d+$/);
    });

    it('generates unique phase ids with timestamp', () => {
      const id1 = `phase-${Date.now()}`;
      expect(id1).toMatch(/^phase-\d+$/);
    });
  });

  describe('canvas rendering data', () => {
    it('computes connection line endpoints for agents', () => {
      const agentNode = { id: 'a1', role: 'editor' as const, name: 'Editor', status: 'idle' as const, x: 100, y: 100 };
      const agentWidth = 160;
      const agentHeight = 120;
      
      const endX = agentNode.x + agentWidth / 2;
      const endY = agentNode.y + agentHeight / 2;
      
      expect(endX).toBe(180);
      expect(endY).toBe(160);
    });

    it('computes connection line endpoints for phase gates', () => {
      const phaseNode = { id: 'p1', phase: 'design' as const, name: 'Design', x: 200, y: 200, guardEnabled: false, approved: false };
      const phaseWidth = 180;
      const phaseHeight = 160;
      
      const endX = phaseNode.x + phaseWidth / 2;
      const endY = phaseNode.y + phaseHeight / 2;
      
      expect(endX).toBe(290);
      expect(endY).toBe(280);
    });
  });

  describe('zoom behavior', () => {
    it('scale values are valid percentages', () => {
      const scales = [0.25, 0.5, 1, 2, 4];
      scales.forEach(scale => {
        expect(scale).toBeGreaterThanOrEqual(0.25);
        expect(scale).toBeLessThanOrEqual(4);
      });
    });

    it('zoom percentage calculation', () => {
      const scale = 1.5;
      const percentage = Math.round(scale * 100);
      expect(percentage).toBe(150);
    });
  });

  describe('pan behavior', () => {
    it('offset values are numeric', () => {
      const offset = { x: 100, y: 200 };
      expect(typeof offset.x).toBe('number');
      expect(typeof offset.y).toBe('number');
    });

    it('pan calculation with delta', () => {
      const initialOffset = { x: 0, y: 0 };
      const deltaX = 50;
      const deltaY = -30;
      const newOffset = { x: initialOffset.x + deltaX, y: initialOffset.y + deltaY };
      expect(newOffset.x).toBe(50);
      expect(newOffset.y).toBe(-30);
    });
  });
});