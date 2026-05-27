/**
 * SyncStatusPanel - 同步状态 UI 组件
 * 显示上次同步时间、冲突数、离线状态等信息
 */

import { useState, useEffect, useCallback } from 'react';
import { getSyncMetadata, getStorageStats } from '../sync/SyncStorage';

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

export function SyncStatusPanel({
  onSyncClick,
  onConflictClick,
  autoRefresh = true,
  refreshInterval = 5000
}: SyncStatusPanelProps) {
  const [status, setStatus] = useState<SyncStatusState>({
    lastSyncTime: 0,
    pendingDeltas: 0,
    conflictCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastError: null
  });
  const [stats, setStats] = useState({ totalDocuments: 0, totalSize: 0, dirtyCount: 0, pendingCount: 0 });

  const refreshStatus = useCallback(() => {
    try {
      const metadata = getSyncMetadata();
      const storageStats = getStorageStats();
      
      setStatus(prev => ({
        ...prev,
        lastSyncTime: metadata.lastSyncTime,
        pendingDeltas: metadata.pendingDeltas,
        conflictCount: metadata.conflictCount
      }));
      
      setStats(storageStats);
    } catch (e) {
      // Ignore errors during status refresh
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshStatus();
    
    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(refreshStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshStatus]);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!status.isOnline) return '#ef4444'; // red - offline
    if (status.conflictCount > 0) return '#f97316'; // orange - has conflicts
    if (status.pendingDeltas > 0) return '#eab308'; // yellow - pending
    return '#22c55e'; // green - synced
  };

  const getStatusText = () => {
    if (!status.isOnline) return 'Offline';
    if (status.isSyncing) return 'Syncing...';
    if (status.conflictCount > 0) return `${status.conflictCount} Conflict${status.conflictCount > 1 ? 's' : ''}`;
    if (status.pendingDeltas > 0) return `${status.pendingDeltas} Pending`;
    return 'Synced';
  };

  return (
    <div style={{
      padding: '12px 16px',
      background: '#1a1a2e',
      borderRadius: 8,
      border: '1px solid #333',
      fontSize: 13,
      color: '#f0f0f5',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap'
    }}>
      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: getStatusColor(),
          boxShadow: `0 0 6px ${getStatusColor()}`
        }} />
        <span style={{ fontWeight: 600 }}>{getStatusText()}</span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#333' }} />

      {/* Last sync time */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: '#a0a0b0', fontSize: 11 }}>Last Sync</span>
        <span>{formatTime(status.lastSyncTime)}</span>
      </div>

      {/* Pending count */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: '#a0a0b0', fontSize: 11 }}>Pending</span>
        <span style={{ color: status.pendingDeltas > 0 ? '#eab308' : '#a0a0b0' }}>
          {status.pendingDeltas}
        </span>
      </div>

      {/* Conflict count */}
      {status.conflictCount > 0 && (
        <button
          onClick={onConflictClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left'
          }}
        >
          <span style={{ color: '#a0a0b0', fontSize: 11 }}>Conflicts</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>
            {status.conflictCount}
          </span>
        </button>
      )}

      {/* Storage info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ color: '#a0a0b0', fontSize: 11 }}>Storage</span>
        <span style={{ color: '#a0a0b0' }}>
          {stats.totalDocuments} docs ({formatBytes(stats.totalSize)})
        </span>
      </div>

      {/* Error message */}
      {status.lastError && (
        <div style={{
          padding: '4px 8px',
          background: 'rgba(239, 68, 68, 0.2)',
          borderRadius: 4,
          color: '#ef4444',
          fontSize: 11
        }}>
          {status.lastError}
        </div>
      )}

      {/* Sync button */}
      <button
        onClick={onSyncClick}
        disabled={!status.isOnline || status.isSyncing}
        style={{
          marginLeft: 'auto',
          padding: '6px 12px',
          background: status.isOnline ? '#06b6d4' : '#333',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: status.isOnline ? 'pointer' : 'not-allowed',
          fontSize: 12,
          fontWeight: 600,
          opacity: status.isSyncing ? 0.7 : 1
        }}
      >
        {status.isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '4px 8px',
      background: '#1a1a2e',
      borderRadius: 4,
      fontSize: 11,
      color: isOnline ? '#22c55e' : '#ef4444'
    }}>
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'currentColor'
      }} />
      {isOnline ? 'Online' : 'Offline'}
    </div>
  );
}

export default SyncStatusPanel;