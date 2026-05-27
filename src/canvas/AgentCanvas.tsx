import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AgentNode, createAgentNode } from './AgentNode';
import type { AgentNodeData } from './AgentNode';
import { PhaseGate, createPhaseGate } from './PhaseGate';
import type { PhaseGateData, PhaseType } from './PhaseGate';

export type CanvasMode = 'edit' | 'canvas';

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: 'agent' | 'phase';
}

interface AgentCanvasProps {
  initialNodes?: (AgentNodeData | PhaseGateData)[];
  initialConnections?: Connection[];
  mode: CanvasMode;
  onModeSwitch?: (mode: CanvasMode) => void;
  onSave?: (nodes: (AgentNodeData | PhaseGateData)[], connections: Connection[]) => void;
}

interface CanvasState {
  nodes: (AgentNodeData | PhaseGateData)[];
  connections: Connection[];
}

const CANVAS_STORAGE_KEY = 'doc-editor-canvas-v1';

export const AgentCanvas: React.FC<AgentCanvasProps> = ({
  initialNodes = [],
  initialConnections = [],
  mode,
  onModeSwitch,
  onSave,
}) => {
  const [nodes, setNodes] = useState<(AgentNodeData | PhaseGateData)[]>(initialNodes);
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: CanvasState = JSON.parse(saved);
        setNodes(parsed.nodes);
        setConnections(parsed.connections);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (mode === 'canvas') {
      localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({ nodes, connections }));
    }
  }, [nodes, connections, mode]);

  const handleNodeDrag = useCallback((_id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === _id ? { ...n, x, y } : n));
  }, []);

  const handleAgentStart = useCallback((id: string) => {
    setNodes(prev => prev.map(n => n.id === id && n.hasOwnProperty('status') ? { ...n, status: 'running' } : n));
  }, []);

  const handleAgentStop = useCallback((id: string) => {
    setNodes(prev => prev.map(n => n.id === id && n.hasOwnProperty('status') ? { ...n, status: 'idle' } : n));
  }, []);

  const handlePhaseEnter = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (node && 'guardEnabled' in node) {
      if (node.guardEnabled && !node.approved) {
        alert('This phase requires approval before entering');
        return;
      }
    }
  }, [nodes]);

  const handlePhaseExit = useCallback((_id: string) => {
    // Just allow exit for now
  }, []);

  const handlePhaseGuardToggle = useCallback((id: string, enabled: boolean) => {
    setNodes(prev => prev.map(n => n.id === id && 'guardEnabled' in n ? { ...n, guardEnabled: enabled } : n));
  }, []);

  const handlePhaseModeTransition = useCallback((id: string, direction: 'enter' | 'exit') => {
    console.log(`Phase ${id} ${direction}`);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }, []);

  const handleAddNode = useCallback((type: 'agent' | 'phase', role?: string, phase?: PhaseType) => {
    const id = `${type}-${Date.now()}`;
    const baseX = 200 + Math.random() * 100;
    const baseY = 150 + Math.random() * 100;

    if (type === 'agent') {
      const newNode = createAgentNode(id, (role as 'editor' | 'reviewer' | 'researcher' | 'custom') || 'editor', baseX, baseY);
      setNodes(prev => [...prev, newNode]);
    } else {
      const newNode = createPhaseGate(id, phase || 'design', baseX, baseY);
      setNodes(prev => [...prev, newNode]);
    }
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(nodes, connections);
    alert('Canvas saved to localStorage');
  }, [nodes, connections, onSave]);

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem(CANVAS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: CanvasState = JSON.parse(saved);
        setNodes(parsed.nodes);
        setConnections(parsed.connections);
        alert('Canvas loaded from localStorage');
      } catch {
        alert('Failed to load canvas');
      }
    } else {
      alert('No saved canvas found');
    }
  }, []);

  const handleClear = useCallback(() => {
    if (confirm('Clear all nodes and connections?')) {
      setNodes([]);
      setConnections([]);
      localStorage.removeItem(CANVAS_STORAGE_KEY);
    }
  }, []);

  // Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(prev => Math.min(Math.max(prev * delta, 0.25), 4));
    } else {
      setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panRef.current = { startX: e.clientX, startY: e.clientY, offsetX: offset.x, offsetY: offset.y };
    }
  }, [offset.x, offset.y]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setOffset({ x: panRef.current.offsetX + dx, y: panRef.current.offsetY + dy });
    }
  }, [isPanning]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    panRef.current = null;
  }, []);

  useEffect(() => {
    if (isPanning) {
      const handleMouseUp = () => {
        setIsPanning(false);
        panRef.current = null;
      };
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isPanning]);

  if (mode === 'edit') {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onMouseDown={handlePanStart}
      onMouseMove={handlePanMove}
      onMouseUp={handlePanEnd}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0a0a0f',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
    >
      {/* Toolbar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        display: 'flex',
        gap: 8,
        zIndex: 100,
        background: '#12121a',
        padding: 12,
        borderRadius: 8,
        border: '1px solid #333',
      }}>
        <button onClick={() => handleAddNode('agent', 'editor')} style={btnStyle}>+ Editor</button>
        <button onClick={() => handleAddNode('agent', 'reviewer')} style={btnStyle}>+ Reviewer</button>
        <button onClick={() => handleAddNode('agent', 'researcher')} style={btnStyle}>+ Researcher</button>
        <div style={{ width: 1, background: '#333', margin: '0 8px' }} />
        <button onClick={() => handleAddNode('phase', undefined, 'design')} style={btnStyle}>+ Design</button>
        <button onClick={() => handleAddNode('phase', undefined, 'edit')} style={btnStyle}>+ Edit</button>
        <button onClick={() => handleAddNode('phase', undefined, 'review')} style={btnStyle}>+ Review</button>
        <button onClick={() => handleAddNode('phase', undefined, 'publish')} style={btnStyle}>+ Publish</button>
        <div style={{ width: 1, background: '#333', margin: '0 8px' }} />
        <button onClick={handleSave} style={btnStyle}>💾 Save</button>
        <button onClick={handleLoad} style={btnStyle}>📂 Load</button>
        <button onClick={handleClear} style={{ ...btnStyle, color: '#ef4444' }}>🗑️ Clear</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => onModeSwitch?.('edit')} style={{ ...btnStyle, background: '#f97316' }}>Switch to Edit</button>
      </div>

      {/* Canvas content */}
      <div style={{
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transformOrigin: '0 0',
        position: 'absolute',
        top: 80,
        left: 16,
        width: 4000,
        height: 3000,
      }}>
        {/* Connection lines */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromId);
            const toNode = nodes.find(n => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            const fromX = fromNode.x + (conn.type === 'agent' ? 80 : 90);
            const fromY = fromNode.y + (conn.type === 'agent' ? 60 : 80);
            const toX = toNode.x + (conn.type === 'agent' ? 80 : 90);
            const toY = toNode.y + (conn.type === 'agent' ? 60 : 80);

            return (
              <g key={conn.id}>
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={conn.type === 'agent' ? '#06b6d4' : '#f97316'}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  opacity={0.6}
                />
                <circle cx={toX} cy={toY} r={6} fill={conn.type === 'agent' ? '#06b6d4' : '#f97316'} />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          if ('status' in node) {
            return (
              <AgentNode
                key={node.id}
                data={node as AgentNodeData}
                onDrag={handleNodeDrag}
                onStart={handleAgentStart}
                onStop={handleAgentStop}
                selected={selectedId === node.id}
              />
            );
          } else {
            return (
              <PhaseGate
                key={node.id}
                data={node as PhaseGateData}
                onEnter={handlePhaseEnter}
                onExit={handlePhaseExit}
                onGuardToggle={handlePhaseGuardToggle}
                onModeTransition={handlePhaseModeTransition}
                selected={selectedId === node.id}
              />
            );
          }
        })}
      </div>

      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        padding: '8px 16px',
        background: '#12121a',
        border: '1px solid #333',
        borderRadius: 6,
        color: '#a0a0b0',
        fontSize: 12,
      }}>
        Zoom: {Math.round(scale * 100)}% | Pan: Alt+Drag | Zoom: Ctrl+Scroll
      </div>

      {/* Mode indicator */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        padding: '8px 16px',
        background: '#f97316',
        borderRadius: 6,
        color: '#fff',
        fontSize: 12,
        fontWeight: 600,
      }}>
        Canvas Mode
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#1a1a2e',
  color: '#06b6d4',
  border: '1px solid #333',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  transition: 'all 0.2s',
};

// Export for testing
export { CANVAS_STORAGE_KEY };