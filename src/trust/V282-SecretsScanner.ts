/**
 * V282 SecretsScanner - Direction E Trust Verification (Iter 8/30)
 * thunderbolt: Scan for secrets/credentials/API keys
 */
export type SecretType = 'aws_key' | 'github_token' | 'private_key' | 'password' | 'api_key' | 'jwt';

export interface SecretDetection {
  type: SecretType;
  masked: string;       // e.g. "AKIA****ABCD"
  startPos: number;
  endPos: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecretScanResult {
  docId: string;
  detections: SecretDetection[];
  hasSecrets: boolean;
  scannedAt: number;
}

export interface SecretsScannerState {
  results: Map<string, SecretScanResult>;
  totalScans: number;
  totalSecrets: number;
  bySeverity: Record<string, number>;
}

export function createSecretsScannerState(): SecretsScannerState {
  return { results: new Map(), totalScans: 0, totalSecrets: 0, bySeverity: {} };
}

const SECRET_PATTERNS: Array<{ type: SecretType; pattern: RegExp; severity: SecretDetection['severity'] }> = [
  { type: 'aws_key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { type: 'github_token', pattern: /ghp_[a-zA-Z0-9]{36}/g, severity: 'critical' },
  { type: 'private_key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, severity: 'critical' },
  { type: 'password', pattern: /(?:password|passwd)\s*[=:]\s*['"]?[^\s'"]{4,}['"]?/gi, severity: 'high' },
  { type: 'api_key', pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"]?[a-zA-Z0-9]{16,}['"]?/gi, severity: 'high' },
  { type: 'jwt', pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, severity: 'high' },
];

export function scanForSecrets(state: SecretsScannerState, docId: string, content: string): { state: SecretsScannerState; result: SecretScanResult } {
  const detections: SecretDetection[] = [];
  for (const { type, pattern, severity } of SECRET_PATTERNS) {
    if (!pattern.global) continue;
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const value = match[0];
      const masked = value.length > 8 ? value.slice(0, 4) + '****' + value.slice(-4) : '****';
      detections.push({ type, masked, startPos: match.index, endPos: match.index + value.length, severity });
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
    }
  }
  const bySeverity: Record<string, number> = { ...state.bySeverity };
  for (const d of detections) bySeverity[d.severity] = (bySeverity[d.severity] || 0) + 1;
  const result: SecretScanResult = { docId, detections, hasSecrets: detections.length > 0, scannedAt: Date.now() };
  return {
    state: { ...state, results: new Map(state.results).set(docId, result), totalScans: state.totalScans + 1, totalSecrets: state.totalSecrets + detections.length, bySeverity },
    result,
  };
}

export function getScanResult(state: SecretsScannerState, docId: string): SecretScanResult | undefined {
  return state.results.get(docId);
}

export function getDocsWithSecrets(state: SecretsScannerState): SecretScanResult[] {
  return Array.from(state.results.values()).filter(r => r.hasSecrets);
}

export function getDetectionsBySeverity(state: SecretsScannerState, severity: SecretDetection['severity']): SecretDetection[] {
  const all: SecretDetection[] = [];
  for (const r of state.results.values()) {
    for (const d of r.detections) {
      if (d.severity === severity) all.push(d);
    }
  }
  return all;
}

export function clearSecretScans(state: SecretsScannerState): SecretsScannerState {
  return createSecretsScannerState();
}

export function getSecretsScannerReport(state: SecretsScannerState): { totalScans: number; totalSecrets: number; docsWithSecrets: number; bySeverity: Record<string, number> } {
  return { totalScans: state.totalScans, totalSecrets: state.totalSecrets, docsWithSecrets: getDocsWithSecrets(state).length, bySeverity: state.bySeverity };
}
