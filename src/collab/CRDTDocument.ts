/**
 * CRDTDocument.ts
 * Collaborative editing document using CRDTs:
 * - LWWRegister: Last-Writer-Wins Register for scalar values
 * - ORSet: Observed-Remove Set for collection operations
 * - TextCRDT: Character-based CRDT for text editing
 */

// Simple UUID generator
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// ============ LWW Register ============

export interface LWWEntry<T> {
  value: T;
  timestamp: number;
  nodeId: string;
}

export class LWWRegister<T> {
  private value!: T;
  private timestamp = 0;
  private nodeId: string;

  constructor(nodeId: string, initialValue?: T) {
    this.nodeId = nodeId;
    if (initialValue !== undefined) {
      this.value = initialValue;
      this.timestamp = 0;
    }
  }

  get(): T | undefined {
    return this.value;
  }

  set(value: T, timestamp?: number): LWWEntry<T> {
    const ts = timestamp ?? Date.now();
    if (ts > this.timestamp) {
      this.value = value;
      this.timestamp = ts;
    }
    return { value: this.value as T, timestamp: this.timestamp, nodeId: this.nodeId };
  }

  merge(entry: LWWEntry<T>): T {
    // Special: if our timestamp is 0 (initial unsycned value), accept any remote
    // Otherwise only accept if remote timestamp is higher (or tie-break by nodeId)
    if (this.timestamp === 0 || entry.timestamp > this.timestamp ||
        (entry.timestamp === this.timestamp && entry.nodeId < this.nodeId)) {
      this.value = entry.value;
      this.timestamp = entry.timestamp;
      this.nodeId = entry.nodeId;
    }
    return this.value as T;
  }

  toJSON(): LWWEntry<T> {
    return { value: this.value as T, timestamp: this.timestamp, nodeId: this.nodeId };
  }
}

// ============ OR-Set ============

export interface ORSetElement<T> {
  value: T;
  addTimestamp: number;
  removeTimestamp: number;
  nodeId: string;
}

export class ORSet<T> {
  private elements: Map<string, ORSetElement<T>> = new Map();
  private clock = 0;
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  add(value: T, timestamp?: number): string {
    const id = generateId();
    const ts = timestamp ?? Date.now();
    this.elements.set(id, {
      value,
      addTimestamp: ts,
      removeTimestamp: 0,
      nodeId: this.nodeId,
    });
    return id;
  }

  remove(id: string, timestamp?: number): boolean {
    const element = this.elements.get(id);
    if (!element || element.removeTimestamp > 0) return false;
    const ts = timestamp ?? Date.now();
    element.removeTimestamp = ts;
    return true;
  }

  has(id: string): boolean {
    const element = this.elements.get(id);
    return element !== undefined && element.removeTimestamp === 0;
  }

  get(id: string): T | undefined {
    const element = this.elements.get(id);
    if (!element || element.removeTimestamp > 0) return undefined;
    return element.value;
  }

  getAll(): Map<string, T> {
    const result = new Map<string, T>();
    for (const [id, el] of this.elements) {
      if (el.removeTimestamp === 0) {
        result.set(id, el.value);
      }
    }
    return result;
  }

  merge(remoteElements: Map<string, ORSetElement<T>>): void {
    for (const [id, remote] of remoteElements) {
      const local = this.elements.get(id);
      if (!local) {
        this.elements.set(id, { ...remote });
      } else {
        if (remote.addTimestamp > local.addTimestamp) {
          local.addTimestamp = remote.addTimestamp;
          local.value = remote.value;
          local.nodeId = remote.nodeId;
        }
        if (remote.removeTimestamp > local.removeTimestamp) {
          local.removeTimestamp = remote.removeTimestamp;
        }
      }
    }
  }

  toJSON(): Map<string, ORSetElement<T>> {
    return new Map(this.elements);
  }
}

// ============ Text CRDT ============

export interface TextOperation {
  id: string;
  type: 'insert' | 'delete';
  position: number;
  character: string;
  timestamp: number;
  nodeId: string;
}

export class TextCRDT {
  private operations: TextOperation[] = [];
  private nodeId: string;
  private clock = 0;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  getClock(): number {
    return this.clock;
  }

  incrementClock(): number {
    return ++this.clock;
  }

  insert(position: number, character: string, timestamp?: number): TextOperation {
    const ts = timestamp ?? ++this.clock;
    const op: TextOperation = {
      id: generateId(),
      type: 'insert',
      position,
      character,
      timestamp: ts,
      nodeId: this.nodeId,
    };
    this.operations.push(op);
    return op;
  }

  delete(position: number, timestamp?: number): TextOperation {
    const ts = timestamp ?? ++this.clock;
    const op: TextOperation = {
      id: generateId(),
      type: 'delete',
      position,
      character: '',
      timestamp: ts,
      nodeId: this.nodeId,
    };
    this.operations.push(op);
    return op;
  }

  apply(operations: TextOperation[]): string {
    const insertOps = operations
      .filter((op) => op.type === 'insert')
      .sort((a, b) => a.timestamp - b.timestamp);

    const deleteOps = operations
      .filter((op) => op.type === 'delete')
      .sort((a, b) => a.timestamp - b.timestamp);

    let text = '';
    let offset = 0;

    for (const op of insertOps) {
      if (op.type === 'insert') {
        const insertPos = op.position + offset;
        text = text.slice(0, insertPos) + op.character + text.slice(insertPos);
        offset += op.character.length;
      }
    }

    // Remove deletes - delete from position to end of string
    for (let i = deleteOps.length - 1; i >= 0; i--) {
      const op = deleteOps[i];
      if (op.position < text.length) {
        text = text.slice(0, op.position);
      }
    }

    return text;
  }

  getState(): TextOperation[] {
    return [...this.operations];
  }

  merge(remoteOps: TextOperation[]): void {
    for (const op of remoteOps) {
      const exists = this.operations.some(
        (local) => local.id === op.id
      );
      if (!exists) {
        this.operations.push(op);
        if (op.timestamp > this.clock) {
          this.clock = op.timestamp;
        }
      }
    }
  }
}

// ============ CRDTDocument ============

export interface DocumentMetadata {
  id: string;
  title: LWWEntry<string>;
  createdAt: number;
  version: number;
}

export interface CRDTDocumentState {
  metadata: DocumentMetadata;
  text: TextOperation[];
  tags: Map<string, ORSetElement<string>>;
  attributes: LWWEntry<Record<string, unknown>>;
}

export class CRDTDocument {
  readonly id: string;
  private title: LWWRegister<string>;
  private text: TextCRDT;
  private tags: ORSet<string>;
  private attributes: LWWRegister<Record<string, unknown>>;
  private version = 0;
  private createdAt: number;

  constructor(id: string, nodeId: string, initialTitle?: string) {
    this.id = id;
    this.createdAt = Date.now();
    this.title = new LWWRegister(nodeId, initialTitle ?? 'Untitled');
    this.text = new TextCRDT(nodeId);
    this.tags = new ORSet(nodeId);
    this.attributes = new LWWRegister(nodeId, {});
  }

  getTitle(): string {
    return this.title.get() ?? 'Untitled';
  }

  setTitle(title: string): void {
    this.title.set(title);
    this.version++;
  }

  getText(): string {
    return this.text.apply(this.text.getState());
  }

  insertText(position: number, character: string): TextOperation {
    this.version++;
    return this.text.insert(position, character);
  }

  deleteText(position: number): TextOperation {
    this.version++;
    return this.text.delete(position);
  }

  addTag(tag: string): string {
    this.version++;
    return this.tags.add(tag);
  }

  removeTag(tagId: string): boolean {
    this.version++;
    return this.tags.remove(tagId);
  }

  getTags(): Map<string, string> {
    return this.tags.getAll() as Map<string, string>;
  }

  setAttribute(key: string, value: unknown): void {
    const attrs = this.attributes.get() ?? {};
    attrs[key] = value;
    this.attributes.set({ ...attrs });
    this.version++;
  }

  getAttribute(key: string): unknown {
    const attrs = this.attributes.get() ?? {};
    return attrs[key];
  }

  getVersion(): number {
    return this.version;
  }

  mergeRemote(state: CRDTDocumentState): void {
    // Merge title
    if (state.metadata.title) {
      this.title.merge(state.metadata.title);
    }

    // Merge text operations
    if (state.text) {
      this.text.merge(state.text);
    }

    // Merge tags
    if (state.tags) {
      this.tags.merge(state.tags as Map<string, ORSetElement<string>>);
    }

    // Merge attributes
    if (state.attributes) {
      this.attributes.merge(state.attributes);
    }

    this.version = state.metadata.version;
  }

  getState(): CRDTDocumentState {
    return {
      metadata: {
        id: this.id,
        title: this.title.toJSON(),
        createdAt: this.createdAt,
        version: this.version,
      },
      text: this.text.getState(),
      tags: this.tags.toJSON() as unknown as Map<string, ORSetElement<string>>,
      attributes: this.attributes.toJSON(),
    };
  }
}

export default CRDTDocument;
