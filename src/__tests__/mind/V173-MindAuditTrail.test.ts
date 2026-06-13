import { describe, it, expect } from 'vitest';
import {
  createAuditTrail, recordAudit, approveAudit,
  getAuditByAction, getAuditByAgent, getRecentAudits, searchAuditByReason,
  clearAudit, getAuditReport,
} from '../../mind/V173-MindAuditTrail';

describe('V173 MindAuditTrail', () => {
  it('should create empty audit', () => {
    const s = createAuditTrail();
    expect(s.entries).toHaveLength(0);
    expect(s.nextId).toBe(1);
  });

  it('should record audit entry', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'suggest', { text: 'a' }, { text: 'A' }, 'editor', 'better style', false);
    expect(s.entries).toHaveLength(1);
    expect(s.nextId).toBe(2);
  });

  it('should count apply/reject/modify', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'apply', {}, {}, 'a');
    s = recordAudit(s, 'apply', {}, {}, 'a');
    s = recordAudit(s, 'reject', {}, {}, 'a');
    s = recordAudit(s, 'modify', {}, {}, 'a');
    expect(s.totalApplied).toBe(2);
    expect(s.totalRejected).toBe(1);
    expect(s.totalModified).toBe(1);
  });

  it('should approve audit', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'suggest', {}, {}, 'a', undefined, false);
    s = approveAudit(s, 1);
    expect(s.entries[0].approved).toBe(true);
  });

  it('should get audit by action', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'apply', {}, {}, 'a');
    s = recordAudit(s, 'reject', {}, {}, 'a');
    s = recordAudit(s, 'apply', {}, {}, 'b');
    expect(getAuditByAction(s, 'apply')).toHaveLength(2);
  });

  it('should get audit by agent', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'suggest', {}, {}, 'editor');
    s = recordAudit(s, 'suggest', {}, {}, 'reviewer');
    s = recordAudit(s, 'suggest', {}, {}, 'editor');
    expect(getAuditByAgent(s, 'editor')).toHaveLength(2);
  });

  it('should get recent audits', () => {
    let s = createAuditTrail();
    for (let i = 0; i < 20; i++) s = recordAudit(s, 'suggest', { i }, {}, 'a');
    expect(getRecentAudits(s, 5)).toHaveLength(5);
  });

  it('should search by reason', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'suggest', {}, {}, 'a', 'better tone');
    s = recordAudit(s, 'suggest', {}, {}, 'a', 'shorter length');
    s = recordAudit(s, 'suggest', {}, {}, 'a', 'better style');
    expect(searchAuditByReason(s, 'better')).toHaveLength(2);
  });

  it('should clear audit', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'suggest', {}, {}, 'a');
    s = clearAudit();
    expect(s.entries).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createAuditTrail();
    s = recordAudit(s, 'apply', {}, {}, 'a', undefined, true);
    s = recordAudit(s, 'reject', {}, {}, 'a', undefined, false);
    const r = getAuditReport(s);
    expect(r.total).toBe(2);
    expect(r.applied).toBe(1);
    expect(r.rejected).toBe(1);
    expect(r.approvalRate).toBe(0.5);
  });

  it('should cap entries at 500', () => {
    let s = createAuditTrail();
    for (let i = 0; i < 600; i++) s = recordAudit(s, 'suggest', { i }, {}, 'a');
    expect(s.entries).toHaveLength(500);
  });
});
