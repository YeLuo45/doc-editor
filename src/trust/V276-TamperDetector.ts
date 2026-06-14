/**
 * V276 TamperDetector - Direction E Trust Verification (Iter 2/30)
 * thunderbolt: Detect any modification to sealed documents
 */
export type TamperStatus = 'sealed' | 'tampered' | 'unmodified' | 'modified' | 'unknown';

export interface SealRecord {
  docId: string;
  hash: string;
  contentLength: number;
  sealedAt: number;
  sealedBy: string;
}

export interface TamperEvent {
  docId: string;
  status: TamperStatus;
  expectedHash: string;
  actualHash?: string;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TamperDetectorState {
  seals: Map<string, SealRecord>;
  events: TamperEvent[];
  totalSeals: number;
  totalTampered: number;
}

export function createTamperDetectorState(): TamperDetectorState {
  return { seals: new Map(), events: [], totalSeals: 0, totalTampered: 0 };
}

export function sealDocument(state: TamperDetectorState, docId: string, hash: string, contentLength: number, sealedBy: string): TamperDetectorState {
  const seal: SealRecord = { docId, hash, contentLength, sealedAt: Date.now(), sealedBy };
  return { ...state, seals: new Map(state.seals).set(docId, seal), totalSeals: state.totalSeals + 1 };
}

export function checkTamper(state: TamperDetectorState, docId: string, currentHash: string, currentLength: number): { state: TamperDetectorState; status: TamperStatus; severity?: 'low' | 'medium' | 'high' | 'critical' } {
  const seal = state.seals.get(docId);
  if (!seal) return { state, status: 'unknown' };
  let status: TamperStatus = 'unmodified';
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (seal.hash !== currentHash) {
    status = 'tampered';
    severity = 'critical';
  } else if (seal.contentLength !== currentLength) {
    status = 'modified';
    severity = 'high';
  }
  if (status === 'tampered' || status === 'modified') {
    const event: TamperEvent = { docId, status, expectedHash: seal.hash, actualHash: currentHash, detectedAt: Date.now(), severity };
    return {
      state: { ...state, events: [...state.events, event].slice(-1000), totalTampered: state.totalTampered + 1 },
      status,
      severity,
    };
  }
  return { state, status, severity };
}

export function unsealDocument(state: TamperDetectorState, docId: string): TamperDetectorState {
  const seals = new Map(state.seals);
  seals.delete(docId);
  return { ...state, seals };
}

export function getSeal(state: TamperDetectorState, docId: string): SealRecord | undefined {
  return state.seals.get(docId);
}

export function getEventsForDoc(state: TamperDetectorState, docId: string): TamperEvent[] {
  return state.events.filter(e => e.docId === docId);
}

export function getRecentEvents(state: TamperDetectorState, count: number = 10): TamperEvent[] {
  return state.events.slice(-count);
}

export function clearTamperState(state: TamperDetectorState): TamperDetectorState {
  return createTamperDetectorState();
}

export function getTamperReport(state: TamperDetectorState): { totalSeals: number; totalTampered: number; bySeverity: Record<string, number> } {
  const bySeverity: Record<string, number> = {};
  for (const e of state.events) bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
  return { totalSeals: state.totalSeals, totalTampered: state.totalTampered, bySeverity };
}
