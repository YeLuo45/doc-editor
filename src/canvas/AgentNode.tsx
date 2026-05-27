import React, { useState, useCallback, useRef } from 'react';

// Agent role types
export type AgentRole = 'editor' | 'reviewer' | 'researcher' | 'custom';

export interface AgentNodeData {
  id: string;
  role: AgentRole;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  x: number;
  y: number;
}

interface AgentNodeProps {
  data: AgentNodeData;
  onDrag?: (id: string, x: number, y: number) => void;
  onStart?: (id: string) => void;
  onStop?: (id: string) => void;
  selected?: boolean;
}

const roleColors: Record<AgentRole, string> = {
  editor: '#06b6d4',
  reviewer: '#f97316',
  researcher: '#22c55e',
  custom: '#a855f7',
};

const roleIcons: Record<AgentRole, string> = {
  editor: '📝',
  reviewer: '🔍',
  researcher: '🔬',
  custom: '⚙️',
};

export const AgentNode: React.FC<AgentNodeProps> = ({ data, onDrag, onStart, onStop, selected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      nodeX: data.x,
      nodeY: data.y,
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !onDrag) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.nodeX + dx;
      const newY = dragRef.current.nodeY + dy;
      onDrag(data.id, newX, newY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [data.id, data.x, data.y, onDrag]);

  const statusBorderColors = {
    idle: '#333',
    running: '#06b6d4',
    completed: '#22c55e',
    error: '#ef4444',
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: data.x,
        top: data.y,
        width: 160,
        padding: 12,
        background: '#1a1a2e',
        border: `2px solid ${selected ? roleColors[data.role] : statusBorderColors[data.status]}`,
        borderRadius: 8,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        boxShadow: selected ? `0 0 12px ${roleColors[data.role]}40` : 'none',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{roleIcons[data.role]}</span>
        <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>{data.role}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', marginBottom: 8 }}>
        {data.name}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
        Status: <span style={{ color: statusBorderColors[data.status] }}>{data.status}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {data.status === 'idle' || data.status === 'error' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStart?.(data.id); }}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: 11,
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Start
          </button>
        ) : data.status === 'running' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onStop?.(data.id); }}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: 11,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onStart?.(data.id); }}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: 11,
              background: '#06b6d4',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Re-run
          </button>
        )}
      </div>
    </div>
  );
};

// Helper to create default agent node data
export const createAgentNode = (id: string, role: AgentRole, x: number, y: number): AgentNodeData => ({
  id,
  role,
  name: `${role.charAt(0).toUpperCase() + role.slice(1)} Agent`,
  status: 'idle',
  x,
  y,
});