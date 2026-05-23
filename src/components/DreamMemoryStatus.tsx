import { useEffect } from 'react';
import { useDreamStore } from '../utils/dreamMemory';

export function DreamMemoryStatus() {
  const { phase, messageCount, tokenCount, dreamCount, updateStats } = useDreamStore();

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [updateStats]);

  return (
    <div style={{ padding: '8px 12px', border: '1px solid #333', borderRadius: 6, background: '#0a0a0f', color: '#f0f0f5', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{phase === 'dream' ? '💤' : '☀️'}</span>
          <span style={{ fontWeight: 600, color: phase === 'dream' ? '#f97316' : '#06b6d4' }}>
            {phase === 'dream' ? '正在记忆(Dream)' : '活跃(Wake)'}
          </span>
        </div>
        <div style={{ color: '#a0a0b0', fontSize: 12 }}>
          消息: {messageCount} | Token: ~{tokenCount} | Dream次数: {dreamCount}
        </div>
      </div>
    </div>
  );
}
