import { describe, it, expect } from 'vitest';
import {
  createAuditChainState, appendAudit, verifyChain, getAuditByAction,
  getAuditByAgent, getRecentAudits, clearAuditChain, getAuditChainReport,
} from '../../forge/V203-AgentAuditChain';

describe('V203 AgentAuditChain', () => {
  it('should create empty chain', () => {
    const s = createAuditChainState();
    expect(s.entries).toHaveLength(0);
  });

  it('should append audit', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', { i: 1 }, { o: 1 }, 'ok');
    expect(s.entries).toHaveLength(1);
  });

  it('should link prev hash', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    const h1 = s.lastHash;
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    expect(s.entries[1].prevHash).toBe(h1);
  });

  it('should verify valid chain', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = appendAudit(s, 'a', 'update', {}, {}, 'ok');
    s = appendAudit(s, 'a', 'distribute', {}, {}, 'ok');
    expect(verifyChain(s)).toBe(true);
  });

  it('should detect tampered chain', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    // Tamper with first entry
    s.entries[0].decision = 'tampered';
    expect(verifyChain(s)).toBe(false);
  });

  it('should get audit by action', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = appendAudit(s, 'a', 'register', {}, {}, 'ok');
    expect(getAuditByAction(s, 'invoke')).toHaveLength(1);
  });

  it('should get audit by agent', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = appendAudit(s, 'b', 'invoke', {}, {}, 'ok');
    expect(getAuditByAgent(s, 'a')).toHaveLength(1);
  });

  it('should get recent audits', () => {
    let s = createAuditChainState();
    for (let i = 0; i < 20; i++) s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    expect(getRecentAudits(s, 5)).toHaveLength(5);
  });

  it('should clear chain', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = clearAuditChain(s);
    expect(s.entries).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    const r = getAuditChainReport(s);
    expect(r.total).toBe(1);
    expect(r.chainValid).toBe(true);
  });

  it('should track by action in report', () => {
    let s = createAuditChainState();
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = appendAudit(s, 'a', 'invoke', {}, {}, 'ok');
    s = appendAudit(s, 'a', 'register', {}, {}, 'ok');
    const r = getAuditChainReport(s);
    expect(r.byAction.invoke).toBe(2);
  });
});
