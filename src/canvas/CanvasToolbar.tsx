import React from 'react';

interface CanvasToolbarProps {
  onAddAgent?: (role: string) => void;
  onAddPhase?: (phase: string) => void;
  onSave?: () => void;
  onLoad?: () => void;
  onClear?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onAddAgent,
  onAddPhase,
  onSave,
  onLoad,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      background: '#12121a',
      border: '1px solid #333',
      borderRadius: 8,
      width: 200,
    }}>
      <div style={{ fontSize: 12, color: '#f97316', fontWeight: 600, borderBottom: '1px solid #333', paddingBottom: 8 }}>
        Canvas Toolbar
      </div>

      {/* Agent Section */}
      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Add Agent</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => onAddAgent?.('editor')} style={toolBtnStyle}>📝 Editor Agent</button>
          <button onClick={() => onAddAgent?.('reviewer')} style={toolBtnStyle}>🔍 Reviewer Agent</button>
          <button onClick={() => onAddAgent?.('researcher')} style={toolBtnStyle}>🔬 Researcher Agent</button>
          <button onClick={() => onAddAgent?.('custom')} style={toolBtnStyle}>⚙️ Custom Agent</button>
        </div>
      </div>

      {/* Phase Section */}
      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Add Phase Gate</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => onAddPhase?.('design')} style={toolBtnStyle}>🎨 Design</button>
          <button onClick={() => onAddPhase?.('edit')} style={toolBtnStyle}>✏️ Edit</button>
          <button onClick={() => onAddPhase?.('review')} style={toolBtnStyle}>🔍 Review</button>
          <button onClick={() => onAddPhase?.('publish')} style={toolBtnStyle}>🚀 Publish</button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#333' }} />

      {/* View Controls */}
      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>View</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onZoomIn} style={{ ...toolBtnStyle, flex: 1, padding: '4px' }}>+</button>
          <button onClick={onZoomOut} style={{ ...toolBtnStyle, flex: 1, padding: '4px' }}>−</button>
          <button onClick={onResetView} style={{ ...toolBtnStyle, flex: 1, padding: '4px' }}>⟲</button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#333' }} />

      {/* File Operations */}
      <div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>File</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={onSave} style={{ ...toolBtnStyle, background: '#22c55e20', color: '#22c55e' }}>💾 Save</button>
          <button onClick={onLoad} style={{ ...toolBtnStyle, background: '#06b6d420', color: '#06b6d4' }}>📂 Load</button>
          <button onClick={onClear} style={{ ...toolBtnStyle, background: '#ef444420', color: '#ef4444' }}>🗑️ Clear</button>
        </div>
      </div>
    </div>
  );
};

const toolBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#1a1a2e',
  color: '#a0a0b0',
  border: '1px solid #333',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  textAlign: 'left',
  transition: 'all 0.2s',
};

export default CanvasToolbar;