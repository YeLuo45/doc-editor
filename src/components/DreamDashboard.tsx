import { useEffect } from 'react';
import { useDreamStore } from '../stores/dreamStore';
import { getL3Skills } from '../memory/layers/L3Skills';

export function DreamDashboard() {
  const {
    phase,
    messageCount,
    tokenCount,
    dreamCount,
    archives,
    archivesCount,
    updateStats,
    refreshLayers,
    compactionStats,
  } = useDreamStore();

  useEffect(() => {
    updateStats();
    refreshLayers();
    const interval = setInterval(() => {
      updateStats();
      refreshLayers();
    }, 5000);
    return () => clearInterval(interval);
  }, [updateStats, refreshLayers]);

  const skills = getL3Skills();
  const isDream = phase === 'dream';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--weight-semibold)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Dream Memory
        </h2>
        <span className={'pill ' + (isDream ? 'pill--orange' : 'pill--cyan')}>
          <span className="pill__dot" />
          {isDream ? 'Dreaming' : 'Active'}
        </span>
        <span
          className="card__subtitle"
          style={{ marginLeft: 'auto', fontFamily: 'var(--font-family-mono)' }}
        >
          updated every 5s
        </span>
      </div>

      {/* Top stat row */}
      <div className="stat-grid">
        <div
          className={'stat ' + (isDream ? 'stat--accent-orange' : 'stat--accent-cyan')}
        >
          <div className="stat__label">Phase</div>
          <div className="stat__value">
            {isDream ? 'Dream' : 'Wake'}
          </div>
          <div className="stat__hint">
            {isDream ? '记忆压缩进行中' : '实时对话模式'}
          </div>
        </div>
        <div className="stat stat--accent-cyan">
          <div className="stat__label">Messages</div>
          <div className="stat__value">{messageCount}</div>
          <div className="stat__hint">当前会话累计</div>
        </div>
        <div className="stat stat--accent-violet">
          <div className="stat__label">Tokens ~</div>
          <div className="stat__value">{tokenCount}</div>
          <div className="stat__hint">估算 token 用量</div>
        </div>
        <div className="stat stat--accent-emerald">
          <div className="stat__label">Dreams</div>
          <div className="stat__value">{dreamCount}</div>
          <div className="stat__hint">压缩触发次数</div>
        </div>
        <div className="stat">
          <div className="stat__label">Archives</div>
          <div className="stat__value">{archivesCount}</div>
          <div className="stat__hint">历史压缩存档</div>
        </div>
      </div>

      {/* Compaction stats */}
      <div className="card">
        <div className="card__header">
          <div className="card__title">Compaction Stats</div>
          <span
            className="pill pill--violet"
            style={{ padding: '2px 8px' }}
          >
            Aggregate
          </span>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">Sessions Archived</div>
            <div className="stat__value">
              {compactionStats.totalArchivedSessions}
            </div>
          </div>
          <div className="stat">
            <div className="stat__label">Messages Archived</div>
            <div className="stat__value">
              {compactionStats.totalArchivedMessages}
            </div>
          </div>
          <div className="stat stat--accent-cyan">
            <div className="stat__label">L3 Skills</div>
            <div className="stat__value">{skills.length}</div>
          </div>
        </div>
      </div>

      {/* Archives list */}
      <div className="card">
        <div className="card__header">
          <div className="card__title">Archives</div>
          <div className="card__subtitle">{archives.length} on disk</div>
        </div>
        {archives.length === 0 ? (
          <div className="empty">No archives yet</div>
        ) : (
          <div>
            {archives.map((archive) => (
              <div key={archive.id} className="list-row">
                <div className="list-row__title">{archive.summary}</div>
                <div className="list-row__meta">
                  <span>{archive.messageCount} msgs</span>
                  <span className="list-row__meta-sep" />
                  <span>
                    {new Date(archive.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* L3 Skills list */}
      <div className="card">
        <div className="card__header">
          <div className="card__title">L3 Skills</div>
          <div className="card__subtitle">
            top {Math.min(skills.length, 10)} of {skills.length}
          </div>
        </div>
        {skills.length === 0 ? (
          <div className="empty">No skills learned yet</div>
        ) : (
          <div>
            {skills.slice(0, 10).map((skill) => (
              <div key={skill.id} className="list-row">
                <div className="list-row__title">{skill.name}</div>
                <div
                  style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    marginTop: 2,
                  }}
                >
                  {skill.description}
                </div>
                <div className="list-row__meta">
                  <span>used {skill.usageCount}x</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
