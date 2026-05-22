// AuditLogPanel - Modal panel for viewing audit logs

import React, { useState, useEffect } from 'react';
import { getLogs, clear } from '../audit/AuditLog';
import { type AuditEvent, type AuditEventType } from '../audit/AuditEvent';

interface AuditLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogPanel: React.FC<AuditLogPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [filterType, setFilterType] = useState<AuditEventType | 'all'>('all');

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, filterType]);

  const loadLogs = (): void => {
    const filter = filterType === 'all' ? undefined : { eventType: filterType as AuditEventType };
    setLogs(getLogs(filter));
  };

  const handleClear = (): void => {
    clear();
    setLogs([]);
  };

  const formatTimestamp = (ts: number): string => {
    return new Date(ts).toLocaleString();
  };

  const getEventTypeLabel = (type: AuditEventType): string => {
    return type.replace(/_/g, ' ');
  };

  const getEventIcon = (type: AuditEventType): string => {
    switch (type) {
      case 'document_created': return '📄';
      case 'document_opened': return '📂';
      case 'document_edited': return '✏️';
      case 'permission_changed': return '🔐';
      case 'document_exported': return '📤';
      case 'document_deleted': return '🗑️';
      default: return '📋';
    }
  };

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const panelStyle: React.CSSProperties = {
    width: '600px',
    maxHeight: '80vh',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-primary)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid var(--color-border)`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-text)',
  };

  const closeButtonStyle: React.CSSProperties = {
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: `1px solid var(--color-border)`,
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontSize: '13px',
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
  };

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--color-background)',
    borderRadius: '6px',
  };

  const logItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderBottom: `1px solid var(--color-border)`,
  };

  const eventTypes: AuditEventType[] = [
    'document_created',
    'document_opened',
    'document_edited',
    'permission_changed',
    'document_exported',
    'document_deleted',
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <span style={titleStyle}>📋 Audit Log ({logs.length})</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleClear}
              style={{ ...closeButtonStyle, borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              Clear All
            </button>
            <button onClick={onClose} style={closeButtonStyle}>
              Close
            </button>
          </div>
        </div>

        <div style={bodyStyle}>
          {/* Filter Bar */}
          <div style={filterBarStyle}>
            <span style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>Filter:</span>
            <button
              key="all"
              onClick={() => setFilterType('all')}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                backgroundColor: filterType === 'all' ? 'var(--color-primary)' : 'transparent',
                color: filterType === 'all' ? '#ffffff' : 'var(--color-text)',
                border: `1px solid ${filterType === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              All
            </button>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  backgroundColor: filterType === type ? 'var(--color-primary)' : 'transparent',
                  color: filterType === type ? '#ffffff' : 'var(--color-text)',
                  border: `1px solid ${filterType === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {getEventTypeLabel(type)}
              </button>
            ))}
          </div>

          {/* Log List */}
          {logs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--color-secondary)',
                fontSize: '14px',
              }}
            >
              No audit logs found
            </div>
          ) : (
            logs.slice(-50).reverse().map((log, index) => (
              <div key={index} style={logItemStyle}>
                <span style={{ fontSize: '16px' }}>{getEventIcon(log.type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500 }}>
                    {getEventTypeLabel(log.type)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-secondary)', marginTop: '4px' }}>
                    {log.userId && <span>User: {log.userId} | </span>}
                    {formatTimestamp(log.timestamp)}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-secondary)',
                        marginTop: '4px',
                        fontFamily: 'var(--font-monospace)',
                        backgroundColor: 'var(--color-background)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogPanel;
