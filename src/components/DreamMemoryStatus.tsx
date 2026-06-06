import { useEffect } from 'react';
import { useDreamStore } from '../utils/dreamMemory';

export function DreamMemoryStatus() {
  const { phase, messageCount, tokenCount, dreamCount, updateStats } =
    useDreamStore();

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);

  const isDream = phase === 'dream';

  return (
    <div
      className="card"
      style={{
        marginTop: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
      }}
    >
      <span className={'pill ' + (isDream ? 'pill--orange' : 'pill--cyan')}>
        <span className="pill__dot" />
        {isDream ? 'Dream' : 'Wake'}
      </span>
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-4)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family-mono)',
        }}
      >
        <Stat label="messages" value={String(messageCount)} />
        <Stat label="tokens ~" value={String(tokenCount)} />
        <Stat label="dreams" value={String(dreamCount)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <span
        style={{
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--weight-semibold)',
        }}
      >
        {value}
      </span>
    </span>
  );
}
