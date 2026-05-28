/**
 * OperationTransform.ts
 * Operational Transformation algorithm for collaborative editing
 * Implements transform/compose for conflict resolution
 */

export type OpType = 'insert' | 'delete' | 'retain';

export interface Operation {
  id: string;
  type: OpType;
  position: number;
  length?: number;
  text?: string;
  timestamp: number;
  nodeId: string;
  version: number;
}

export interface TransformResult {
  op1Prime: Operation;
  op2Prime: Operation;
}

export interface ServerState {
  version: number;
  operations: Operation[];
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Transform operation against another
export function transformOp(op1: Operation, op2: Operation): TransformResult {
  const op1Prime: Operation = { ...op1 };
  const op2Prime: Operation = { ...op2 };

  if (op1.version !== op2.version) {
    op1Prime.version = Math.max(op1.version, op2.version);
    op2Prime.version = Math.max(op1.version, op2.version);
  }

  if (op1.type === 'insert' && op2.type === 'insert') {
    // Same position tie-break: lower nodeId wins (its op keeps position), higher nodeId loses (shifts right by winner's length)
    if (op1.position < op2.position ||
        (op1.position === op2.position && op1.nodeId < op2.nodeId)) {
      // op1 wins: op2 shifts right by op1's text length (op1Prime unchanged)
      op2Prime.position += op1.text?.length ?? 1;
    } else {
      // op2 wins: op1 shifts right by op2's text length
      op1Prime.position += op2.text?.length ?? 1;
    }
  } else if (op1.type === 'insert' && op2.type === 'delete') {
    if (op1.position <= op2.position) {
      // Insert before or at delete position: shift insert right
      op1Prime.position += op2.length ?? 1;
    } else if (op1.position > op2.position + (op2.length ?? 1)) {
      // Insert after deleted range: shift insert left
      op1Prime.position -= op2.length ?? 1;
    } else {
      // Insert falls within deleted range: place after delete position
      op1Prime.position = op2.position + 1;
    }
  } else if (op1.type === 'delete' && op2.type === 'insert') {
    if (op2.position <= op1.position) {
      op1Prime.position += op2.text?.length ?? 1;
    } else if (op2.position >= op1.position + (op1.length ?? 1)) {
      op2Prime.position -= op1.length ?? 1;
    } else {
      op2Prime.position = op1.position;
    }
  } else if (op1.type === 'delete' && op2.type === 'delete') {
    if (op1.position === op2.position) {
      op2Prime.type = 'retain';
      op2Prime.length = 0;
    } else if (op1.position < op2.position) {
      op2Prime.position -= op1.length ?? 1;
    } else {
      op1Prime.position -= op2.length ?? 1;
    }
  }

  return { op1Prime, op2Prime };
}

// Transform an operation against multiple server operations
export function transformAgainstHistory(
  op: Operation,
  history: Operation[]
): Operation {
  let transformed = { ...op };

  for (const histOp of history) {
    if (histOp.version > transformed.version) {
      const result = transformOp(transformed, histOp);
      transformed = result.op1Prime;
    }
  }

  return transformed;
}

// Compose two operations into one
export function composeOp(op1: Operation, op2: Operation): Operation | null {
  if (op1.type === 'insert' && op2.type === 'insert') {
    const op1Len = op1.text?.length ?? 1;
    const op2Len = op2.text?.length ?? 1;
    if (op1.position + op1Len === op2.position) {
      return {
        ...op1,
        id: generateId(),
        text: (op1.text ?? '') + (op2.text ?? ''),
        length: op1Len + op2Len,
        timestamp: Math.max(op1.timestamp, op2.timestamp),
        version: Math.max(op1.version, op2.version) + 1,
      };
    }
  } else if (op1.type === 'delete' && op2.type === 'delete') {
    if (op1.position === op2.position) {
      return {
        ...op1,
        id: generateId(),
        length: (op1.length ?? 1) + (op2.length ?? 1),
        timestamp: Math.max(op1.timestamp, op2.timestamp),
        version: Math.max(op1.version, op2.version) + 1,
      };
    }
  }

  return null;
}

// Operation Transform Engine
export class OperationTransform {
  private pendingOps: Operation[] = [];
  private serverOps: Operation[] = [];
  private version = 0;
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  createInsertOp(position: number, text: string): Operation {
    const op: Operation = {
      id: generateId(),
      type: 'insert',
      position,
      text,
      timestamp: Date.now(),
      nodeId: this.nodeId,
      version: this.version,
    };
    this.pendingOps.push(op);
    return op;
  }

  createDeleteOp(position: number, length: number): Operation {
    const op: Operation = {
      id: generateId(),
      type: 'delete',
      position,
      length,
      timestamp: Date.now(),
      nodeId: this.nodeId,
      version: this.version,
    };
    this.pendingOps.push(op);
    return op;
  }

  transformOutgoing(op: Operation): Operation {
    let transformed = { ...op };

    for (const serverOp of this.serverOps) {
      const result = transformOp(transformed, serverOp);
      transformed = result.op1Prime;
    }

    return transformed;
  }

  receiveFromServer(op: Operation): Operation {
    const transformed = this.transformAgainstPending(op);

    this.version = Math.max(this.version, op.version) + 1;
    this.serverOps.push({ ...op, version: this.version });

    return transformed;
  }

  transformAgainstPending(op: Operation): Operation {
    let transformed = { ...op };

    for (const pending of this.pendingOps) {
      if (pending.version > op.version) {
        const result = transformOp(transformed, pending);
        transformed = result.op1Prime;
      }
    }

    return transformed;
  }

  acknowledge(opId: string): void {
    this.pendingOps = this.pendingOps.filter((op) => op.id !== opId);
  }

  getPending(): Operation[] {
    return [...this.pendingOps];
  }

  getServerOps(): Operation[] {
    return [...this.serverOps];
  }

  getVersion(): number {
    return this.version;
  }

  getServerState(): ServerState {
    return {
      version: this.version,
      operations: [...this.serverOps],
    };
  }

  loadServerState(state: ServerState): void {
    this.version = state.version;
    this.serverOps = [...state.operations];
    this.pendingOps = [];
  }
}

// Apply operations to text
export function applyOps(text: string, ops: Operation[]): string {
  let result = text;

  const sorted = [...ops].sort((a, b) => a.timestamp - b.timestamp);

  for (const op of sorted) {
    if (op.type === 'insert' && op.text) {
      const pos = Math.min(op.position, result.length);
      result = result.slice(0, pos) + op.text + result.slice(pos);
    } else if (op.type === 'delete' && op.length) {
      const pos = Math.min(op.position, result.length);
      result = result.slice(0, pos) + result.slice(pos + op.length);
    }
  }

  return result;
}

export default OperationTransform;
