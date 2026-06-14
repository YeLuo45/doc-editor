/**
 * V281 PIIDetector - Direction E Trust Verification (Iter 7/30)
 * thunderbolt: Detect PII (email/phone/SSN) for privacy compliance
 */
export type PIIType = 'email' | 'phone' | 'ssn' | 'credit_card' | 'ip' | 'name' | 'address';

export interface PIIDetection {
  type: PIIType;
  value: string;
  startPos: number;
  endPos: number;
  confidence: number;       // 0..1
}

export interface PIIDocResult {
  docId: string;
  detections: PIIDetection[];
  hasPII: boolean;
  redactedCount: number;
  scannedAt: number;
}

export interface PIIDetectorState {
  results: Map<string, PIIDocResult>;
  enabledTypes: Set<PIIType>;
  totalScans: number;
  totalPIIDetected: number;
}

export function createPIIDetectorState(): PIIDetectorState {
  return {
    results: new Map(),
    enabledTypes: new Set(['email', 'phone', 'ssn', 'credit_card']),
    totalScans: 0,
    totalPIIDetected: 0,
  };
}

const PATTERNS: Record<PIIType, RegExp> = {
  email: /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  credit_card: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
  ip: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
  name: /[A-Z][a-z]+ [A-Z][a-z]+/g,
  address: /\d+\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd)/g,
};

export function setEnabledTypes(state: PIIDetectorState, types: PIIType[]): PIIDetectorState {
  return { ...state, enabledTypes: new Set(types) };
}

export function scanDocument(state: PIIDetectorState, docId: string, content: string): { state: PIIDetectorState; result: PIIDocResult } {
  const detections: PIIDetection[] = [];
  for (const type of state.enabledTypes) {
    const pattern = PATTERNS[type];
    if (!pattern.global) continue;
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      detections.push({ type, value: match[0], startPos: match.index, endPos: match.index + match[0].length, confidence: 0.85 });
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
    }
  }
  const result: PIIDocResult = { docId, detections, hasPII: detections.length > 0, redactedCount: 0, scannedAt: Date.now() };
  return {
    state: { ...state, results: new Map(state.results).set(docId, result), totalScans: state.totalScans + 1, totalPIIDetected: state.totalPIIDetected + detections.length },
    result,
  };
}

export function redactPII(result: PIIDocResult, content: string): string {
  let redacted = content;
  // Sort by startPos desc to replace without affecting indices
  const sorted = [...result.detections].sort((a, b) => b.startPos - a.startPos);
  for (const det of sorted) {
    redacted = redacted.slice(0, det.startPos) + '[REDACTED]' + redacted.slice(det.endPos);
  }
  return redacted;
}

export function getPIIResult(state: PIIDetectorState, docId: string): PIIDocResult | undefined {
  return state.results.get(docId);
}

export function getDocsWithPII(state: PIIDetectorState): PIIDocResult[] {
  return Array.from(state.results.values()).filter(r => r.hasPII);
}

export function getPIIDetectionsByType(state: PIIDetectorState, type: PIIType): PIIDetection[] {
  const all: PIIDetection[] = [];
  for (const r of state.results.values()) {
    for (const d of r.detections) {
      if (d.type === type) all.push(d);
    }
  }
  return all;
}

export function clearPIIScans(state: PIIDetectorState): PIIDetectorState {
  return createPIIDetectorState();
}

export function getPIIDetectorReport(state: PIIDetectorState): { totalScans: number; totalPIIDetected: number; docsWithPII: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const r of state.results.values()) {
    for (const d of r.detections) byType[d.type] = (byType[d.type] || 0) + 1;
  }
  return { totalScans: state.totalScans, totalPIIDetected: state.totalPIIDetected, docsWithPII: getDocsWithPII(state).length, byType };
}
