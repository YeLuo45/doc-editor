// Sidebar - Left sidebar with tools list and collab cursors

import React, { useState, useEffect } from 'react';
import { toolRegistry } from '../tools/registry';
import { CursorManager } from '../collab/CursorManager';
import { CollabChannel, type CollabMessage } from '../collab/BroadcastChannel';

interface CollabCursor {
  userId: string;
  position: number;
  lastUpdate: number;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [tools, setTools] = useState<string[]>([]);
  const [cursors, setCursors] = useState<CollabCursor[]>([]);

  useEffect(() => {
    // Load tools from registry
    const toolNames = toolRegistry.getToolNames();
    setTools(toolNames);

    // Subscribe to tool registry changes
    const checkTools = setInterval(() => {
      const newToolNames = toolRegistry.getToolNames();
      if (newToolNames.length !== toolNames.length) {
        setTools(newToolNames);
      }
    }, 1000);

    return () => clearInterval(checkTools);
  }, []);

  useEffect(() => {
    // Set up cursor tracking
    const channel = new CollabChannel();
    const cursorManager = new CursorManager(channel);
    const currentUserId = cursorManager.getUserId();

    const handleCursorUpdate = (userId: string, position: number) => {
      setCursors(prev => {
        const existing = prev.findIndex(c => c.userId === userId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], position, lastUpdate: Date.now() };
          return updated;
        }
        return [...prev, { userId, position, lastUpdate: Date.now() }];
      });
    };

    const unsubscribe = cursorManager.onCursorUpdate(handleCursorUpdate);

    // Listen for other users' cursors
    const handleMessage = (msg: CollabMessage) => {
      if (msg.type === 'cursor_move' && msg.userId !== currentUserId) {
        handleCursorUpdate(msg.userId, msg.payload.position);
      }
    };

    channel.onMessage(handleMessage);

    return () => {
      unsubscribe();
      channel.close();
    };
  }, []);

  const handleToggle = (): void => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.();
  };

  const sidebarStyle: React.CSSProperties = {
    width: isCollapsed ? '48px' : '240px',
    minWidth: isCollapsed ? '48px' : '240px',
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    borderRight: `1px solid var(--color-border)`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s ease, min-width 0.2s ease',
    fontFamily: 'var(--font-primary)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'space-between',
    padding: isCollapsed ? '12px 8px' : '12px 16px',
    borderBottom: `1px solid var(--color-border)`,
    cursor: 'pointer',
  };

  const sectionStyle: React.CSSProperties = {
    padding: isCollapsed ? '0' : '12px 16px',
    borderBottom: `1px solid var(--color-border)`,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--color-secondary)',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  };

  const toolItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
    fontSize: '13px',
    color: 'var(--color-text)',
  };

  const cursorItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 0',
    fontSize: '13px',
    color: 'var(--color-text)',
  };

  const colorDotStyle = (color: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
  });

  return (
    <div style={sidebarStyle}>
      {/* Toggle Button */}
      <div style={headerStyle} onClick={handleToggle}>
        {!isCollapsed && (
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-secondary)' }}>
            TOOLS
          </span>
        )}
        <span style={{ fontSize: '16px', color: 'var(--color-text)' }}>
          {isCollapsed ? '→' : '←'}
        </span>
      </div>

      {!isCollapsed && (
        <>
          {/* Tools Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Available Tools ({tools.length})</div>
            {tools.length === 0 ? (
              <div style={{ ...toolItemStyle, color: 'var(--color-secondary)' }}>
                No tools registered
              </div>
            ) : (
              tools.slice(0, 10).map(toolName => (
                <div key={toolName} style={toolItemStyle}>
                  <span>🔧</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {toolName}
                  </span>
                </div>
              ))
            )}
            {tools.length > 10 && (
              <div style={{ ...toolItemStyle, color: 'var(--color-secondary)', fontSize: '12px' }}>
                +{tools.length - 10} more
              </div>
            )}
          </div>

          {/* Collaboration Cursors Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Online Users ({cursors.length + 1})</div>
            
            {/* Current user */}
            <div style={cursorItemStyle}>
              <span style={colorDotStyle('var(--color-primary)')} />
              <span>You</span>
            </div>
            
            {/* Other users */}
            {cursors.map(cursor => (
              <div key={cursor.userId} style={cursorItemStyle}>
                <span style={colorDotStyle('#10b981')} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  User {cursor.userId.slice(-4)}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--color-secondary)' }}>
                  pos:{cursor.position}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
