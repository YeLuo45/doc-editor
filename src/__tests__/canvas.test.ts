/**
 * V26 Zero-Code Agent Canvas - Test Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentCanvas,
  CanvasNode,
  CanvasEdge,
  CanvasLayout,
  CanvasSerializer,
  CanvasRenderer,
  createNode,
  createEdge,
  updateNode,
  updateEdge,
  getNodeState,
  getEdgeState,
} from '../canvas';

describe('V26 AgentCanvas', () => {
  let canvas: AgentCanvas;

  beforeEach(() => {
    canvas = new AgentCanvas();
  });

  describe('AgentCanvas Core', () => {
    it('should create an empty canvas', () => {
      expect(canvas.getAllNodes()).toHaveLength(0);
      expect(canvas.getAllEdges()).toHaveLength(0);
    });

    it('should add a node', () => {
      const node = canvas.addNode('node1', 'agent', 100, 200);
      expect(node).toBeInstanceOf(CanvasNode);
      expect(canvas.getAllNodes()).toHaveLength(1);
    });

    it('should remove a node', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 150, 250);
      expect(canvas.getAllNodes()).toHaveLength(2);

      const result = canvas.removeNode('node1');
      expect(result).toBe(true);
      expect(canvas.getAllNodes()).toHaveLength(1);
    });

    it('should connect two nodes', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      
      const edge = canvas.connect('node1', 'node2');
      expect(edge).toBeInstanceOf(CanvasEdge);
      expect(canvas.getAllEdges()).toHaveLength(1);
    });

    it('should not connect non-existent nodes', () => {
      const edge = canvas.connect('nonexistent1', 'nonexistent2');
      expect(edge).toBeNull();
    });

    it('should not create duplicate edges', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      
      canvas.connect('node1', 'node2');
      const duplicateEdge = canvas.connect('node1', 'node2');
      expect(duplicateEdge).toBeNull();
      expect(canvas.getAllEdges()).toHaveLength(1);
    });

    it('should disconnect an edge', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      const edge = canvas.connect('node1', 'node2');
      
      const result = canvas.disconnect(edge!.getId());
      expect(result).toBe(true);
      expect(canvas.getAllEdges()).toHaveLength(0);
    });

    it('should get connected edges for a node', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      canvas.addNode('node3', 'task', 500, 600);
      
      canvas.connect('node1', 'node2');
      canvas.connect('node1', 'node3');
      
      const connectedEdges = canvas.getConnectedEdges('node1');
      expect(connectedEdges).toHaveLength(2);
    });
  });

  describe('AgentCanvas State', () => {
    it('should return snapshot', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      const snapshot = canvas.getSnapshot();
      
      expect(snapshot.nodes).toHaveLength(1);
      expect(snapshot.edges).toHaveLength(0);
      expect(snapshot.version).toBe('V26');
    });

    it('should reset canvas', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      canvas.connect('node1', 'node2');
      
      canvas.reset();
      
      expect(canvas.getAllNodes()).toHaveLength(0);
      expect(canvas.getAllEdges()).toHaveLength(0);
    });

    it('should generate report', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      canvas.connect('node1', 'node2');
      
      const report = canvas.getReport();
      
      expect(report.nodeCount).toBe(2);
      expect(report.edgeCount).toBe(1);
      expect(report.connectedNodes).toBe(2);
      expect(report.orphanedNodes).toBe(0);
    });

    it('should export metrics', () => {
      canvas.addNode('node1', 'agent', 100, 200);
      canvas.addNode('node2', 'phase', 300, 400);
      canvas.connect('node1', 'node2');
      
      const metrics = canvas.exportMetrics();
      
      expect(metrics.totalNodes).toBe(2);
      expect(metrics.totalEdges).toBe(1);
      expect(metrics.avgConnectionsPerNode).toBe(0.5);
    });
  });

  describe('CanvasNode', () => {
    let node: CanvasNode;

    beforeEach(() => {
      node = new CanvasNode('test-node', 'agent', 100, 200, { name: 'Test' });
    });

    it('should create node with correct properties', () => {
      expect(node.getId()).toBe('test-node');
      expect(node.getType()).toBe('agent');
      expect(node.getX()).toBe(100);
      expect(node.getY()).toBe(200);
    });

    it('should update position', () => {
      node.setPosition(300, 400);
      expect(node.getX()).toBe(300);
      expect(node.getY()).toBe(400);
    });

    it('should set and get properties', () => {
      node.setProperty('role', 'editor');
      expect(node.getProperty('role')).toBe('editor');
    });

    it('should remove properties', () => {
      node.setProperty('temp', 'value');
      const result = node.removeProperty('temp');
      expect(result).toBe(true);
      expect(node.getProperty('temp')).toBeUndefined();
    });

    it('should toggle selection state', () => {
      node.setSelected(true);
      expect(node.isSelected()).toBe(true);
      
      node.setSelected(false);
      expect(node.isSelected()).toBe(false);
    });

    it('should toggle visibility state', () => {
      node.setVisible(false);
      expect(node.isVisible()).toBe(false);
    });

    it('should toggle lock state', () => {
      node.setLocked(true);
      expect(node.isLocked()).toBe(true);
    });

    it('should generate node snapshot', () => {
      const snapshot = node.getSnapshot();
      
      expect(snapshot.id).toBe('test-node');
      expect(snapshot.type).toBe('agent');
      expect(snapshot.position).toEqual({ x: 100, y: 200 });
    });

    it('should reset node state', () => {
      node.setSelected(true);
      node.setPosition(500, 600);
      node.reset();
      
      expect(node.getX()).toBe(0);
      expect(node.getY()).toBe(0);
      expect(node.isSelected()).toBe(false);
    });

    it('should clone node', () => {
      const cloned = node.clone();
      expect(cloned.getId()).toBe(node.getId());
      expect(cloned.getType()).toBe(node.getType());
    });

    it('should convert to JSON', () => {
      const json = node.toJSON();
      expect(json.id).toBe('test-node');
      expect(json.type).toBe('agent');
    });

    it('should create node from JSON', () => {
      const json = node.toJSON();
      const recreated = CanvasNode.fromJSON(json);
      
      expect(recreated.getId()).toBe(json.id);
      expect(recreated.getType()).toBe(json.type);
    });
  });

  describe('CanvasEdge', () => {
    let edge: CanvasEdge;

    beforeEach(() => {
      edge = new CanvasEdge('edge-1', 'node1', 'node2', 'agent');
    });

    it('should create edge with correct properties', () => {
      expect(edge.getId()).toBe('edge-1');
      expect(edge.getFromId()).toBe('node1');
      expect(edge.getToId()).toBe('node2');
      expect(edge.getType()).toBe('agent');
    });

    it('should update edge type', () => {
      edge.setType('phase');
      expect(edge.getType()).toBe('phase');
    });

    it('should update endpoints', () => {
      edge.setEndpoints('node3', 'node4');
      expect(edge.getFromId()).toBe('node3');
      expect(edge.getToId()).toBe('node4');
    });

    it('should check if connects a node', () => {
      expect(edge.connectsNode('node1')).toBe(true);
      expect(edge.connectsNode('node3')).toBe(false);
    });

    it('should check if connects two nodes', () => {
      expect(edge.connectsNodes('node1', 'node2')).toBe(true);
      expect(edge.connectsNodes('node2', 'node1')).toBe(true);
      expect(edge.connectsNodes('node1', 'node3')).toBe(false);
    });

    it('should toggle selection state', () => {
      edge.setSelected(true);
      expect(edge.isSelected()).toBe(true);
    });

    it('should toggle visibility state', () => {
      edge.setVisible(false);
      expect(edge.isVisible()).toBe(false);
    });

    it('should toggle animation state', () => {
      edge.setAnimated(true);
      expect(edge.isAnimated()).toBe(true);
    });

    it('should generate edge snapshot', () => {
      const snapshot = edge.getSnapshot();
      
      expect(snapshot.id).toBe('edge-1');
      expect(snapshot.fromId).toBe('node1');
      expect(snapshot.toId).toBe('node2');
    });

    it('should reset edge state', () => {
      edge.setSelected(true);
      edge.setAnimated(true);
      edge.reset();
      
      expect(edge.isSelected()).toBe(false);
      expect(edge.isAnimated()).toBe(false);
    });

    it('should clone edge', () => {
      const cloned = edge.clone();
      expect(cloned.getId()).toBe(edge.getId());
    });
  });

  describe('CanvasLayout', () => {
    let layout: CanvasLayout;

    beforeEach(() => {
      layout = new CanvasLayout();
    });

    it('should auto-layout nodes', () => {
      const positions = [
        { id: 'node1', x: 0, y: 0 },
        { id: 'node2', x: 100, y: 100 },
        { id: 'node3', x: 200, y: 200 },
      ];

      const result = layout.autoLayout(positions);

      expect(result.positions).toHaveLength(3);
      expect(result.metrics.nodeCount).toBe(3);
    });

    it('should snap to grid', () => {
      const positions = [
        { id: 'node1', x: 23, y: 47 },
        { id: 'node2', x: 88, y: 112 },
      ];

      const result = layout.snapToGrid(positions, 20);

      expect(result[0].x).toBe(20);
      expect(result[0].y).toBe(40);
      expect(result[1].x).toBe(80);
      expect(result[1].y).toBe(120);
    });

    it('should calculate layout metrics', () => {
      const positions = [
        { id: 'node1', x: 0, y: 0 },
        { id: 'node2', x: 100, y: 100 },
      ];

      const metrics = layout.getLayoutMetrics(positions);

      expect(metrics.nodeCount).toBe(2);
      expect(metrics.width).toBe(100);
      expect(metrics.height).toBe(100);
    });

    it('should handle empty positions', () => {
      const metrics = layout.getLayoutMetrics([]);
      expect(metrics.nodeCount).toBe(0);
      expect(metrics.complexity).toBe(0);
    });

    it('should reset layout', () => {
      layout.reset();
      expect(layout.getLastLayoutTime()).toBe(0);
    });

    it('should export metrics', () => {
      const metrics = layout.exportMetrics();
      
      expect(metrics.layoutAlgorithm).toBe('grid-based');
      expect(metrics.gridSize).toBe(20);
    });
  });

  describe('CanvasSerializer', () => {
    let serializer: CanvasSerializer;

    beforeEach(() => {
      serializer = new CanvasSerializer();
    });

    it('should serialize snapshot', () => {
      const snapshot = {
        nodes: [
          { id: 'node1', type: 'agent', x: 100, y: 200, properties: {}, state: { selected: false, visible: true, locked: false } },
        ],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      const serialized = serializer.serialize(snapshot);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should deserialize data', () => {
      const snapshot = {
        nodes: [
          { id: 'node1', type: 'agent', x: 100, y: 200, properties: {}, state: { selected: false, visible: true, locked: false } },
        ],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      const serialized = serializer.serialize(snapshot);
      const deserialized = serializer.deserialize(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.nodes).toHaveLength(1);
      expect(deserialized!.version).toBe('V26');
    });

    it('should return null for invalid data', () => {
      const result = serializer.deserialize('invalid json');
      expect(result).toBeNull();
    });

    it('should export canvas', () => {
      const snapshot = {
        nodes: [],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      const exported = serializer.exportCanvas(snapshot);

      expect(exported.format).toBe('json');
      expect(exported.checksum).toBeDefined();
      expect(exported.timestamp).toBeDefined();
    });

    it('should import canvas data', () => {
      const snapshot = {
        nodes: [
          { id: 'node1', type: 'agent', x: 100, y: 200, properties: {}, state: { selected: false, visible: true, locked: false } },
        ],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      const exported = serializer.exportCanvas(snapshot);
      const imported = serializer.importCanvas(exported as Record<string, unknown>);

      expect(imported).not.toBeNull();
      expect(imported!.nodes).toHaveLength(1);
    });

    it('should toggle compression', () => {
      serializer.setCompression(true);
      expect(serializer.isCompressionEnabled()).toBe(true);
      
      serializer.setCompression(false);
      expect(serializer.isCompressionEnabled()).toBe(false);
    });
  });

  describe('CanvasRenderer', () => {
    let renderer: CanvasRenderer;

    beforeEach(() => {
      renderer = new CanvasRenderer();
    });

    it('should render snapshot to SVG', () => {
      const snapshot = {
        nodes: [
          { id: 'node1', type: 'agent', x: 100, y: 200, properties: { name: 'Test' }, state: { selected: false, visible: true, locked: false } },
        ],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      const svg = renderer.render(snapshot);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should update node in canvas state', () => {
      const snapshot = {
        nodes: [
          { id: 'node1', type: 'agent', x: 100, y: 200, properties: {}, state: { selected: false, visible: true, locked: false } },
        ],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      renderer.render(snapshot);
      const result = renderer.update('node1', { x: 500, y: 600 });

      expect(result).toBe(true);
    });

    it('should return canvas state', () => {
      const snapshot = {
        nodes: [],
        edges: [],
        version: 'V26',
        timestamp: Date.now(),
      };

      renderer.render(snapshot);
      const state = renderer.getCanvasState();

      expect(state.nodeCount).toBe(0);
      expect(state.edgeCount).toBe(0);
    });

    it('should set viewport', () => {
      renderer.setViewport(100, 200, 1.5);
      const viewport = renderer.getViewport();

      expect(viewport.x).toBe(100);
      expect(viewport.y).toBe(200);
      expect(viewport.scale).toBe(1.5);
    });

    it('should reset renderer', () => {
      renderer.reset();
      const state = renderer.getCanvasState();
      
      expect(state.nodeCount).toBe(0);
    });

    it('should export metrics', () => {
      const metrics = renderer.exportMetrics();

      expect(metrics.canvasWidth).toBe(4000);
      expect(metrics.canvasHeight).toBe(3000);
    });
  });

  describe('Helper Functions', () => {
    it('should create node via factory', () => {
      const node = createNode('test', 'agent', 100, 200, { key: 'value' });
      expect(node).toBeInstanceOf(CanvasNode);
      expect(node.getProperty('key')).toBe('value');
    });

    it('should update node via helper', () => {
      const node = createNode('test', 'agent', 100, 200);
      updateNode(node, { x: 300, y: 400, name: 'Updated' });
      
      expect(node.getX()).toBe(300);
      expect(node.getY()).toBe(400);
      expect(node.getProperty('name')).toBe('Updated');
    });

    it('should get node state', () => {
      const node = createNode('test', 'agent', 100, 200);
      const state = getNodeState(node);
      
      expect(state.id).toBe('test');
      expect(state.type).toBe('agent');
      expect(state.position).toEqual({ x: 100, y: 200 });
    });

    it('should create edge via factory', () => {
      const edge = createEdge('edge-1', 'node1', 'node2', 'agent');
      expect(edge).toBeInstanceOf(CanvasEdge);
    });

    it('should update edge via helper', () => {
      const edge = createEdge('edge-1', 'node1', 'node2', 'agent');
      updateEdge(edge, { type: 'phase', fromId: 'node3' });
      
      expect(edge.getType()).toBe('phase');
      expect(edge.getFromId()).toBe('node3');
    });

    it('should get edge state', () => {
      const edge = createEdge('edge-1', 'node1', 'node2', 'agent');
      const state = getEdgeState(edge);
      
      expect(state.id).toBe('edge-1');
      expect(state.fromId).toBe('node1');
      expect(state.toId).toBe('node2');
    });
  });
});