import { describe, it, expect } from 'vitest';
import {
  createSyncAuditState, recordAudit, getAuditByAction, getAuditByDoc, getAuditByDevice,
  getRecentAudit, searchAuditByDecision, clearAudit, getSyncAuditReport,
} from '../../federation/V233-SyncAudit';

describe('V233 SyncAudit', () => {
  it('should create empty state', () => {
    const s = createSyncAuditState();
    expect(s.entries).toHaveLength(0);
  });

  it('should record audit', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'dev1', { x: 1 }, { y: 2 }, 'ok');
    expect(s.entries).toHaveLength(1);
  });

  it('should get audit by action', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'dev1', {}, {}, 'ok');
    s = recordAudit(s, 'sync_end', 'd1', 'dev1', {}, {}, 'ok');
    expect(getAuditByAction(s, 'sync_start')).toHaveLength(1);
  });

  it('should get audit by doc', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'dev1', {}, {}, 'ok');
    s = recordAudit(s, 'sync_start', 'd2', 'dev1', {}, {}, 'ok');
    expect(getAuditByDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get audit by device', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'dev1', {}, {}, 'ok');
    s = recordAudit(s, 'sync_start', 'd1', 'dev2', {}, {}, 'ok');
    expect(getAuditByDevice(s, 'dev1')).toHaveLength(1);
  });

  it('should get recent audit', () => {
    let s = createSyncAuditState();
    for (let i = 0; i < 20; i++) s = recordAudit(s, 'sync_start', 'd1', 'd', {}, {}, 'ok');
    expect(getRecentAudit(s, 5)).toHaveLength(5);
  });

  it('should search by decision', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'd', {}, {}, 'retry needed');
    s = recordAudit(s, 'sync_end', 'd1', 'd', {}, {}, 'success');
    expect(searchAuditByDecision(s, 'retry')).toHaveLength(1);
  });

  it('should clear audit', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'd', {}, {}, 'ok');
    s = clearAudit(s);
    expect(s.entries).toHaveLength(0);
  });

  it('should cap at 1000', () => {
    let s = createSyncAuditState();
    for (let i = 0; i < 1500; i++) s = recordAudit(s, 'sync_start', 'd1', 'd', {}, {}, 'ok');
    expect(s.entries).toHaveLength(1000);
  });

  it('should produce report', () => {
    let s = createSyncAuditState();
    s = recordAudit(s, 'sync_start', 'd1', 'd', {}, {}, 'ok');
    s = recordAudit(s, 'sync_end', 'd2', 'd', {}, {}, 'ok');
    const r = getSyncAuditReport(s);
    expect(r.total).toBe(2);
    expect(r.byAction.sync_start).toBe(1);
  });
});
