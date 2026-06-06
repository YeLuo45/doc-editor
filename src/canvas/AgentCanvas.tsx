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
    <div className="canvas-mode">
      {/* Toolbar */}
      <div className="canvas-toolbar">
        <div className="canvas-toolbar__group">
          <span className="card__subtitle" style={{ marginRight: 'var(--space-2)' }}>Agent</span>
          <button onClick={() => handleAddNode('agent', 'editor')} className="btn btn--secondary btn--sm">+ Editor</button>
          <button onClick={() => handleAddNode('agent', 'reviewer')} className="btn btn--secondary btn--sm">+ Reviewer</button>
          <button onClick={() => handleAddNode('agent', 'researcher')} className="btn btn--secondary btn--sm">+ Researcher</button>
        </div>
        <div className="canvas-toolbar__group">
          <span className="card__subtitle" style={{ marginRight: 'var(--space-2)' }}>Phase</span>
          <button onClick={() => handleAddNode('phase', undefined, 'design')} className="btn btn--secondary btn--sm">+ Design</button>
          <button onClick={() => handleAddNode('phase', undefined, 'edit')} className="btn btn--secondary btn--sm">+ Edit</button>
          <button onClick={() => handleAddNode('phase', undefined, 'review')} className="btn btn--secondary btn--sm">+ Review</button>
          <button onClick={() => handleAddNode('phase', undefined, 'publish')} className="btn btn--secondary btn--sm">+ Publish</button>
        </div>
        <div className="canvas-toolbar__group">
          <button onClick={handleSave} className="btn btn--ghost btn--sm">Save</button>
          <button onClick={handleLoad} className="btn btn--ghost btn--sm">Load</button>
          <button onClick={handleClear} className="btn btn--danger btn--sm">Clear</button>
        </div>
        <div className="canvas-toolbar__spacer" />
        <span className="card__subtitle" style={{ fontFamily: 'var(--font-family-mono)' }}>
          {nodes.length} nodes · {connections.length} edges
        </span>
        <button
          onClick={() => onModeSwitch?.('edit')}
          className="btn btn--primary btn--sm"
        >
          Switch to Edit
        </button>
      </div>

      {/* Canvas content */}
      <div className="canvas-stage" onClick={handleCanvasClick}>
        <div
          onWheel={handleWheel}
          onMouseDown={handlePanStart}
          onMouseMove={handlePanMove}
          onMouseUp={handlePanEnd}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 4000,
            height: 3000,
            cursor: isPanning ? 'grabbing' : 'default',
          }}
        >
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

        {/* Empty state hint */}
        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.4 }}>◫</div>
            <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-secondary)' }}>
              Canvas is empty
            </div>
            <div style={{ fontSize: 'var(--text-sm)', maxWidth: 320 }}>
              Add an Agent or Phase from the toolbar above, then drag to connect.
            </div>
          </div>
        )}

        {/* Zoom indicator */}
        <div className="canvas-hud canvas-hud--right">
          <span><span className="canvas-hud__key">Zoom</span> {Math.round(scale * 100)}%</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
          <span><span className="canvas-hud__key">Pan</span> Alt+Drag</span>
          <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
          <span><span className="canvas-hud__key">Scale</span> Ctrl+Scroll</span>
        </div>

        {/* Mode indicator */}
        <div
          className="pill pill--orange"
          style={{
            position: 'absolute',
            bottom: 'var(--space-4)',
            left: 'var(--space-4)',
            padding: 'var(--space-2) var(--space-3)',
            pointerEvents: 'none',
          }}
        >
          <span className="pill__dot" />
          Canvas Mode
        </div>
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