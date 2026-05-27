import { useEffect, useState } from 'react'
import { useEditorStore } from './stores'
import { useDreamStore, dreamMemory, useAutoCompact } from './utils/dreamMemory'
import { useFlagsStore } from './utils/featureFlags'
import { DreamMemoryStatus } from './components/DreamMemoryStatus'
import { FeatureFlagsPanel } from './components/FeatureFlagsPanel'
import { L0_META_RULES } from './utils/layeredMemory'
import { DreamDashboard } from './components/DreamDashboard'
import { SyncStatusPanel } from './components/SyncStatusPanel'
import { AgentCanvas } from './canvas'
import type { CanvasMode } from './canvas'

export default function App() {
  const { messages, input, addMessage, setInput, clearMessages } = useEditorStore()
  const { updateStats } = useDreamStore()
  const { flags } = useFlagsStore()
  const { checkAndCompact } = useAutoCompact()
  const [showDashboard, setShowDashboard] = useState(false)
  const [showSyncStatus, setShowSyncStatus] = useState(false)
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('edit')

  const handleSyncClick = () => {
    alert('Sync triggered! Implement sync logic with GistBackup.')
  }

  const handleConflictClick = () => {
    alert('Conflict resolution UI - to be implemented.')
  }

  useEffect(() => {
    dreamMemory.setPhaseHandler((p) => useDreamStore.getState().setPhase(p))
  }, [])

  useEffect(() => {
    updateStats()
  }, [updateStats])

  useEffect(() => {
    if (flags.AUTO_COMPACT) {
      checkAndCompact()
    }
  }, [flags.AUTO_COMPACT, checkAndCompact])

  const handleSend = () => {
    if (!input.trim()) return
    addMessage('user', input)
    if (flags.DREAM_MEMORY) {
      dreamMemory.wake({ id: Date.now().toString(36), role: 'user', content: input, timestamp: Date.now() })
    }
    const response = `收到了: ${input}`
    addMessage('assistant', response)
    if (flags.DREAM_MEMORY) {
      dreamMemory.wake({ id: Date.now().toString(36), role: 'assistant', content: response, timestamp: Date.now() })
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #f97316, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          doc-editor V1 — Dream Memory
        </h1>
        <p style={{ color: '#a0a0b0', fontSize: 13, marginTop: 4 }}>
          跨会话Dream记忆 + 上下文压缩 | 借鉴 nanobot + claude-code + generic-agent
        </p>
      </div>
      {flags.DREAM_MEMORY && <DreamMemoryStatus />}
      <div style={{ marginTop: 16 }}>
        <FeatureFlagsPanel />
      </div>
      {flags.LAYERED_MEMORY && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #333', borderRadius: 6, background: '#12121a' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#f97316' }}>L0 Meta Rules（编辑器约束）</h4>
          <div style={{ fontSize: 12, color: '#a0a0b0' }}>
            {L0_META_RULES.map((rule, i) => (
              <div key={i} style={{ padding: '2px 0' }}>• {rule}</div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => setShowDashboard(!showDashboard)} style={{ padding: '6px 12px', background: '#1a1a2e', color: '#06b6d4', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Dashboard</button>
        <button onClick={() => setShowSyncStatus(!showSyncStatus)} style={{ padding: '6px 12px', background: '#1a1a2e', color: '#22c55e', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Sync Status</button>
        <button onClick={() => setCanvasMode(canvasMode === 'edit' ? 'canvas' : 'edit')} style={{ padding: '6px 12px', background: '#1a1a2e', color: '#f97316', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{canvasMode === 'edit' ? 'Switch to Canvas' : 'Switch to Edit'}</button>
      </div>
      {showDashboard && <DreamDashboard />}
      {showSyncStatus && (
        <div style={{ marginTop: 16 }}>
          <SyncStatusPanel onSyncClick={handleSyncClick} onConflictClick={handleConflictClick} />
        </div>
      )}
      <div style={{ marginTop: 20, padding: 16, border: '1px solid #222', borderRadius: 8, background: '#12121a', minHeight: 300 }}>
        {messages.length === 0 && (
          <div style={{ color: '#666', textAlign: 'center', paddingTop: 100 }}>
            还没有消息，开始输入吧...
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: msg.role === 'user' ? '#1a1a2e' : '#0a1a1a', border: msg.role === 'user' ? '1px solid #333' : '1px solid #222' }}>
            <div style={{ fontSize: 12, color: msg.role === 'user' ? '#06b6d4' : '#f97316', marginBottom: 4 }}>
              {msg.role === 'user' ? 'User' : 'Assistant'} • {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
            <div style={{ fontSize: 14 }}>{msg.content}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="输入消息..." style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #333', background: '#1a1a2e', color: '#f0f0f5', fontSize: 14, resize: 'vertical', minHeight: 80 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleSend} style={{ padding: '12px 24px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>发送</button>
          <button onClick={clearMessages} style={{ padding: '12px 24px', background: 'transparent', color: '#a0a0b0', border: '1px solid #333', borderRadius: 8, cursor: 'pointer' }}>清空</button>
        </div>
      </div>
      <AgentCanvas mode={canvasMode} onModeSwitch={setCanvasMode} />
    </div>
  )
}