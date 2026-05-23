import { useFlagsStore, ALL_FLAGS, FLAG_DESCRIPTIONS } from '../utils/featureFlags';

export function FeatureFlagsPanel() {
  const { flags, toggleFlag, resetFlags } = useFlagsStore();

  return (
    <div style={{ padding: 12, border: '1px solid #333', borderRadius: 6, background: '#12121a', color: '#f0f0f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#f97316' }}>Feature Flags</h3>
        <button onClick={resetFlags} style={{ fontSize: 11, padding: '2px 8px', cursor: 'pointer', background: '#1a1a25', color: '#a0a0b0', border: '1px solid #333', borderRadius: 4 }}>Reset</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ALL_FLAGS.map(flag => (
          <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={flags[flag]}
              onChange={() => toggleFlag(flag)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <div>
              <span style={{ color: flags[flag] ? '#06b6d4' : '#666', fontWeight: 500 }}>{flag}</span>
              <span style={{ color: '#666', fontSize: 11, marginLeft: 8 }}>{FLAG_DESCRIPTIONS[flag]}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
