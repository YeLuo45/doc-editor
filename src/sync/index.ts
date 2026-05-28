/**
 * V25 Offline-first Sync Engine
 * Export all sync modules
 */

export { SyncEngine, type SyncState, type SyncChange, type SyncResult, type SyncConflict, type SyncEngineEvents } from './SyncEngine';
export { ConflictResolver, type ConflictStrategy, type ConflictRecord, type MergeResult } from './ConflictResolver';
export { OfflineQueue, type QueueItem, type QueueConfig, type FlushResult } from './OfflineQueue';
export { SyncStorage, type StorageEntry, type StorageMetrics } from './SyncStorage';
export { SyncMetrics, type MetricPoint, type SyncMetricsData, type MetricsConfig } from './SyncMetrics';
export { SyncProtocol, type SyncPacket, type SyncPacketHeader, type ValidationResult, type ProtocolConfig } from './SyncProtocol';

export const SYNC_VERSION = 25;
export const SYNC_PROTOCOL_VERSION = 25;

export default {
  version: SYNC_VERSION,
  protocolVersion: SYNC_PROTOCOL_VERSION,
};