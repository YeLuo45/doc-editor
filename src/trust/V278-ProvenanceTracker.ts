/**
 * V278 ProvenanceTracker - Direction E Trust Verification (Iter 4/30)
 * thunderbolt: Track document origin/lineage (who created/edited)
 */
export type ProvenanceAction = 'created' | 'edited' | 'imported' | 'merged' | 'split' | 'exported' | 'signed' | 'shared';

export interface ProvenanceEntry {
  id: number;
  docId: string;
  action: ProvenanceAction;
  actorId: string;
  sourceDocId?: string;
  targetDocId?: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ProvenanceState {
  entries: ProvenanceEntry[];
  nextId: number;
  totalEntries: number;
  byAction: Record<ProvenanceAction, number>;
}

export function createProvenanceState(): ProvenanceState {
  return {
    entries: [],
    nextId: 1,
    totalEntries: 0,
    byAction: { created: 0, edited: 0, imported: 0, merged: 0, split: 0, exported: 0, signed: 0, shared: 0 },
  };
}

export function recordProvenance(state: ProvenanceState, docId: string, action: ProvenanceAction, actorId: string, metadata: Record<string, any> = {}, sourceDocId?: string, targetDocId?: string): ProvenanceState {
  const entry: ProvenanceEntry = { id: state.nextId, docId, action, actorId, sourceDocId, targetDocId, timestamp: Date.now(), metadata };
  return {
    ...state,
    entries: [...state.entries, entry].slice(-2000),
    nextId: state.nextId + 1,
    totalEntries: state.totalEntries + 1,
    byAction: { ...state.byAction, [action]: state.byAction[action] + 1 },
  };
}

export function getProvenanceForDoc(state: ProvenanceState, docId: string): ProvenanceEntry[] {
  return state.entries.filter(e => e.docId === docId);
}

export function getProvenanceByAction(state: ProvenanceState, action: ProvenanceAction): ProvenanceEntry[] {
  return state.entries.filter(e => e.action === action);
}

export function getProvenanceByActor(state: ProvenanceState, actorId: string): ProvenanceEntry[] {
  return state.entries.filter(e => e.actorId === actorId);
}

export function getDocumentCreator(state: ProvenanceState, docId: string): ProvenanceEntry | undefined {
  return getProvenanceByAction(state, 'created').find(e => e.docId === docId);
}

export function getDocumentHistory(state: ProvenanceState, docId: string): ProvenanceEntry[] {
  return getProvenanceForDoc(state, docId).sort((a, b) => a.timestamp - b.timestamp);
}

export function clearProvenance(state: ProvenanceState): ProvenanceState {
  return createProvenanceState();
}

export function getProvenanceReport(state: ProvenanceState): { totalEntries: number; byAction: Record<string, number>; byDoc: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  for (const e of state.entries) byDoc[e.docId] = (byDoc[e.docId] || 0) + 1;
  return { totalEntries: state.totalEntries, byAction: state.byAction, byDoc };
}
