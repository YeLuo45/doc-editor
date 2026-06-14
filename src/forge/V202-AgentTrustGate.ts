/**
 * V202 AgentTrustGate - Direction B Agent Forge (Iter 18/30)
 * ruflo: Trust checks before agent install (signature/reputation)
 */
export type TrustLevel = 'untrusted' | 'unknown' | 'verified' | 'trusted' | 'blocked';
export type CheckResult = 'pass' | 'fail' | 'warn' | 'skip';

export interface TrustCheck {
  name: string;
  description: string;
  result: CheckResult;
  message?: string;
}

export interface TrustAssessment {
  agentId: string;
  authorId: string;
  level: TrustLevel;
  score: number;     // 0..1
  checks: TrustCheck[];
  timestamp: number;
}

export interface TrustState {
  assessments: Map<string, TrustAssessment>;
  blockedAuthors: Set<string>;
  trustedAuthors: Set<string>;
  nextId: number;
}

export function createTrustState(): TrustState {
  return { assessments: new Map(), blockedAuthors: new Set(), trustedAuthors: new Set(), nextId: 1 };
}

export function addTrustedAuthor(state: TrustState, authorId: string): TrustState {
  return { ...state, trustedAuthors: new Set([...state.trustedAuthors, authorId]) };
}

export function addBlockedAuthor(state: TrustState, authorId: string): TrustState {
  return { ...state, blockedAuthors: new Set([...state.blockedAuthors, authorId]) };
}

export function assessAgent(state: TrustState, agentId: string, authorId: string, signature: string, reputation: number, hasMetadata: boolean): TrustState {
  const checks: TrustCheck[] = [];
  if (state.blockedAuthors.has(authorId)) {
    return { ...state, assessments: new Map(state.assessments).set(agentId, { agentId, authorId, level: 'blocked', score: 0, checks: [{ name: 'author', description: 'Author is blocked', result: 'fail' }], timestamp: Date.now() }) };
  }
  // Signature check
  checks.push({ name: 'signature', description: 'Cryptographic signature', result: signature.length > 10 ? 'pass' : 'fail', message: signature.length > 10 ? undefined : 'Signature too short' });
  // Reputation check
  checks.push({ name: 'reputation', description: 'Author reputation >= 0.5', result: reputation >= 0.5 ? 'pass' : reputation >= 0.3 ? 'warn' : 'fail' });
  // Trusted author
  checks.push({ name: 'author-trust', description: 'Author in trusted list', result: state.trustedAuthors.has(authorId) ? 'pass' : 'skip' });
  // Metadata
  checks.push({ name: 'metadata', description: 'Has complete metadata', result: hasMetadata ? 'pass' : 'warn' });
  // Compute score and level
  const passCount = checks.filter(c => c.result === 'pass').length;
  const score = checks.length > 0 ? passCount / checks.length : 0;
  let level: TrustLevel = 'unknown';
  if (checks.some(c => c.result === 'fail')) level = 'untrusted';
  else if (score >= 0.9) level = 'trusted';
  else if (score >= 0.6) level = 'verified';
  else if (score >= 0.3) level = 'unknown';
  return { ...state, assessments: new Map(state.assessments).set(agentId, { agentId, authorId, level, score, checks, timestamp: Date.now() }) };
}

export function isAllowed(state: TrustState, agentId: string): boolean {
  const a = state.assessments.get(agentId);
  if (!a) return false;
  return a.level !== 'untrusted' && a.level !== 'blocked';
}

export function getAssessment(state: TrustState, agentId: string): TrustAssessment | undefined {
  return state.assessments.get(agentId);
}

export function getTrustReport(state: TrustState): { assessments: number; trustedAuthors: number; blockedAuthors: number; byLevel: Record<string, number> } {
  const byLevel: Record<string, number> = {};
  for (const a of state.assessments.values()) byLevel[a.level] = (byLevel[a.level] || 0) + 1;
  return { assessments: state.assessments.size, trustedAuthors: state.trustedAuthors.size, blockedAuthors: state.blockedAuthors.size, byLevel };
}
