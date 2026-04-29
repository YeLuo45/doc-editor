import { openDB, IDBPDatabase } from 'idb';
import { Doc, HistoryEntry } from './types';

const DB_NAME = 'doc-editor';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('docs')) {
        db.createObjectStore('docs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('history')) {
        const histStore = db.createObjectStore('history', { keyPath: 'id' });
        histStore.createIndex('by-doc', 'docId');
      }
    },
  });
  return dbInstance;
}

export async function getAllDocs(): Promise<Doc[]> {
  const db = await getDB();
  const docs = await db.getAll('docs');
  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDoc(id: string): Promise<Doc | undefined> {
  const db = await getDB();
  return db.get('docs', id);
}

export async function saveDoc(doc: Doc): Promise<void> {
  const db = await getDB();
  await db.put('docs', doc);
}

export async function deleteDoc(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('docs', id);
  const tx = db.transaction('history', 'readwrite');
  const index = tx.store.index('by-doc');
  const keys = await index.getAllKeys(id);
  for (const key of keys) {
    await tx.store.delete(key);
  }
  await tx.done;
}

export async function getHistory(docId: string): Promise<HistoryEntry[]> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('history', 'by-doc', docId);
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export async function addHistory(entry: HistoryEntry): Promise<void> {
  const db = await getDB();
  await db.put('history', entry);
}

export async function clearOldHistory(docId: string, keepCount = 20): Promise<void> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('history', 'by-doc', docId);
  entries.sort((a, b) => b.timestamp - a.timestamp);
  const toDelete = entries.slice(keepCount);
  const tx = db.transaction('history', 'readwrite');
  for (const entry of toDelete) {
    await tx.store.delete(entry.id);
  }
  await tx.done;
}
