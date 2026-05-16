import { openDB, IDBPDatabase } from 'idb';
import { Doc, HistoryEntry, Folder } from './types';

const DB_NAME = 'doc-editor';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('docs')) {
          db.createObjectStore('docs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          const histStore = db.createObjectStore('history', { keyPath: 'id' });
          histStore.createIndex('by-doc', 'docId');
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
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

export async function getDocsByFolder(folderId: string | null): Promise<Doc[]> {
  const db = await getDB();
  const all = await db.getAll('docs');
  return all
    .filter(d => d.folderId === folderId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocsByTag(tag: string): Promise<Doc[]> {
  const db = await getDB();
  const all = await db.getAll('docs');
  return all
    .filter(d => Array.isArray(d.tags) && d.tags.includes(tag))
    .sort((a, b) => b.updatedAt - a.updatedAt);
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

export async function getAllFolders(): Promise<Folder[]> {
  const db = await getDB();
  return db.getAll('folders');
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  await db.put('folders', folder);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB();
  // Move all docs in this folder to root
  const docs = await db.getAll('docs');
  const tx = db.transaction('docs', 'readwrite');
  for (const doc of docs) {
    if (doc.folderId === id) {
      tx.store.put({ ...doc, folderId: null });
    }
  }
  await tx.done;
  await db.delete('folders', id);
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

export async function moveDocToFolder(docId: string, folderId: string | null): Promise<void> {
  const db = await getDB();
  const doc = await db.get('docs', docId);
  if (doc) {
    doc.folderId = folderId;
    doc.updatedAt = Date.now();
    await db.put('docs', doc);
  }
}

export async function getAllTags(): Promise<string[]> {
  const db = await getDB();
  const docs = await db.getAll('docs');
  const tagSet = new Set<string>();
  for (const doc of docs) {
    if (Array.isArray(doc.tags)) {
      for (const tag of doc.tags) {
        tagSet.add(tag);
      }
    }
  }
  return Array.from(tagSet).sort();
}
