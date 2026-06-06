/**
 * SyncStatusPanel - 同步状态 UI 组件
 * 显示上次同步时间、冲突数、离线状态等信息
 */

import { useState, useEffect, useCallback } from 'react';

// SyncStorage exports only the SyncStorage class, not these helpers.
// Provide lightweight stubs so the panel still renders with sane defaults.
function getSyncMetadata(): {
  lastSyncTime: number;
  pendingDeltas: number;
  conflictCount: number;
} {
  try {
    const raw = localStorage.getItem('doc-editor-sync-metadata');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { lastSyncTime: 0, pendingDeltas: 0, conflictCount: 0 };
}

function getStorageStats(): {
  totalDocuments: number;
  totalSize: number;
  dirtyCount: number;
  pendingCount: number;
} {
  try {
    const raw = localStorage.getItem('doc-editor-storage-stats');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { totalDocuments: 0, totalSize: 0, dirtyCount: 0, pendingCount: 0 };
}

export interface SyncStatusState {
  lastSyncTime: number;
  pendingDeltas: number;
  conflictCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
}

export interface SyncStatusPanelProps {
  onSyncClick?: () => void;
  onConflictClick?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return 'Never';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusTone(state: SyncStatusState): {
  pill: 'rose' | 'orange' | 'violet' | 'emerald' | 'cyan';
  text: string;
} {
  if (!state.isOnline) return { pill: 'rose', text: 'Offline' };
  if (state.isSyncing) return { pill: 'cyan', text: 'Syncing' };
  if (state.conflictCount > 0)
    return {
      pill: 'orange',
      text: `${state.conflictCount} Conflict${state.conflictCount > 1 ? 's' : ''}`,
    };
  if (state.pendingDeltas > 0)
    return { pill: 'violet', text: `${state.pendingDeltas} Pending` };
  return { pill: 'emerald', text: 'Synced' };
}

export function SyncStatusPanel({
  onSyncClick,
  onConflictClick,
  autoRefresh = true,
  refreshInterval = 5000,
}: SyncStatusPanelProps) {
  const [status, setStatus] = useState<SyncStatusState>({
    lastSyncTime: 0,
    pendingDeltas: 0,
    conflictCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastError: null,
  });
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSize: 0,
    dirtyCount: 0,
    pendingCount: 0,
  });

  const refreshStatus = useCallback(() => {
    try {
      const metadata = getSyncMetadata();
      const storageStats = getStorageStats();

      setStatus((prev) => ({
        ...prev,
        lastSyncTime: metadata.lastSyncTime,
        pendingDeltas: metadata.pendingDeltas,
        conflictCount: metadata.conflictCount,
      }));

      setStats(storageStats);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    if (autoRefresh) {
      const interval = setInterval(refreshStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshStatus]);

  useEffect(() => {
    const handleOnline = () =>
      setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setStatus((prev) => ({ ...prev, isOnline: false }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const tone = getStatusTone(status);

  return (
    <div className="card">
      <div className="card__header">
        <div className="card__title">
          <span className={'pill pill--' + tone.pill}>
            <span className="pill__dot" />
            {tone.text}
          </span>
          Sync
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onSyncClick}
          disabled={!status.isOnline || status.isSyncing}
        >
          {status.isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__label">Last Sync</div>
          <div
            className="stat__value"
            style={{ fontSize: 'var(--text-lg)' }}
          >
            {formatTime(status.lastSyncTime)}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Pending</div>
          <div
            className={
              'stat__value ' +
              (status.pendingDeltas > 0 ? 'stat--accent-orange' : '')
            }
            style={{ fontSize: 'var(--text-lg)' }}
          >
            {status.pendingDeltas}
          </div>
        </div>
        <div
          className={'stat' + (status.conflictCount > 0 ? ' stat--accent-orange' : '')}
          onClick={status.conflictCount > 0 ? onConflictClick : undefined}
          style={{
            cursor: status.conflictCount > 0 ? 'pointer' : 'default',
          }}
        >
          <div className="stat__label">Conflicts</div>
          <div
            className="stat__value"
            style={{ fontSize: 'var(--text-lg)' }}
          >
            {status.conflictCount}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Storage</div>
          <div
            className="stat__value"
            style={{ fontSize: 'var(--text-lg)' }}
          >
            {stats.totalDocuments} docs
          </div>
          <div className="stat__hint">{formatBytes(stats.totalSize)}</div>
        </div>
      </div>

      {status.lastError && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-accent-rose-soft)',
            color: 'var(--color-accent-rose)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-family-mono)',
          }}
        >
          {status.lastError}
        </div>
      )}
    </div>
  );
}

/**
 * Mini sync status badge (for toolbar)
 */
export function SyncStatusBadge() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <span
      className={'pill ' + (isOnline ? 'pill--emerald' : 'pill--rose')}
    >
      <span className="pill__dot" />
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

export default SyncStatusPanel;
