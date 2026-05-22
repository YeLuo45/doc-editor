// DocumentContext - Document metadata and state tracking

import { storageAdapter } from './storage/LocalStorageAdapter';

export interface DocumentMetadata {
  title: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface DocumentContextData {
  metadata: DocumentMetadata;
  content: string;
  version: number;
}

export class DocumentContext {
  private _metadata: DocumentMetadata;
  private _content: string;
  private _version: number;
  private _dirty: boolean;
  private _docId: string;

  constructor(docId: string, metadata?: Partial<DocumentMetadata>, content = '') {
    this._docId = docId;
    this._metadata = {
      title: metadata?.title || 'Untitled Document',
      author: metadata?.author || 'Unknown Author',
      createdAt: metadata?.createdAt || Date.now(),
      updatedAt: metadata?.updatedAt || Date.now(),
      tags: metadata?.tags || [],
    };
    this._content = content;
    this._version = 1;
    this._dirty = false;
  }

  get metadata(): DocumentMetadata {
    return { ...this._metadata };
  }

  get content(): string {
    return this._content;
  }

  get version(): number {
    return this._version;
  }

  get isDirty(): boolean {
    return this._dirty;
  }

  get docId(): string {
    return this._docId;
  }

  setMetadata(updates: Partial<DocumentMetadata>): void {
    this._metadata = {
      ...this._metadata,
      ...updates,
      updatedAt: Date.now(),
    };
    this._dirty = true;
  }

  setContent(content: string): void {
    if (content !== this._content) {
      this._content = content;
      this._metadata.updatedAt = Date.now();
      this._dirty = true;
    }
  }

  markClean(): void {
    this._dirty = false;
  }

  incrementVersion(): void {
    this._version++;
    this._dirty = true;
  }

  toJSON(): DocumentContextData {
    return {
      metadata: { ...this._metadata },
      content: this._content,
      version: this._version,
    };
  }

  static fromJSON(docId: string, data: DocumentContextData): DocumentContext {
    const ctx = new DocumentContext(
      docId,
      data.metadata,
      data.content
    );
    ctx._version = data.version;
    ctx._dirty = false;
    return ctx;
  }

  // Persist to localStorage
  save(): void {
    storageAdapter.set(`doc:${this._docId}`, this.toJSON());
    this.markClean();
  }

  // Load from localStorage
  static load(docId: string): DocumentContext | null {
    const data = storageAdapter.get(`doc:${docId}`) as DocumentContextData | null;
    if (data) {
      return DocumentContext.fromJSON(docId, data);
    }
    return null;
  }
}
