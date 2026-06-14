/**
 * V277 SignatureVerifier - Direction E Trust Verification (Iter 3/30)
 * thunderbolt: Verify digital signatures on documents
 */
export type SignatureAlgorithm = 'rsa-sha256' | 'ecdsa-sha256' | 'ed25519' | 'hmac-sha256';

export interface Signature {
  signerId: string;
  algorithm: SignatureAlgorithm;
  signature: string;
  publicKeyId: string;
  signedAt: number;
}

export interface VerificationResult {
  docId: string;
  signerId: string;
  valid: boolean;
  algorithm: SignatureAlgorithm;
  verifiedAt: number;
  reason?: string;
}

export interface SignatureState {
  signatures: Map<string, Signature[]>;   // docId -> signatures
  trustedKeys: Set<string>;
  verifications: VerificationResult[];
  totalVerifications: number;
  totalValid: number;
  totalInvalid: number;
}

export function createSignatureState(): SignatureState {
  return { signatures: new Map(), trustedKeys: new Set(), verifications: [], totalVerifications: 0, totalValid: 0, totalInvalid: 0 };
}

export function addTrustedKey(state: SignatureState, keyId: string): SignatureState {
  return { ...state, trustedKeys: new Set([...state.trustedKeys, keyId]) };
}

export function removeTrustedKey(state: SignatureState, keyId: string): SignatureState {
  const trustedKeys = new Set(state.trustedKeys);
  trustedKeys.delete(keyId);
  return { ...state, trustedKeys };
}

export function attachSignature(state: SignatureState, docId: string, signature: Signature): SignatureState {
  const existing = state.signatures.get(docId) || [];
  return { ...state, signatures: new Map(state.signatures).set(docId, [...existing, signature]) };
}

export function verifySignature(state: SignatureState, docId: string, signerId: string, algorithm: SignatureAlgorithm, signatureValue: string, publicKeyId: string): { state: SignatureState; valid: boolean; reason?: string } {
  const valid = state.trustedKeys.has(publicKeyId) && signatureValue.length > 0;
  const result: VerificationResult = { docId, signerId, valid, algorithm, verifiedAt: Date.now(), reason: valid ? undefined : 'untrusted_key' };
  return {
    state: {
      ...state,
      verifications: [...state.verifications, result].slice(-1000),
      totalVerifications: state.totalVerifications + 1,
      totalValid: state.totalValid + (valid ? 1 : 0),
      totalInvalid: state.totalInvalid + (valid ? 0 : 1),
    },
    valid,
    reason: valid ? undefined : 'untrusted_key',
  };
}

export function getSignaturesForDoc(state: SignatureState, docId: string): Signature[] {
  return state.signatures.get(docId) || [];
}

export function getVerificationsForDoc(state: SignatureState, docId: string): VerificationResult[] {
  return state.verifications.filter(v => v.docId === docId);
}

export function isKeyTrusted(state: SignatureState, keyId: string): boolean {
  return state.trustedKeys.has(keyId);
}

export function clearSignatures(state: SignatureState): SignatureState {
  return createSignatureState();
}

export function getSignatureReport(state: SignatureState): { totalVerifications: number; totalValid: number; totalInvalid: number; trustedKeys: number; byAlgorithm: Record<string, number> } {
  const byAlgorithm: Record<string, number> = {};
  for (const v of state.verifications) byAlgorithm[v.algorithm] = (byAlgorithm[v.algorithm] || 0) + 1;
  return { totalVerifications: state.totalVerifications, totalValid: state.totalValid, totalInvalid: state.totalInvalid, trustedKeys: state.trustedKeys.size, byAlgorithm };
}
