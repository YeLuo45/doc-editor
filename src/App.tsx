import { useEffect, useState } from 'react';
import { I18nProvider, useTranslation } from './i18n';
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
import { SettingsPanel } from './components/SettingsPanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useBudgetStore } from './stores/budgetStore';

type SectionId = 'editor' | 'dream' | 'canvas' | 'tools' | 'settings';

interface NavItem {
  id: SectionId;
  icon: string;
  badge?: string;
  labelKey:
    | 'sidebar.nav.editor'
    | 'sidebar.nav.dreamMemory'
    | 'sidebar.nav.agentCanvas'
    | 'sidebar.nav.writingCoach'
    | 'sidebar.nav.settings';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'editor',   icon: '✎', labelKey: 'sidebar.nav.editor' },
  { id: 'dream',    icon: '☾', badge: 'DM', labelKey: 'sidebar.nav.dreamMemory' },
  { id: 'canvas',   icon: '◫', badge: 'CV', labelKey: 'sidebar.nav.agentCanvas' },
  { id: 'tools',    icon: '✦', labelKey: 'sidebar.nav.writingCoach' },
  { id: 'settings', icon: '⚙', labelKey: 'sidebar.nav.settings' },
];

export default function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

function AppShell() {
  const { messages, input, addMessage, setInput, clearMessages } = useEditorStore();
  const { updateStats, phase } = useDreamStore();
  const { flags } = useFlagsStore();
  const { t } = useTranslation();
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

  const currentTitle: Record<SectionId, { eyebrowKey: string; titleKey: string }> = {
    editor:   { eyebrowKey: 'topbar.eyebrow.editor',      titleKey: 'topbar.title.editor' },
    dream:    { eyebrowKey: 'topbar.eyebrow.memory',      titleKey: 'topbar.title.dreamDashboard' },
    canvas:   { eyebrowKey: 'topbar.eyebrow.workflow',    titleKey: 'topbar.title.agentCanvas' },
    tools:    { eyebrowKey: 'topbar.eyebrow.productivity',titleKey: 'topbar.title.writingCoach' },
    settings: { eyebrowKey: 'topbar.eyebrow.system',      titleKey: 'topbar.title.settings' },
  };

  const isSettingsView = section === 'settings';

  return (
    <div
      className={
        'app-shell' +
        (canvasMode === 'canvas' ? ' app-shell--canvas-mode' : '')
      }
    >
      {/* ===================== Sidebar ===================== */}
      <aside className="sidebar" aria-label={t('sidebar.section.workspace')}>
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark" aria-hidden>
            dE
          </span>
          <span className="sidebar__brand-name">{t('app.brand')}</span>
          <span className="sidebar__brand-version">v145</span>
        </div>

        <nav className="sidebar__section" aria-label="Main">
          <div className="sidebar__section-title">{t('sidebar.section.workspace')}</div>
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
                <span>{t(item.labelKey)}</span>
                {item.badge && (
                  <span className="sidebar__nav-item-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__divider" />

        <div className="sidebar__section" aria-label={t('sidebar.section.live')}>
          <div className="sidebar__section-title">{t('sidebar.section.live')}</div>
          <div className="flag-row" style={{ borderBottom: 'none' }}>
            <div className="flag-row__meta">
              <div className="flag-row__name">
                <span
                  className={
                    'pill__dot' +
                    ' ' +
                    (phase === 'dream' ? 'pill--orange' : 'pill--cyan')
                  }
                  style={{ width: 8, height: 8 }}
                />
                {phase === 'dream' ? t('sidebar.live.dreamPhase') : t('sidebar.live.wakePhase')}
              </div>
              <div className="flag-row__desc">
                {flags.DREAM_MEMORY
                  ? t('sidebar.live.crossSessionOn')
                  : t('sidebar.live.crossSessionOff')}
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__footer-status">
            <span className="sidebar__footer-dot" aria-hidden />
            <span>{t('sidebar.footer.modulesLive', { count: 145 })}</span>
          </div>
        </div>
      </aside>

      {/* ===================== Topbar ===================== */}
      <header className="topbar">
        <div className="topbar__title">
          <span className="topbar__title-eyebrow">
            {t(currentTitle[section].eyebrowKey as Parameters<typeof t>[0])}
          </span>
          <span className="topbar__title-main">
            {t(currentTitle[section].titleKey as Parameters<typeof t>[0])}
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
            {showDashboard ? t('topbar.action.hideDashboard') : t('topbar.action.showDashboard')}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setShowSyncStatus((v) => !v)}
            aria-pressed={showSyncStatus}
          >
            {t('topbar.action.syncStatus')}
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() =>
              setCanvasMode((m: CanvasMode) => (m === 'edit' ? 'canvas' : 'edit'))
            }
          >
            {canvasMode === 'edit' ? t('topbar.action.openCanvas') : t('topbar.action.closeCanvas')}
          </button>
          <button
            type="button"
            className={
              'btn btn--sm ' +
              (isOverBudget || isOverDailyLimit ? 'btn--danger' : 'btn--primary')
            }
            onClick={() => setShowCoach((v) => !v)}
          >
            {t('topbar.action.coach')}
            {isOverBudget || isOverDailyLimit ? ' ⚠' : ''}
          </button>
          {/* Inline language switcher for quick switching outside Settings */}
          <LanguageSwitcher />
        </div>
      </header>

      {/* ===================== Main ===================== */}
      <main className="main" aria-label="Main content">
        <div className="main__scroll">
          {isSettingsView ? (
            <SettingsPanel />
          ) : (
            <>
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
                      {t('metaRules.title')}
                    </div>
                    <div className="card__subtitle">{t('metaRules.subtitle')}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {L0_META_RULES.map((_rule, i) => {
                      const key = `metaRules.rule.${
                        i === 0 ? 'editorStructure' :
                        i === 1 ? 'completeCriteria' :
                        i === 2 ? 'loadFromStorage' :
                        'editorStructure'
                      }` as Parameters<typeof t>[0];
                      return (
                        <div
                          key={i}
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)',
                            padding: '4px 0',
                          }}
                        >
                          · {t(key)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <ChatStream messages={messages} />
            </>
          )}
        </div>

        {!isSettingsView && (
          <ChatComposer
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            onClear={clearMessages}
            onKeyDown={handleKeyDown}
          />
        )}
      </main>

      {/* ===================== Inspector ===================== */}
      <aside className="inspector" aria-label="Inspector">
        <div className="inspector__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isSettingsView}
            className={
              'inspector__tab' + (!isSettingsView ? ' inspector__tab--active' : '')
            }
          >
            {t('inspector.tab.status')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="inspector__tab"
            onClick={() => setSection('settings')}
          >
            {t('inspector.tab.flags')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="inspector__tab"
            onClick={() => setSection('dream')}
          >
            {t('inspector.tab.memory')}
          </button>
        </div>
        <div className="inspector__content">
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card__header">
              <div className="card__title">{t('inspector.card.runtime')}</div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <RuntimeRow label={t('inspector.runtime.phase')} value={phase} />
              <RuntimeRow
                label={t('inspector.runtime.dreamMemory')}
                value={flags.DREAM_MEMORY ? t('inspector.value.on') : t('inspector.value.off')}
                tone={flags.DREAM_MEMORY ? 'cyan' : 'muted'}
              />
              <RuntimeRow
                label={t('inspector.runtime.autoCompact')}
                value={flags.AUTO_COMPACT ? t('inspector.value.on') : t('inspector.value.off')}
                tone={flags.AUTO_COMPACT ? 'cyan' : 'muted'}
              />
              <RuntimeRow
                label={t('inspector.runtime.layeredMemory')}
                value={flags.LAYERED_MEMORY ? t('inspector.value.on') : t('inspector.value.off')}
                tone={flags.LAYERED_MEMORY ? 'cyan' : 'muted'}
              />
              <RuntimeRow
                label={t('inspector.runtime.sessionArchive')}
                value={flags.SESSION_ARCHIVE ? t('inspector.value.on') : t('inspector.value.off')}
                tone={flags.SESSION_ARCHIVE ? 'cyan' : 'muted'}
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="card__header">
              <div className="card__title">{t('inspector.card.featureFlags')}</div>
              <span
                className="pill pill--cyan"
                style={{ padding: '2px 8px' }}
              >
                {t('inspector.pill.live')}
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
}: {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
}) {
  const { t } = useTranslation();
  return (
    <>
      {messages.length === 0 ? (
        <div className="welcome">
          <div className="welcome__eyebrow">
            <span className="pill__dot" /> {t('welcome.eyebrow')}
          </div>
          <h1 className="welcome__title">
            {t('welcome.title')}
          </h1>
          <p className="welcome__subtitle">
            {t('welcome.subtitle')}
          </p>
          <div className="welcome__meta">
            <span>{t('welcome.meta.modules', { count: 145 })}</span>
            <span>·</span>
            <span>React 19 + Vite 8</span>
            <span>·</span>
            <span>Zustand</span>
          </div>

          <div
            style={{
              marginTop: 'var(--space-6)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            <QuickAction
              title={t('welcome.quickAction.openCanvas.title')}
              desc={t('welcome.quickAction.openCanvas.desc')}
              onClick={() => {/* navigation handled by sidebar */}}
            />
            <QuickAction
              title={t('welcome.quickAction.dreamMemory.title')}
              desc={t('welcome.quickAction.dreamMemory.desc')}
              onClick={() => {/* navigation handled by sidebar */}}
            />
            <QuickAction
              title={t('welcome.quickAction.writingCoach.title')}
              desc={t('welcome.quickAction.writingCoach.desc')}
              onClick={() => {/* navigation handled by sidebar */}}
            />
            <QuickAction
              title={t('welcome.quickAction.featureFlags.title')}
              desc={t('welcome.quickAction.featureFlags.desc')}
              onClick={() => {/* navigation handled by sidebar */}}
            />
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
                    {msg.role === 'user' ? t('composer.role.you') : t('composer.role.assistant')}
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
    </>
  );
}

function QuickAction({
  title,
  desc,
  onClick,
}: {
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--color-accent-cyan)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--color-border-subtle)';
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-md)',
          fontWeight: 'var(--weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        {desc}
      </div>
    </button>
  );
}

function ChatComposer({
  input,
  onInputChange,
  onSend,
  onClear,
  onKeyDown,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onClear: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="chat-composer">
      <div className="chat-composer__inner">
        <textarea
          className="chat-input__textarea"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('composer.placeholder')}
          rows={1}
        />
        <div className="chat-composer__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClear}>
            {t('composer.action.clear')}
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={onSend}
            disabled={!input.trim()}
          >
            {t('composer.action.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
