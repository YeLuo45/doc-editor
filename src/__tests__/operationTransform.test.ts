import { describe, it, expect, beforeEach } from 'vitest';
import {
  OperationTransform,
  transformOp,
  composeOp,
  applyOps,
  type Operation,
} from '../collab/OperationTransform.js';

const makeOp = (overrides: Partial<Operation> = {}): Operation => ({
  id: 'test-op',
  type: 'insert',
  position: 0,
  text: '',
  timestamp: 100,
  nodeId: 'node1',
  version: 0,
  ...overrides,
});

describe('transformOp', () => {
  it('should transform two inserts at same position', () => {
    const op1 = makeOp({
      id: 'op1',
      type: 'insert',
      position: 5,
      text: 'abc',
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const op2 = makeOp({
      id: 'op2',
      type: 'insert',
      position: 5,
      text: 'xyz',
      timestamp: 100,
      nodeId: 'node2',
      version: 0,
    });

    const { op1Prime, op2Prime } = transformOp(op1, op2);

    expect(op2Prime.position).toBe(8);
    expect(op1Prime.position).toBe(5);
  });

  it('should transform insert against delete before it', () => {
    const insertOp = makeOp({
      id: 'insert',
      type: 'insert',
      position: 10,
      text: 'new',
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const deleteOp = makeOp({
      id: 'delete',
      type: 'delete',
      position: 5,
      length: 3,
      timestamp: 100,
      nodeId: 'node2',
      version: 0,
    });

    const { op1Prime } = transformOp(insertOp, deleteOp);

    // insert at 10, delete at 5 len 3: after delete, insert pos shifts to account for deleted chars
    // If client applies delete first: insert moves left by 3 (10-3=7)
    // If client applies insert first: insert stays but text shifted (position stays 10)
    // Standard OT for insert vs delete: insert shifts right by delete length when <= delete pos
    expect(op1Prime.position).toBe(7);
  });

  it('should transform delete against insert before it', () => {
    const deleteOp = makeOp({
      id: 'delete',
      type: 'delete',
      position: 10,
      length: 3,
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const insertOp = makeOp({
      id: 'insert',
      type: 'insert',
      position: 5,
      text: 'new',
      timestamp: 100,
      nodeId: 'node2',
      version: 0,
    });

    const { op1Prime } = transformOp(deleteOp, insertOp);

    expect(op1Prime.position).toBe(13);
  });

  it('should handle overlapping deletes', () => {
    const op1 = makeOp({
      id: 'op1',
      type: 'delete',
      position: 5,
      length: 3,
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const op2 = makeOp({
      id: 'op2',
      type: 'delete',
      position: 5,
      length: 3,
      timestamp: 100,
      nodeId: 'node2',
      version: 0,
    });

    const { op2Prime } = transformOp(op1, op2);

    expect(op2Prime.type).toBe('retain');
    expect(op2Prime.length).toBe(0);
  });
});

describe('composeOp', () => {
  it('should compose adjacent inserts', () => {
    const op1 = makeOp({
      id: 'op1',
      type: 'insert',
      position: 0,
      text: 'hello',
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const op2 = makeOp({
      id: 'op2',
      type: 'insert',
      position: 5,
      text: ' world',
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });

    const composed = composeOp(op1, op2);

    expect(composed).not.toBeNull();
    expect(composed!.text).toBe('hello world');
    expect(composed!.length).toBe(11);
  });

  it('should not compose non-adjacent inserts', () => {
    const op1 = makeOp({
      id: 'op1',
      type: 'insert',
      position: 0,
      text: 'hello',
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const op2 = makeOp({
      id: 'op2',
      type: 'insert',
      position: 10,
      text: ' world',
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });

    const composed = composeOp(op1, op2);

    expect(composed).toBeNull();
  });

  it('should compose adjacent deletes', () => {
    const op1 = makeOp({
      id: 'op1',
      type: 'delete',
      position: 0,
      length: 3,
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });
    const op2 = makeOp({
      id: 'op2',
      type: 'delete',
      position: 0,
      length: 2,
      timestamp: 100,
      nodeId: 'node1',
      version: 0,
    });

    const composed = composeOp(op1, op2);

    expect(composed).not.toBeNull();
    expect(composed!.length).toBe(5);
  });
});

describe('applyOps', () => {
  it('should apply insert operations', () => {
    const ops: Operation[] = [
      makeOp({
        id: '1',
        type: 'insert',
        position: 0,
        text: 'hello',
        timestamp: 100,
        nodeId: 'node1',
        version: 0,
      }),
      makeOp({
        id: '2',
        type: 'insert',
        position: 5,
        text: ' world',
        timestamp: 100,
        nodeId: 'node1',
        version: 0,
      }),
    ];

    const result = applyOps('', ops);
    expect(result).toBe('hello world');
  });

  it('should apply delete operations', () => {
    const ops: Operation[] = [
      makeOp({
        id: '1',
        type: 'insert',
        position: 0,
        text: 'hello world',
        timestamp: 100,
        nodeId: 'node1',
        version: 0,
      }),
      makeOp({
        id: '2',
        type: 'delete',
        position: 5,
        length: 6,
        timestamp: 200,
        nodeId: 'node1',
        version: 0,
      }),
    ];

    const result = applyOps('', ops);
    expect(result).toBe('hello');
  });

  it('should handle complex edit sequence', () => {
    const ops: Operation[] = [
      makeOp({
        id: '1',
        type: 'insert',
        position: 0,
        text: 'The quick brown fox',
        timestamp: 100,
        nodeId: 'node1',
        version: 0,
      }),
      makeOp({
        id: '2',
        type: 'delete',
        position: 4,
        length: 6,
        timestamp: 200,
        nodeId: 'node1',
        version: 0,
      }),
      makeOp({
        id: '3',
        type: 'insert',
        position: 4,
        text: 'slow',
        timestamp: 300,
        nodeId: 'node1',
        version: 0,
      }),
    ];

    // Note: "quick " (position 4-9, 6 chars) includes trailing space
    // After delete, we have "The brown fox" (no space before brown)
    // Insert at pos 4 gives "The slowbrown fox"
    const result = applyOps('', ops);
    expect(result).toBe('The slowbrown fox');
  });
});

describe('OperationTransform Engine', () => {
  let ot: OperationTransform;

  beforeEach(() => {
    ot = new OperationTransform('node1');
  });

  it('should create insert operation', () => {
    const op = ot.createInsertOp(0, 'hello');
    expect(op.type).toBe('insert');
    expect(op.text).toBe('hello');
    expect(op.position).toBe(0);
  });

  it('should create delete operation', () => {
    const op = ot.createDeleteOp(0, 5);
    expect(op.type).toBe('delete');
    expect(op.length).toBe(5);
  });

  it('should track pending operations', () => {
    ot.createInsertOp(0, 'hello');
    ot.createInsertOp(5, ' world');

    const pending = ot.getPending();
    expect(pending.length).toBe(2);
  });

  it('should acknowledge operation', () => {
    const op = ot.createInsertOp(0, 'hello');
    ot.acknowledge(op.id);

    const pending = ot.getPending();
    expect(pending.length).toBe(0);
  });

  it('should get server state', () => {
    const state = ot.getServerState();
    expect(state.version).toBe(0);
    expect(Array.isArray(state.operations)).toBe(true);
  });

  it('should load server state', () => {
    const remoteOp: Operation = {
      id: 'remote1',
      type: 'insert',
      position: 0,
      text: 'synced',
      timestamp: 100,
      nodeId: 'node2',
      version: 0,
    };

    ot.loadServerState({
      version: 5,
      operations: [remoteOp],
    });

    expect(ot.getVersion()).toBe(5);
    expect(ot.getServerOps().length).toBe(1);
  });

  it('should transform outgoing operation', () => {
    const serverOp: Operation = {
      id: 'server1',
      type: 'insert',
      position: 0,
      text: 'server',
      timestamp: 100,
      nodeId: 'node2',
      version: 0,
    };

    ot.receiveFromServer(serverOp);

    const clientOp = ot.createInsertOp(0, 'client');

    const transformed = ot.transformOutgoing(clientOp);

    // server inserted 'server' (6 chars) at 0; client inserts 'client' (6 chars) at 0
    // Same position at 0: node1 < node2 alphabetically, so node1 (client) wins tie-break
    // Winner's position stays at 0; only the loser (server op) shifts
    expect(transformed.position).toBe(0);
  });
});
