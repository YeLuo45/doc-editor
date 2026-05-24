import { useFeatureFlagsStore } from '../stores/featureFlagsStore';

export function FeatureFlagsPanel() {
  const { DREAM_MEMORY, AUTO_COMPACT, CROSS_SESSION, setFlag } = useFeatureFlagsStore();

  const flags = [
    { key: 'DREAM_MEMORY' as const, value: DREAM_MEMORY, label: 'Dream Memory', desc: '启用跨会话Dream两阶段记忆' },
    { key: 'AUTO_COMPACT' as const, value: AUTO_COMPACT, label: 'Auto Compaction', desc: 'Token超80%阈值自动压缩' },
    { key: 'CROSS_SESSION' as const, value: CROSS_SESSION, label: 'Cross Session', desc: 'App重启后恢复上一会话' },
  ];

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', color: '#f0f0f5' }}>
      <h3 style={{ marginTop: 0 }}>⚙️ Feature Flags</h3>
      {flags.map(({ key, value, label, desc }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #333' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#a0a0b0' }}>{desc}</div>
          </div>
          <label style={{ position: 'relative', width: 44, height: 24, display: 'inline-block' }}>
            <input
              type="checkbox"
              checked={value}
              onChange={e => setFlag(key, e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              background: value ? '#06b6d4' : '#333', borderRadius: 24,
              transition: '0.2s',
            }}>
              <span style={{
                position: 'absolute', content: '', width: 18, height: 18,
                left: value ? 24 : 3, bottom: 3, background: '#fff',
                borderRadius: '50%', transition: '0.2s',
              }} />
            </span>
          </label>
        </div>
      ))}
    </div>
  );
}