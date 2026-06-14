import { describe, it, expect } from 'vitest';
import {
  createProvenanceState, recordProvenance, getProvenanceForDoc, getProvenanceByAction,
  getProvenanceByActor, getDocumentCreator, getDocumentHistory, clearProvenance, getProvenanceReport,
} from '../../trust/V278-ProvenanceTracker';

describe('V278 ProvenanceTracker', () => {
  it('should create empty state', () => {
    const s = createProvenanceState();
    expect(s.entries).toHaveLength(0);
  });

  it('should record provenance', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    expect(s.entries).toHaveLength(1);
  });

  it('should get provenance for doc', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    s = recordProvenance(s, 'd1', 'edited', 'user2');
    s = recordProvenance(s, 'd2', 'created', 'user1');
    expect(getProvenanceForDoc(s, 'd1')).toHaveLength(2);
  });

  it('should get by action', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    s = recordProvenance(s, 'd1', 'edited', 'user2');
    expect(getProvenanceByAction(s, 'created')).toHaveLength(1);
  });

  it('should get by actor', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    s = recordProvenance(s, 'd2', 'created', 'user2');
    expect(getProvenanceByActor(s, 'user1')).toHaveLength(1);
  });

  it('should get document creator', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    s = recordProvenance(s, 'd1', 'edited', 'user2');
    expect(getDocumentCreator(s, 'd1')!.actorId).toBe('user1');
  });

  it('should get document history sorted', async () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    await new Promise(r => setTimeout(r, 5));
    s = recordProvenance(s, 'd1', 'edited', 'user2');
    const history = getDocumentHistory(s, 'd1');
    expect(history[0].action).toBe('created');
    expect(history[1].action).toBe('edited');
  });

  it('should clear state', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    s = clearProvenance(s);
    expect(s.entries).toHaveLength(0);
  });

  it('should record with metadata', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1', { ip: '127.0.0.1' });
    expect(s.entries[0].metadata.ip).toBe('127.0.0.1');
  });

  it('should track all action types', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'merged', 'u1', {}, 'd2', 'd1');
    expect(s.entries[0].sourceDocId).toBe('d2');
    expect(s.entries[0].targetDocId).toBe('d1');
  });

  it('should produce report', () => {
    let s = createProvenanceState();
    s = recordProvenance(s, 'd1', 'created', 'user1');
    s = recordProvenance(s, 'd2', 'created', 'user2');
    const r = getProvenanceReport(s);
    expect(r.totalEntries).toBe(2);
    expect(r.byDoc.d1).toBe(1);
  });
});
