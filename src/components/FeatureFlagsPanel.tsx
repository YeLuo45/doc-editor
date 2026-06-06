import { useFlagsStore } from '../utils/featureFlags';

export function FeatureFlagsPanel() {
  const { flags, toggleFlag } = useFlagsStore();
  const { DREAM_MEMORY, AUTO_COMPACT, LAYERED_MEMORY, SESSION_ARCHIVE } = flags;

  const rows = [
    {
      key: 'DREAM_MEMORY' as const,
      value: DREAM_MEMORY,
      name: 'Dream Memory',
      desc: '跨会话两阶段记忆 (Wake → Dream)',
    },
    {
      key: 'AUTO_COMPACT' as const,
      value: AUTO_COMPACT,
      name: 'Auto Compaction',
      desc: 'Token 超 80% 阈值自动压缩',
    },
    {
      key: 'LAYERED_MEMORY' as const,
      value: LAYERED_MEMORY,
      name: 'Layered Memory',
      desc: 'L0-L4 五层记忆架构',
    },
    {
      key: 'SESSION_ARCHIVE' as const,
      value: SESSION_ARCHIVE,
      name: 'Session Archive',
      desc: '会话归档到 L4 存档',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map(({ key, value, name, desc }) => (
        <div key={key} className="flag-row">
          <div className="flag-row__meta">
            <div className="flag-row__name">
              {name}
              <span
                className="pill"
                style={{
                  padding: '1px 6px',
                  background: value
                    ? 'var(--color-accent-cyan-soft)'
                    : 'var(--color-bg-overlay)',
                  color: value
                    ? 'var(--color-accent-cyan-strong)'
                    : 'var(--color-text-tertiary)',
                  border: '1px solid var(--color-border-subtle)',
                  textTransform: 'lowercase',
                }}
              >
                {value ? 'on' : 'off'}
              </span>
            </div>
            <div className="flag-row__desc">{desc}</div>
          </div>
          <label className="flag-row__toggle" aria-label={'Toggle ' + name}>
            <input
              type="checkbox"
              checked={value}
              onChange={() => toggleFlag(key)}
            />
            <span className="flag-row__toggle-track">
              <span className="flag-row__toggle-thumb" />
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}
