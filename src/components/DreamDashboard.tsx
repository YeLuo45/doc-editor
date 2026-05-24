import { useEffect } from 'react';
import { useDreamStore } from '../stores/dreamStore';
import { getL3Skills } from '../memory/layers/L3Skills';
import { getCompactionStats } from '../memory/CompactionEngine';

export function DreamDashboard() {
  const { phase, messageCount, tokenCount, dreamCount, archives, archivesCount, updateStats, refreshLayers, compactionStats } = useDreamStore();

  useEffect(() => {
    updateStats();
    refreshLayers();
    const interval = setInterval(() => { updateStats(); refreshLayers(); }, 5000);
    return () => clearInterval(interval);
  }, [updateStats, refreshLayers]);

  const skills = getL3Skills();

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto', color: '#f0f0f5' }}>
      <h2 style={{ marginTop: 0 }}>🧠 Dream Memory Dashboard</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: phase === 'dream' ? '#f97316' : '#06b6d4' }}>
            {phase === 'dream' ? '💤' : '☀️'} {phase === 'dream' ? 'Dream' : 'Wake'}
          </div>
          <div style={{ fontSize: 12, color: '#a0a0b0' }}>当前阶段</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{messageCount}</div>
          <div style={{ fontSize: 12, color: '#a0a0b0' }}>当前消息</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>~{tokenCount}</div>
          <div style={{ fontSize: 12, color: '#a0a0b0' }}>Token估算</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{dreamCount}</div>
          <div style={{ fontSize: 12, color: '#a0a0b0' }}>Dream压缩次数</div>
        </div>
        <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{archivesCount}</div>
          <div style={{ fontSize: 12, color: '#a0a0b0' }}>压缩存档数</div>
        </div>
      </div>

      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>📦 压缩存档</h3>
        {archives.length === 0 ? (
          <div style={{ color: '#666' }}>暂无存档</div>
        ) : (
          archives.map((archive) => (
            <div key={archive.id} style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
              <div style={{ fontSize: 13 }}>{archive.summary}</div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {archive.messageCount}条消息 · {new Date(archive.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>📊 压缩统计</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div><div style={{ fontSize: 16, fontWeight: 600 }}>{compactionStats.totalArchivedSessions}</div><div style={{ fontSize: 11, color: '#666' }}>归档会话</div></div>
          <div><div style={{ fontSize: 16, fontWeight: 600 }}>{compactionStats.totalArchivedMessages}</div><div style={{ fontSize: 11, color: '#666' }}>归档消息</div></div>
          <div><div style={{ fontSize: 16, fontWeight: 600 }}>{skills.length}</div><div style={{ fontSize: 11, color: '#666' }}>Skills</div></div>
        </div>
      </div>

      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>🛠️ L3 Skills ({skills.length})</h3>
        {skills.length === 0 ? (
          <div style={{ color: '#666' }}>暂无 Skills</div>
        ) : (
          skills.slice(0, 10).map(skill => (
            <div key={skill.id} style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{skill.name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{skill.description} · 使用{skill.usageCount}次</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}