import { useState } from 'react';
import { useDreamStore } from '../stores/dreamStore';
import type { L4Session } from '../memory/types';

interface Props {
  onRestore: (session: L4Session) => void;
  onNewSession: () => void;
}

export function CrossSessionRecovery({ onRestore, onNewSession }: Props) {
  const { recentValidSessions } = useDreamStore();
  const [selectedSession, setSelectedSession] = useState<L4Session | null>(null);

  if (recentValidSessions.length === 0) return null;

  const formatDate = (ts: number) => {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#1a1a2e', border: '1px solid #333', borderRadius: 12,
        padding: 24, maxWidth: 480, width: '90%', color: '#f0f0f5',
      }}>
        <h3 style={{ marginTop: 0 }}>📚 恢复上次会话</h3>
        <p style={{ color: '#a0a0b0', fontSize: 13 }}>
          检测到 {recentValidSessions.length} 个未过期的编辑会话
        </p>
        <div style={{ maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
          {recentValidSessions.slice(0, 5).map(session => (
            <div
              key={session.id}
              onClick={() => setSelectedSession(session)}
              style={{
                padding: 12, border: '1px solid ' + (selectedSession?.id === session.id ? '#06b6d4' : '#333'),
                borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                background: selectedSession?.id === session.id ? 'rgba(6,182,212,0.1)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 600 }}>{session.contextSummary.slice(0, 60)}...</div>
              <div style={{ fontSize: 11, color: '#a0a0b0', marginTop: 4 }}>
                {session.messageCount}条消息 · {formatDate(session.endedAt)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => selectedSession && onRestore(selectedSession)}
            disabled={!selectedSession}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: selectedSession ? '#06b6d4' : '#333', color: '#fff',
              border: 'none', cursor: selectedSession ? 'pointer' : 'not-allowed',
              fontWeight: 600,
            }}
          >恢复会话</button>
          <button
            onClick={onNewSession}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: 'transparent', color: '#a0a0b0',
              border: '1px solid #333', cursor: 'pointer',
            }}
          >新建会话</button>
        </div>
      </div>
    </div>
  );
}