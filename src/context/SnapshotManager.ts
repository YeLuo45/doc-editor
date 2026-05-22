// SnapshotManager - Document snapshot management for versioning and rollback

import { DocumentContext, DocumentContextData } from './DocumentContext';
import { storageAdapter } from './storage/LocalStorageAdapter';

export interface SnapshotInfo {
  id: string;
  timestamp: number;
  summary: string;
}

export interface SnapshotData extends SnapshotInfo {
  document: DocumentContextData;
}

const SNAPSHOT_PREFIX = 'snapshot:';
const SNAPSHOT_LIST_KEY = 'snapshot:list';

export class SnapshotManager {
  private docId: string;

  constructor(docId: string) {
    this.docId = docId;
  }

  saveSnapshot(doc: DocumentContext): string {
    const snapshotId = `${this.docId}:${Date.now()}`;
    const summary = this.generateSummary(doc);
    
    const snapshot: SnapshotData = {
      id: snapshotId,
      timestamp: Date.now(),
      summary,
      document: doc.toJSON(),
    };

    // Save snapshot data
    storageAdapter.set(`${SNAPSHOT_PREFIX}${snapshotId}`, snapshot);

    // Update snapshot list
    const list = this.getSnapshotList();
    list.unshift({ id: snapshotId, timestamp: snapshot.timestamp, summary });
    storageAdapter.set(SNAPSHOT_LIST_KEY, list);

    return snapshotId;
  }

  getSnapshot(id: string): DocumentContext | null {
    const data = storageAdapter.get(`${SNAPSHOT_PREFIX}${id}`) as SnapshotData | null;
    if (data && data.document) {
      return DocumentContext.fromJSON(this.docId, data.document);
    }
    return null;
  }

  listSnapshots(): SnapshotInfo[] {
    return this.getSnapshotList().filter(s => s.id.startsWith(this.docId));
  }

  private getSnapshotList(): SnapshotInfo[] {
    return storageAdapter.get(SNAPSHOT_LIST_KEY) as SnapshotInfo[] || [];
  }

  private generateSummary(doc: DocumentContext): string {
    const { title, updatedAt } = doc.metadata;
    const date = new Date(updatedAt).toLocaleString();
    return `${title} - ${date}`;
  }

  deleteSnapshot(id: string): void {
    storageAdapter.remove(`${SNAPSHOT_PREFIX}${id}`);
    const list = this.getSnapshotList().filter(s => s.id !== id);
    storageAdapter.set(SNAPSHOT_LIST_KEY, list);
  }

  clearAllSnapshots(): void {
    const list = this.listSnapshots();
    list.forEach(s => storageAdapter.remove(`${SNAPSHOT_PREFIX}${s.id}`));
    const allList = this.getSnapshotList().filter(s => !s.id.startsWith(this.docId));
    storageAdapter.set(SNAPSHOT_LIST_KEY, allList);
  }
}
