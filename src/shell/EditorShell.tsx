// EditorShell - Main editor shell integrating all subsystems

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Toolbar } from './Toolbar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { AuditLogPanel } from './AuditLogPanel';
import { themeManager } from '../theme/ThemeManager';
import { setLocale, getLocale } from '../i18n/index';
import { providerFactory } from '../providers/factory';
import { DocumentContext } from '../context/DocumentContext';
import { agentStateManager } from '../agents/state/AgentStateManager';
import { pluginManager } from '../plugins/PluginManager';
import { samplePlugin } from '../plugins/builtin/sample-plugin';
import { toolRegistry } from '../tools/registry';
import { getTemplates, getCategories } from '../templates/registry';
import { type Template, type TemplateCategory } from '../templates/types';
import { log as auditLog } from '../audit/AuditLog';
import { type AuditEvent, type AuditEventType } from '../audit/AuditEvent';
import { v4 as uuidv4 } from 'uuid';

// Simple content editor component for the shell
const SimpleEditor: React.FC<{
  onContentChange?: (content: string) => void;
  initialContent?: string;
}> = ({ onContentChange, initialContent = '' }) => {
  const [content, setContent] = useState(initialContent);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange?.(newContent);
  };

  const editorStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-background)',
    padding: '20px',
    overflow: 'auto',
  };

  const textareaStyle: React.CSSProperties = {
    flex: 1,
    width: '100%',
    padding: '16px',
    fontSize: '14px',
    fontFamily: 'var(--font-primary)',
    lineHeight: '1.6',
    border: `1px solid var(--color-border)`,
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    resize: 'none',
    outline: 'none',
  };

  return (
    <div style={editorStyle}>
      <textarea
        style={textareaStyle}
        value={content}
        onChange={handleChange}
        placeholder="Start typing your document..."
      />
    </div>
  );
};

interface EditorShellProps {
  initialTemplate?: Template;
}

export const EditorShell: React.FC<EditorShellProps> = ({ initialTemplate }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorContent, setEditorContent] = useState('');

  // Bootstrap - Initialize all subsystems in order
  const bootstrap = useCallback(async (): Promise<void> => {
    console.log('[EditorShell] Starting bootstrap...');

    try {
      // 1. Theme Manager - Load saved theme or default to light
      const savedTheme = localStorage.getItem('doc-editor-theme') as 'light' | 'dark' | null;
      themeManager.setTheme(savedTheme || 'light');
      console.log('[EditorShell] Theme initialized');

      // 2. i18n - Load saved locale or default to en-US
      const savedLocale = localStorage.getItem('doc-editor-locale') as 'en-US' | 'zh-CN' | null;
      setLocale(savedLocale || 'en-US');
      console.log('[EditorShell] i18n initialized');

      // 3. Provider Factory - Initialize LLM providers (auto-initialized in constructor)
      console.log('[EditorShell] Provider factory initialized');

      // 4. Document Context - Initialize with a default document
      const docId = uuidv4();
      const docContext = new DocumentContext(docId, {
        title: 'Untitled Document',
        author: 'Anonymous',
      });
      docContext.save();
      console.log('[EditorShell] Document context initialized');

      // 5. Agent State Manager - Set initial states
      agentStateManager.updateState('editor', { status: 'idle' });
      agentStateManager.updateState('reviewer', { status: 'idle' });
      agentStateManager.updateState('researcher', { status: 'idle' });
      console.log('[EditorShell] Agent states initialized');

      // 6. Plugin Manager - Install and mount sample plugin
      pluginManager.install(samplePlugin);
      pluginManager.mount('sample-plugin');
      console.log('[EditorShell] Plugins initialized');

      // 7. Tool Registry - Discover tools (already done on import)
      console.log(`[EditorShell] Tools discovered: ${toolRegistry.getToolCount()}`);

      // Log bootstrap completion
      auditLog({
        type: 'document_created',
        userId: 'system',
        timestamp: Date.now(),
        metadata: { action: 'bootstrap', status: 'completed' },
      });

      console.log('[EditorShell] Bootstrap complete!');
      setIsInitialized(true);
    } catch (error) {
      console.error('[EditorShell] Bootstrap error:', error);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const handleTemplateSelect = (template: Template): void => {
    setEditorContent(template.content);
    auditLog({
      type: 'document_created',
      userId: 'local',
      timestamp: Date.now(),
      metadata: { templateId: template.id, templateName: template.name },
    });
  };

  const handleAuditLogClick = (): void => {
    setShowAuditLog(true);
  };

  const shellStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: 'var(--color-background)',
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  };

  const editorAreaStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  if (!isInitialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-background)',
          fontFamily: 'var(--font-primary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: '24px',
              marginBottom: '16px',
              color: 'var(--color-primary)',
            }}
          >
            📝
          </div>
          <div
            style={{
              fontSize: '16px',
              color: 'var(--color-text)',
            }}
          >
            Loading Editor...
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={shellStyle}>
        {/* Top Toolbar */}
        <Toolbar onTemplateSelect={handleTemplateSelect} />

        {/* Main Content Area */}
        <div style={mainContentStyle}>
          {/* Left Sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Editor Area */}
          <div style={editorAreaStyle}>
            <SimpleEditor
              onContentChange={setEditorContent}
              initialContent={editorContent}
            />
          </div>
        </div>

        {/* Bottom Status Bar */}
        <StatusBar onAuditLogClick={handleAuditLogClick} />

        {/* Audit Log Modal */}
        <AuditLogPanel
          isOpen={showAuditLog}
          onClose={() => setShowAuditLog(false)}
        />
      </div>
    </ErrorBoundary>
  );
};

export default EditorShell;
