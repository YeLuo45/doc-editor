/**
 * OfflineSyncStore - Zustand-based queue sync store
 * Manages offline document editing with queue-based synchronization
 */

import { create } from 'zustand';

export interface QueuedOperation {
  id: string;
  documentKey: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

export interface SyncQueueState {
  queue: QueuedOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  failedCount: number;
}

export interface OfflineSyncStore extends SyncQueueState {
  enqueue: (docKey: string, operation: 'create' | 'update' | 'delete', payload: string) => string;
  dequeue: (operationId: string) => void;
  markInProgress: (operationId: string) => void;
  markCompleted: (operationId: string) => void;
  markFailed: (operationId: string, error: string) => void;
  retry: (operationId: string) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  flushCompleted: () => void;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  getPendingOperations: () => QueuedOperation[];
  getFailedOperations: () => QueuedOperation[];
  getOperationsForDocument: (docKey: string) => QueuedOperation[];
  optimisticUpdate: (docKey: string, content: string) => void;
  rollbackOptimisticUpdate: (docKey: string) => void;
}

const MAX_RETRY_COUNT = 3;

function generateOperationId(): string {
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const createOfflineSyncStore = () => {
  return create<OfflineSyncStore>((set, get) => ({
    queue: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    failedCount: 0,

    enqueue: (docKey, operation, payload) => {
      const id = generateOperationId();
      const queuedOp: QueuedOperation = {
        id, documentKey: docKey, operation, payload,
        timestamp: Date.now(), retryCount: 0, status: 'pending'
      };

      set((state) => ({
        queue: [...state.queue, queuedOp],
        pendingCount: state.pendingCount + 1
      }));

      return id;
    },

    dequeue: (operationId) => {
      set((state) => ({ queue: state.queue.filter((op) => op.id !== operationId) }));
    },

    markInProgress: (operationId) => {
      set((state) => ({
        queue: state.queue.map((op) =>
          op.id === operationId ? { ...op, status: 'in-progress' as const } : op
        )
      }));
    },

    markCompleted: (operationId) => {
      set((state) => {
        const op = state.queue.find((o) => o.id === operationId);
        const newPendingCount = op?.status === 'pending' ? Math.max(0, state.pendingCount - 1) : state.pendingCount;
        return {
          queue: state.queue.map((o) =>
            o.id === operationId ? { ...o, status: 'completed' as const } : o
          ),
          pendingCount: newPendingCount
        };
      });
    },

    markFailed: (operationId, error) => {
      set((state) => ({
        queue: state.queue.map((op) =>
          op.id === operationId
            ? { ...op, status: 'failed' as const, error, retryCount: op.retryCount + 1 }
            : op
        ),
        failedCount: state.failedCount + 1,
        pendingCount: Math.max(0, state.pendingCount - 1)
      }));
    },

    retry: (operationId) => {
      set((state) => ({
        queue: state.queue.map((op) =>
          op.id === operationId ? { ...op, status: 'pending' as const, error: undefined } : op
        ),
        failedCount: Math.max(0, state.failedCount - 1),
        pendingCount: state.pendingCount + 1
      }));
    },

    clearQueue: () => {
      set({ queue: [], pendingCount: 0, failedCount: 0 });
    },

    processQueue: async () => {
      const state = get();
      if (!state.isOnline || state.isSyncing) return;

      const pendingOps = state.queue.filter(
        (op) => op.status === 'pending' && op.retryCount < MAX_RETRY_COUNT
      );

      if (pendingOps.length === 0) return;

      set({ isSyncing: true });

      for (const op of pendingOps) {
        try {
          get().markInProgress(op.id);
          await new Promise((resolve) => setTimeout(resolve, 100));
          get().markCompleted(op.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          get().markFailed(op.id, errorMessage);
        }
      }

      set({ isSyncing: false, lastSyncTime: Date.now() });
    },

    flushCompleted: () => {
      set((state) => ({ queue: state.queue.filter((op) => op.status !== 'completed') }));
    },

    setOnline: (online) => set({ isOnline: online }),
    setSyncing: (syncing) => set({ isSyncing: syncing }),
    setLastSyncTime: (time) => set({ lastSyncTime: time }),

    getPendingOperations: () => get().queue.filter((op) => op.status === 'pending'),
    getFailedOperations: () => get().queue.filter((op) => op.status === 'failed'),
    getOperationsForDocument: (docKey) => get().queue.filter((op) => op.documentKey === docKey),

    optimisticUpdate: (docKey, content) => {
      const key = `doc-editor-optimistic-${docKey}`;
      localStorage.setItem(key, JSON.stringify({ content, timestamp: Date.now() }));
    },

    rollbackOptimisticUpdate: (docKey) => {
      const key = `doc-editor-optimistic-${docKey}`;
      localStorage.removeItem(key);
    }
  }));
};

export const offlineSyncStore = createOfflineSyncStore();

export function initOnlineListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => offlineSyncStore.getState().setOnline(true);
  const handleOffline = () => offlineSyncStore.getState().setOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  offlineSyncStore.getState().setOnline(navigator.onLine);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function getSyncStatus(): {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: number | null;
} {
  const state = offlineSyncStore.getState();
  return {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    failedCount: state.failedCount,
    lastSyncTime: state.lastSyncTime
  };
}
