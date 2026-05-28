/**
 * CollaborationSession.ts
 * Session management with undo/redo stack for collaborative editing
 */

import type { Operation } from './OperationTransform.js';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export interface UndoItem {
  id: string;
  type: 'insert' | 'delete';
  position: number;
  text?: string;
  length?: number;
  timestamp: number;
  nodeId: string;
  inverse?: Operation;
}

export interface SessionState {
  sessionId: string;
  documentId: string;
  userId: string;
  undoStack: UndoItem[];
  redoStack: UndoItem[];
  isConnected: boolean;
}

export class CollaborationSession {
  readonly sessionId: string;
  readonly documentId: string;
  readonly userId: string;
  private undoStack: UndoItem[] = [];
  private redoStack: UndoItem[] = [];
  private isConnected: boolean = false;
  private maxStackSize: number;
  private onOperationHandler?: (op: Operation) => void;

  constructor(documentId: string, userId: string, maxStackSize: number = 100) {
    this.sessionId = generateId();
    this.documentId = documentId;
    this.userId = userId;
    this.maxStackSize = maxStackSize;
  }

  onOperation(handler: (op: Operation) => void): void {
    this.onOperationHandler = handler;
  }

  pushUndo(item: UndoItem): void {
    this.undoStack.push(item);
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  createInsertUndo(position: number, text: string, nodeId: string): UndoItem {
    const inverse: Operation = {
      id: generateId(),
      type: 'delete',
      position,
      length: text.length,
      timestamp: Date.now(),
      nodeId,
      version: 0,
    };

    return {
      id: generateId(),
      type: 'insert',
      position,
      text,
      timestamp: Date.now(),
      nodeId,
      inverse,
    };
  }

  createDeleteUndo(position: number, length: number, deletedText: string, nodeId: string): UndoItem {
    const inverse: Operation = {
      id: generateId(),
      type: 'insert',
      position,
      text: deletedText,
      timestamp: Date.now(),
      nodeId,
      version: 0,
    };

    return {
      id: generateId(),
      type: 'delete',
      position,
      length,
      timestamp: Date.now(),
      nodeId,
      inverse,
    };
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): UndoItem | null {
    const item = this.undoStack.pop();
    if (!item) return null;

    this.redoStack.push(item);
    this.onOperationHandler?.(item.inverse!);

    return item;
  }

  redo(): UndoItem | null {
    const item = this.redoStack.pop();
    if (!item) return null;

    this.undoStack.push(item);

    const redoOp: Operation = {
      id: generateId(),
      type: item.type,
      position: item.position,
      text: item.type === 'insert' ? item.text : undefined,
      length: item.type === 'delete' ? item.length : undefined,
      timestamp: Date.now(),
      nodeId: item.nodeId,
      version: 0,
    };

    this.onOperationHandler?.(redoOp);

    return item;
  }

  getUndoSize(): number {
    return this.undoStack.length;
  }

  getRedoSize(): number {
    return this.redoStack.length;
  }

  setConnected(connected: boolean): void {
    this.isConnected = connected;
  }

  isActive(): boolean {
    return this.isConnected;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getState(): SessionState {
    return {
      sessionId: this.sessionId,
      documentId: this.documentId,
      userId: this.userId,
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      isConnected: this.isConnected,
    };
  }

  loadState(state: SessionState): void {
    this.undoStack = [...state.undoStack];
    this.redoStack = [...state.redoStack];
    this.isConnected = state.isConnected;
  }

  mergeRemote(remote: SessionState): void {
    const mergedUndo = this.mergeStacks(this.undoStack, remote.undoStack);
    const mergedRedo = this.mergeStacks(this.redoStack, remote.redoStack);

    this.undoStack = mergedUndo.slice(-this.maxStackSize);
    this.redoStack = mergedRedo.slice(-this.maxStackSize);
  }

  private mergeStacks(local: UndoItem[], remote: UndoItem[]): UndoItem[] {
    const map = new Map<string, UndoItem>();

    for (const item of local) {
      map.set(item.id, item);
    }

    for (const item of remote) {
      const existing = map.get(item.id);
      if (!existing || item.timestamp > existing.timestamp) {
        map.set(item.id, item);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }
}

// Session Manager
export class SessionManager {
  private sessions: Map<string, CollaborationSession> = new Map();

  createSession(documentId: string, userId: string): CollaborationSession {
    const session = new CollaborationSession(documentId, userId);
    this.sessions.set(session.sessionId, session);
    return session;
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSessionsForDocument(documentId: string): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.documentId === documentId
    );
  }

  clear(): void {
    this.sessions.clear();
  }
}

export default CollaborationSession;
