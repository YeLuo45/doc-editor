import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useDreamStore } from './stores/dreamStore'
import { getRecentValidSessions } from './memory/layers/L4Sessions'
import { CrossSessionRecovery } from './components/CrossSessionRecovery'
import { useState, useEffect } from 'react'

function Root() {
  const [showRecovery, setShowRecovery] = useState(false)
  const { updateStats, refreshLayers } = useDreamStore()

  useEffect(() => {
    updateStats()
    refreshLayers()
    const recent = getRecentValidSessions()
    if (recent.length > 0) {
      setShowRecovery(true)
    }
  }, [])

  const handleRestore = (_session: any) => {
    setShowRecovery(false)
    updateStats()
  }

  const handleNew = () => {
    setShowRecovery(false)
    updateStats()
  }

  return (
    <StrictMode>
      {showRecovery && <CrossSessionRecovery onRestore={handleRestore} onNewSession={handleNew} />}
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)