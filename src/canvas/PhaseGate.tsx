import React, { useState, useCallback } from 'react';

// Phase types
export type PhaseType = 'design' | 'edit' | 'review' | 'publish';

export interface PhaseGateData {
  id: string;
  phase: PhaseType;
  name: string;
  x: number;
  y: number;
  guardEnabled: boolean;
  approved: boolean;
}

interface PhaseGateProps {
  data: PhaseGateData;
  onEnter?: (id: string) => void;
  onExit?: (id: string) => void;
  onGuardToggle?: (id: string, enabled: boolean) => void;
  onModeTransition?: (id: string, direction: 'enter' | 'exit') => void;
  selected?: boolean;
}

const phaseColors: Record<PhaseType, string> = {
  design: '#a855f7',
  edit: '#06b6d4',
  review: '#f97316',
  publish: '#22c55e',
};

const phaseOrder: PhaseType[] = ['design', 'edit', 'review', 'publish'];

export const PhaseGate: React.FC<PhaseGateProps> = ({
  data,
  onEnter,
  onExit,
  onGuardToggle,
  onModeTransition,
  selected,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleEnter = useCallback(() => {
    onEnter?.(data.id);
    onModeTransition?.(data.id, 'enter');
  }, [data.id, onEnter, onModeTransition]);

  const handleExit = useCallback(() => {
    onExit?.(data.id);
    onModeTransition?.(data.id, 'exit');
  }, [data.id, onExit, onModeTransition]);

  const handleGuardToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onGuardToggle?.(data.id, !data.guardEnabled);
  }, [data.id, data.guardEnabled, onGuardToggle]);

  const phaseIndex = phaseOrder.indexOf(data.phase);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        left: data.x,
        top: data.y,
        width: 180,
        padding: 16,
        background: '#12121a',
        border: `2px solid ${selected ? phaseColors[data.phase] : data.approved ? '#22c55e' : '#333'}`,
        borderRadius: 12,
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: selected ? `0 0 16px ${phaseColors[data.phase]}40` : 'none',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: '#666', textTransform: 'uppercase' }}>Phase {phaseIndex + 1}</span>
        <span style={{ fontSize: 16 }}>🚪</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: phaseColors[data.phase], marginBottom: 4 }}>
        {data.name}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
        {data.phase.charAt(0).toUpperCase() + data.phase.slice(1)} Gate
      </div>

      {data.guardEnabled && (
        <div style={{
          padding: '6px 8px',
          background: data.approved ? '#22c55e20' : '#f9731620',
          borderRadius: 6,
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ fontSize: 12 }}>
            {data.approved ? '✅ Approved' : '⏳ Pending'}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={handleEnter}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: 11,
            background: isHovered ? phaseColors[data.phase] : '#1a1a2e',
            color: isHovered ? '#fff' : phaseColors[data.phase],
            border: `1px solid ${phaseColors[data.phase]}`,
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Enter
        </button>
        <button
          onClick={handleExit}
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: 11,
            background: '#1a1a2e',
            color: '#a0a0b0',
            border: '1px solid #333',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Exit
        </button>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#666' }}>Guard</span>
        <button
          onClick={handleGuardToggle}
          style={{
            width: 36,
            height: 18,
            background: data.guardEnabled ? '#22c55e' : '#333',
            borderRadius: 9,
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 2,
            left: data.guardEnabled ? 18 : 2,
            width: 14,
            height: 14,
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>
    </div>
  );
};

// Helper to create default phase gate data
export const createPhaseGate = (id: string, phase: PhaseType, x: number, y: number): PhaseGateData => ({
  id,
  phase,
  name: `${phase.charAt(0).toUpperCase() + phase.slice(1)} Phase`,
  x,
  y,
  guardEnabled: phase !== 'design',
  approved: false,
});

// Get next phase
export const getNextPhase = (current: PhaseType): PhaseType | null => {
  const idx = phaseOrder.indexOf(current);
  return idx < phaseOrder.length - 1 ? phaseOrder[idx + 1] : null;
};

// Get prev phase
export const getPrevPhase = (current: PhaseType): PhaseType | null => {
  const idx = phaseOrder.indexOf(current);
  return idx > 0 ? phaseOrder[idx - 1] : null;
};