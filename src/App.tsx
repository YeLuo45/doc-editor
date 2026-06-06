import { useEffect, useState } from 'react';
import { useEditorStore } from './stores';
import { useDreamStore, dreamMemory } from './utils/dreamMemory';
import { useFlagsStore } from './utils/featureFlags';
import { DreamMemoryStatus } from './components/DreamMemoryStatus';
import { FeatureFlagsPanel } from './components/FeatureFlagsPanel';
import { L0_META_RULES } from './utils/layeredMemory';
import { DreamDashboard } from './components/DreamDashboard';
import { SyncStatusPanel } from './components/SyncStatusPanel';
import { AgentCanvas, type CanvasMode } from './canvas/AgentCanvas.tsx';
import { WritingCoachPanel } from './components/WritingCoachPanel';
import { useBudgetStore } from './stores/budgetStore';

type SectionId = 'editor' | 'dream' | 'canvas' | 'tools' | 'settings';

interface NavItem {
  id: SectionId;
  label: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'editor', label: 'Editor', icon: '✎' },
  { id: 'dream', label: 'Dream Memory', icon: '☾', badge: 'DM' },
  { id: 'canvas', label: 'Agent Canvas', icon: '◫', badge: 'CV' },
  { id: 'tools', label: 'Writing Coach', icon: '✦' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  const { messages, input, addMessage, setInput, clearMessages } = useEditorStore();
  const { updateStats, phase } = useDreamStore();
  const { flags } = useFlagsStore();
  const [section, setSection] = useState<SectionId>('editor');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('edit');
  const [showCoach, setShowCoach] = useState(false);
  const { isOverBudget, isOverDailyLimit } = useBudgetStore();

  useEffect(() => {
    dreamMemory.setPhaseHandler((p) => useDreamStore.getState().setPhase(p));
  }, []);

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  // Sidebar nav click routing
  useEffect(() => {
    if (section === 'dream' && !showDashboard) setShowDashboard(true);
    if (section === 'canvas' && canvasMode === 'edit') setCanvasMode('canvas');
    if (section === 'tools' && !showCoach) setShowCoach(true);
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage('user', input);
    if (flags.DREAM_MEMORY) {
      dreamMemory.wake({
        id: Date.now().toString(36),
        role: 'user',
        content: input,
        timestamp: Date.now(),
      });
    }
    const response = `收到了: ${input}`;
    addMessage('assistant', response);
    if (flags.DREAM_MEMORY) {
      dreamMemory.wake({
        id: Date.now().toString(36),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      });
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSyncClick = () => {
    alert('Sync triggered. Implement sync logic with GistBackup.');
  };

  const handleConflictClick = () => {
    alert('Conflict resolution UI is pending implementation.');
  };

  const goEditor = () => {
    setSection('editor');
    setCanvasMode('edit');
  };

  const goCanvas = () => {
    setSection('canvas');
    setCanvasMode('canvas');
  };

  const currentTitle: Record<SectionId, { eyebrow: string; main: string }> = {
    editor: { eyebrow: 'Workspace', main: 'Editor' },
    dream: { eyebrow: 'Memory', main: 'Dream Dashboard' },
    canvas: { eyebrow: 'Workflow', main: 'Agent Canvas' },
    tools: { eyebrow: 'Productivity', main: 'Writing Coach' },
    settings: { eyebrow: 'System', main: 'Settings' },
  };

  return (
    <div
      className={
        'app-shell' +
        (canvasMode === 'canvas' ? ' app-shell--canvas-mode' : '')
      }
    >
      {/* ===================== Sidebar ===================== */}
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark" aria-hidden>
            dE
          </span>
          <span className="sidebar__brand-name">doc-editor</span>
          <span className="sidebar__brand-version">v145</span>
        </div>

        <nav className="sidebar__section" aria-label="Main">
          <div className="sidebar__section-title">Workspace</div>
          {NAV_ITEMS.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={
                  'sidebar__nav-item' +
                  (isActive ? ' sidebar__nav-item--active' : '')
                }
                onClick={() => {
                  if (item.id === 'canvas') goCanvas();
                  else if (item.id === 'editor') goEditor();
                  else setSection(item.id);
                }}
              >
                <span className="sidebar__nav-item-icon" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="sidebar__nav-item-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__divider" />

        <div className="sidebar__section" aria-label="Live status">
          <div className="sidebar__section-title">Live</div>
          <div className="flag-row" style={{ borderBottom: 'none' }}>
            <div className="flag-row__meta">
              <div className="flag-row__name">
                <span
                  className={
                    'pill__dot' +
                    ' ' +
                    (phase === 'dream'
                      ? 'pill--orange'
                      : 'pill--cyan')
                  }
                  style={{ width: 8, height: 8 }}
                />
                {phase === 'dream' ? 'Dream Phase' : 'Wake Phase'}
              </div>
              <div className="flag-row__desc">
                {flags.DREAM_MEMORY
                  ? '跨会话记忆已启用'
                  : '跨会话记忆已关闭'}
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__footer-status">
            <span className="sidebar__footer-dot" aria-hidden />
            <span>145 modules · live</span>
          </div>
        </div>
      </aside>

      {/* ===================== Topbar ===================== */}
      <header className="topbar">
        <div className="topbar__title">
          <span className="topbar__title-eyebrow">
            {currentTitle[section].eyebrow}
          </span>
          <span className="topbar__title-main">
            {currentTitle[section].main}
          </span>
        </div>

        <div className="topbar__spacer" />

        <div className="topbar__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowDashboard((v) => !v)}
            aria-pressed={showDashboard}
          >
            {showDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setShowSyncStatus((v) => !v)}
            aria-pressed={showSyncStatus}
          >
            Sync Status
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() =>
              setCanvasMode((m: CanvasMode) => (m === 'edit' ? 'canvas' : 'edit'))
            }
          >
            {canvasMode === 'edit' ? 'Open Canvas' : 'Close Canvas'}
          </button>
          <button
            type="button"
            className={
              'btn btn--sm ' +
              (isOverBudget || isOverDailyLimit
                ? 'btn--danger'
                : 'btn--primary')
            }
            onClick={() => setShowCoach((v) => !v)}
          >
            Coach
            {isOverBudget || isOverDailyLimit ? ' ⚠' : ''}
          </button>
        </div>
      </header>

      {/* ===================== Main ===================== */}
      <main className="main" aria-label="Main content">
        <div className="main__scroll">
          {showDashboard && <DreamDashboard />}

          {showSyncStatus && (
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <SyncStatusPanel
                onSyncClick={handleSyncClick}
                onConflictClick={handleConflictClick}
              />
            </div>
          )}

          {showCoach && <WritingCoachPanel />}

          {flags.DREAM_MEMORY && !showDashboard && <DreamMemoryStatus />}

          {flags.LAYERED_MEMORY && !showDashboard && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <div className="card__header">
                <div className="card__title">
                  <span
                    className="pill pill--orange"
                    style={{ padding: '2px 8px' }}
                  >
                    L0
                  </span>
                  Meta Rules
                </div>
                <div className="card__subtitle">编辑器约束</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {L0_META_RULES.map((rule, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                      padding: '4px 0',
                    }}
                  >
                    · {rule}
                  </div>
                ))}
              </div>
            </div>
          )}

          <ChatStream
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onClear={clearMessages}
            onKeyDown={handleKeyDown}
          />
        </div>
      </main>

      {/* ===================== Inspector ===================== */}
      <aside className="inspector" aria-label="Inspector">
        <div className="inspector__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="inspector__tab inspector__tab--active"
          >
            Status
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="inspector__tab"
            onClick={() => setSection('settings')}
          >
            Flags
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="inspector__tab"
            onClick={() => setSection('dream')}
          >
            Memory
          </button>
        </div>
        <div className="inspector__content">
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card__header">
              <div className="card__title">Runtime</div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <RuntimeRow label="Phase" value={phase} />
              <RuntimeRow
                label="Dream Memory"
                value={flags.DREAM_MEMORY ? 'on' : 'off'}
                tone={flags.DREAM_MEMORY ? 'cyan' : 'muted'}
              />
              <RuntimeRow
                label="Auto Compact"
                value={flags.AUTO_COMPACT ? 'on' : 'off'}
                tone={flags.AUTO_COMPACT ? 'cyan' : 'muted'}
              />
              <RuntimeRow
                label="Layered Memory"
                value={flags.LAYERED_MEMORY ? 'on' : 'off'}
                tone={flags.LAYERED_MEMORY ? 'cyan' : 'muted'}
              />
              <RuntimeRow
                label="Session Archive"
                value={flags.SESSION_ARCHIVE ? 'on' : 'off'}
                tone={flags.SESSION_ARCHIVE ? 'cyan' : 'muted'}
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card__header">
              <div className="card__title">Feature Flags</div>
              <span
                className="pill pill--cyan"
                style={{ padding: '2px 8px' }}
              >
                Live
              </span>
            </div>
            <FeatureFlagsPanel />
          </div>
        </div>
      </aside>

      {/* ===================== Canvas (fullscreen overlay) ===================== */}
      <AgentCanvas mode={canvasMode} onModeSwitch={setCanvasMode} />
    </div>
  );
}

/* ---------- inline helpers ---------- */

function RuntimeRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'cyan' | 'orange' | 'muted';
}) {
  const colorMap: Record<string, string> = {
    cyan: 'var(--color-accent-cyan-strong)',
    orange: 'var(--color-accent-orange-strong)',
    muted: 'var(--color-text-tertiary)',
  };
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          color: colorMap[tone ?? 'muted'] ?? colorMap.muted,
          fontFamily: 'var(--font-family-mono)',
          fontWeight: 'var(--weight-semibold)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ChatStream({
  messages,
  input,
  onInputChange,
  onSend,
  onClear,
  onKeyDown,
}: {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onClear: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <>
      <div className="welcome">
        <div className="welcome__eyebrow">
          <span className="pill__dot" /> Workspace
        </div>
        <h1 className="welcome__title">
          A multi-agent authoring surface that thinks alongside you.
        </h1>
        <p className="welcome__subtitle">
          Cross-session Dream memory, layered context compaction, agent canvas,
          and an evolving writing coach. Start a thread to wake the system.
        </p>
        <div className="welcome__meta">
          <span>145 modules wired</span>
          <span>·</span>
          <span>React 19 + Vite 8</span>
          <span>·</span>
          <span>Zustand</span>
        </div>
      </div>

      <div
        className="card"
        style={{ minHeight: 320, padding: 'var(--space-5)' }}
      >
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div style={{ fontSize: 32 }}>✎</div>
            <div className="chat-empty__title">No messages yet</div>
            <div className="chat-empty__hint">
              Type a prompt below. The editor will route it through Dream memory,
              then compose a response from the active feature set.
            </div>
          </div>
        ) : (
          <div className="chat-stream">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={'message message--' + msg.role}
              >
                <div className="message__avatar" aria-hidden>
                  {msg.role === 'user' ? 'U' : 'dE'}
                </div>
                <div className="message__bubble">
                  <div className="message__meta">
                    <span className="message__role">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span>·</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message__content">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 'var(--space-4)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          className="chat-input__textarea"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message, press Enter to send, Shift+Enter for newline"
          rows={2}
          style={{ flex: 1 }}
        />
        <div className="chat-input__actions">
          <button type="button" className="btn btn--primary" onClick={onSend}>
            Send
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>
    </>
  );
}
