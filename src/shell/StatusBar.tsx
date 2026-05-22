// StatusBar - Bottom status bar with agent states and audit log access

import React, { useState, useEffect } from 'react';
import { agentStateManager } from '../agents/state/AgentStateManager';
import { type AgentState } from '../agents/state/AgentState';
import { getLogs } from '../audit/AuditLog';
import { type AuditEvent } from '../audit/AuditEvent';

interface StatusBarProps {
  onAuditLogClick?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onAuditLogClick }) => {
  const [agentStates, setAgentStates] = useState<AgentState[]>([]);
  const [auditCount, setAuditCount] = useState(0);

  useEffect(() => {
    // Load initial agent states
    setAgentStates(agentStateManager.getAllStates());

    // Subscribe to state changes
    const subscriptions: (() => void)[] = [];
    const agentIds = ['editor', 'reviewer', 'researcher'];

    agentIds.forEach(id => {
      const unsub = agentStateManager.subscribe(id, (state) => {
        setAgentStates(prev => {
          const existing = prev.findIndex(s => s.id === id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = state;
            return updated;
          }
          return [...prev, state];
        });
      });
      subscriptions.push(unsub);
    });

    // Load audit log count
    const logs = getLogs();
    setAuditCount(logs.length);

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, []);

  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 20px',
    backgroundColor: 'var(--color-surface)',
    borderTop: `1px solid var(--color-border)`,
    fontFamily: 'var(--font-primary)',
    fontSize: '12px',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const agentStatusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const statusDotStyle = (status: string): React.CSSProperties => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor:
      status === 'idle' ? 'var(--color-border)' :
      status === 'working' ? 'var(--color-primary)' :
      status === 'waiting_feedback' ? '#f59e0b' :
      status === 'completed' ? 'var(--color-success)' :
      'var(--color-border)',
  });

  const auditButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'var(--color-background)',
    border: `1px solid var(--color-border)`,
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontSize: '12px',
    fontFamily: 'var(--font-primary)',
  };

  const getAgentIcon = (id: string): string => {
    switch (id) {
      case 'editor': return '✏️';
      case 'reviewer': return '👀';
      case 'researcher': return '🔍';
      default: return '🤖';
    }
  };

  const getAgentLabel = (id: string): string => {
    switch (id) {
      case 'editor': return 'Editor';
      case 'reviewer': return 'Reviewer';
      case 'researcher': return 'Researcher';
      default: return id;
    }
  };

  return (
    <div style={statusBarStyle}>
      <div style={leftSectionStyle}>
        {/* Agent States */}
        {agentStates.map(state => (
          <div key={state.id} style={agentStatusStyle}>
            <span style={statusDotStyle(state.status)} />
            <span>{getAgentIcon(state.id)}</span>
            <span style={{ color: 'var(--color-secondary)' }}>
              {getAgentLabel(state.id)}:
            </span>
            <span style={{ color: 'var(--color-text)' }}>
              {state.status}
            </span>
          </div>
        ))}
      </div>

      <div style={rightSectionStyle}>
        {/* Audit Log Button */}
        <button
          style={auditButtonStyle}
          onClick={onAuditLogClick}
          title="View Audit Log"
        >
          <span>📋</span>
          <span>Audit Log</span>
          {auditCount > 0 && (
            <span
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '10px',
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {auditCount > 99 ? '99+' : auditCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
