/**
 * SyncStorage - localStorage 草稿管理
 * 保存文档版本快照，支持离线编辑和冲突检测
 */

import type { DocumentSnapshot } from './DeltaEngine';

const STORAGE_PREFIX = 'doc-editor-sync-';

export interface StoredDocument {
  key: string;
  snapshot: DocumentSnapshot;
  isDirty: boolean;
  lastSynced: number | null;
}

export interface SyncMetadata {
  lastSyncTime: number;
  pendingDeltas: number;
  conflictCount: number;
  serverVersion: string | null;
}

export interface StorageStats {
  totalDocuments: number;
  totalSize: number;
  dirtyCount: number;
  pendingCount: number;
}

/**
 * 保存文档快照到 localStorage
 */
export function saveDocument(key: string, snapshot: DocumentSnapshot, isDirty = true): void {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const stored: StoredDocument = {
    key,
    snapshot,
    isDirty,
    lastSynced: isDirty ? null : Date.now()
  };
  localStorage.setItem(storageKey, JSON.stringify(stored));
}

/**
 * 从 localStorage 加载文档
 */
export function loadDocument(key: string): StoredDocument | null {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  
  try {
    return JSON.parse(raw) as StoredDocument;
  } catch {
    return null;
  }
}

/**
 * 标记文档为已同步（clean）
 */
export function markSynced(key: string): void {
  const stored = loadDocument(key);
  if (stored) {
    stored.isDirty = false;
    stored.lastSynced = Date.now();
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(stored));
  }
}

/**
 * 标记文档为已修改（dirty）
 */
export function markDirty(key: string): void {
  const stored = loadDocument(key);
  if (stored) {
    stored.isDirty = true;
    stored.lastSynced = null;
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(stored));
  }
}

/**
 * 清除单个文档
 */
export function clearDocument(key: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
}

/**
 * 清除所有同步相关的 localStorage
 */
export function clearAll(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * 获取所有已存储的文档键
 */
export function getAllKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return keys;
}

/**
 * 获取所有脏文档（未同步的）
 */
export function getDirtyDocuments(): StoredDocument[] {
  const keys = getAllKeys();
  return keys
    .map(key => loadDocument(key))
    .filter((doc): doc is StoredDocument => doc !== null && doc.isDirty);
}

/**
 * 获取所有待处理的文档
 */
export function getPendingDocuments(): StoredDocument[] {
  const keys = getAllKeys();
  return keys
    .map(key => loadDocument(key))
    .filter((doc): doc is StoredDocument => doc !== null && doc.lastSynced === null);
}

/**
 * 获取同步元数据
 */
export function getSyncMetadata(): SyncMetadata {
  const docs = getAllKeys().map(key => loadDocument(key)).filter((d): d is StoredDocument => d !== null);
  const pending = docs.filter(d => d.lastSynced === null);
  const dirtyCount = docs.filter(d => d.isDirty).length;
  
  // 从最后一个同步的文档获取serverVersion
  const lastSynced = docs
    .filter(d => d.lastSynced !== null)
    .sort((a, b) => (b.lastSynced || 0) - (a.lastSynced || 0))[0];
  
  return {
    lastSyncTime: lastSynced?.lastSynced || 0,
    pendingDeltas: pending.length,
    conflictCount: dirtyCount,
    serverVersion: null
  };
}

/**
 * 获取存储统计信息
 */
export function getStorageStats(): StorageStats {
  const keys = getAllKeys();
  let totalSize = 0;
  
  const docs = keys.map(key => loadDocument(key)).filter((d): d is StoredDocument => d !== null);
  
  for (const key of keys) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw) {
      totalSize += raw.length;
    }
  }
  
  return {
    totalDocuments: docs.length,
    totalSize,
    dirtyCount: docs.filter(d => d.isDirty).length,
    pendingCount: docs.filter(d => d.lastSynced === null).length
  };
}

/**
 * 检查存储是否已满
 */
export function isStorageFull(maxSizeKB = 5120): boolean {
  const stats = getStorageStats();
  return stats.totalSize >= maxSizeKB * 1024;
}

/**
 * 清理旧文档（保留最近的N个）
 */
export function pruneOldDocuments(keepCount = 10): void {
  const keys = getAllKeys();
  const docs = keys
    .map(key => ({ key, doc: loadDocument(key) }))
    .filter((item): item is { key: string; doc: StoredDocument } => item.doc !== null)
    .sort((a, b) => (b.doc.snapshot.timestamp) - (a.doc.snapshot.timestamp));
  
  // keep recent documents
  const toRemove = docs.slice(keepCount);
  
  for (const item of toRemove) {
    clearDocument(item.key);
  }
}

/**
 * 保存同步元数据
 */
export function saveSyncMetadata(metadata: SyncMetadata): void {
  localStorage.setItem(`${STORAGE_PREFIX}metadata`, JSON.stringify(metadata));
}

/**
 * 加载同步元数据
 */
export function loadSyncMetadata(): SyncMetadata | null {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}metadata`);
  if (!raw) return null;
  
  try {
    return JSON.parse(raw) as SyncMetadata;
  } catch {
    return null;
  }
}

/**
 * 版本比较 - 检查是否需要更新
 */
export function compareVersions(local: string, remote: string): -1 | 0 | 1 {
  const localParts = local.split('.').map(Number);
  const remoteParts = remote.split('.').map(Number);
  
  for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
    const l = localParts[i] || 0;
    const r = remoteParts[i] || 0;
    if (l < r) return -1;
    if (l > r) return 1;
  }
  return 0;
}