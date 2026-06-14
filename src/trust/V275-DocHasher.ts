/**
 * V275 DocHasher - Direction E Trust Verification (Iter 1/30)
 * thunderbolt: Hash/checksum document content for integrity
 */
export type HashAlgorithm = 'sha1' | 'sha256' | 'md5' | 'crc32';

export interface HashRecord {
  docId: string;
  algorithm: HashAlgorithm;
  hash: string;
  size: number;
  timestamp: number;
  version: number;
}

export interface HasherState {
  records: Map<string, HashRecord>;        // docId -> latest
  history: Map<string, HashRecord[]>;     // docId -> history
  nextId: number;
  totalHashes: number;
}

export function createHasherState(): HasherState {
  return { records: new Map(), history: new Map(), nextId: 1, totalHashes: 0 };
}

export async function hashContent(state: HasherState, docId: string, content: string | Uint8Array, algorithm: HashAlgorithm = 'sha256'): Promise<HasherState> {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  const hash = await computeHash(bytes, algorithm);
  const record: HashRecord = { docId, algorithm, hash, size: bytes.length, timestamp: Date.now(), version: (state.records.get(docId)?.version || 0) + 1 };
  const records = new Map(state.records);
  records.set(docId, record);
  const history = new Map(state.history);
  const existing = history.get(docId) || [];
  history.set(docId, [...existing, record].slice(-50));
  return { ...state, records, history, nextId: state.nextId + 1, totalHashes: state.totalHashes + 1 };
}

async function computeHash(bytes: Uint8Array, algorithm: HashAlgorithm): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && algorithm !== 'md5' && algorithm !== 'crc32') {
    try {
      const algo = algorithm === 'sha1' ? 'SHA-1' : 'SHA-256';
      const buffer = await crypto.subtle.digest(algo, bytes);
      return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return fallbackHash(bytes, algorithm);
    }
  }
  return fallbackHash(bytes, algorithm);
}

function fallbackHash(bytes: Uint8Array, algorithm: HashAlgorithm): string {
  if (algorithm === 'crc32') {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    return ((crc ^ 0xffffffff) >>> 0).toString(16);
  }
  // Simple FNV-1a 64-bit for sha1/sha256/md5 fallback
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= BigInt(bytes[i]);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

export function getRecord(state: HasherState, docId: string): HashRecord | undefined {
  return state.records.get(docId);
}

export function getHistoryForDoc(state: HasherState, docId: string): HashRecord[] {
  return state.history.get(docId) || [];
}

export function getHashForDoc(state: HasherState, docId: string): string | undefined {
  return state.records.get(docId)?.hash;
}

export function clearHasherState(state: HasherState): HasherState {
  return createHasherState();
}

export function getHasherReport(state: HasherState): { totalHashes: number; docsTracked: number; byAlgorithm: Record<string, number> } {
  const byAlgorithm: Record<string, number> = {};
  for (const r of state.records.values()) byAlgorithm[r.algorithm] = (byAlgorithm[r.algorithm] || 0) + 1;
  return { totalHashes: state.totalHashes, docsTracked: state.records.size, byAlgorithm };
}
