import { describe, it, expect } from 'vitest';
import {
  createDocReplicaState, addReplica, setReplicaRole, updateReplicaVersion, markReplicaHealthy,
  getReplicasForDoc, getPrimaryReplica, getSecondaryReplicas, removeReplica, getDocReplicaReport,
} from '../../federation/V229-DocReplica';

describe('V229 DocReplica', () => {
  it('should create empty state', () => {
    const s = createDocReplicaState();
    expect(s.replicas.size).toBe(0);
  });

  it('should add replica', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1 });
    expect(getReplicasForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should set role', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'secondary', version: 1 });
    s = setReplicaRole(s, 'd1', 'i1', 'primary');
    expect(getPrimaryReplica(s, 'd1')!.instanceId).toBe('i1');
  });

  it('should update version and vector clock', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1 });
    s = updateReplicaVersion(s, 'd1', 'i1', 5, { i1: 5 });
    expect(getReplicasForDoc(s, 'd1')[0].version).toBe(5);
  });

  it('should mark healthy', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1, isHealthy: true });
    s = markReplicaHealthy(s, 'd1', 'i1', false);
    expect(getReplicasForDoc(s, 'd1')[0].isHealthy).toBe(false);
  });

  it('should get primary replica', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1 });
    s = addReplica(s, { docId: 'd1', instanceId: 'i2', role: 'secondary', version: 1 });
    expect(getPrimaryReplica(s, 'd1')!.instanceId).toBe('i1');
  });

  it('should get secondary replicas', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1 });
    s = addReplica(s, { docId: 'd1', instanceId: 'i2', role: 'secondary', version: 1 });
    s = addReplica(s, { docId: 'd1', instanceId: 'i3', role: 'secondary', version: 1 });
    expect(getSecondaryReplicas(s, 'd1')).toHaveLength(2);
  });

  it('should remove replica', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1 });
    s = removeReplica(s, 'd1', 'i1');
    expect(getReplicasForDoc(s, 'd1')).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createDocReplicaState();
    s = addReplica(s, { docId: 'd1', instanceId: 'i1', role: 'primary', version: 1 });
    s = addReplica(s, { docId: 'd1', instanceId: 'i2', role: 'secondary', version: 1 });
    s = addReplica(s, { docId: 'd2', instanceId: 'i1', role: 'primary', version: 1 });
    const r = getDocReplicaReport(s);
    expect(r.total).toBe(3);
    expect(r.byRole.primary).toBe(2);
  });
});
