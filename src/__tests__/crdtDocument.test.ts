import { describe, it, expect, beforeEach } from 'vitest';
import {
  LWWRegister,
  ORSet,
  TextCRDT,
  CRDTDocument,
  type LWWEntry,
  type ORSetElement,
} from '../collab/CRDTDocument.js';

describe('LWWRegister', () => {
  it('should initialize with null value', () => {
    const reg = new LWWRegister('node1');
    expect(reg.get()).toBeUndefined();
  });

  it('should initialize with initial value', () => {
    const reg = new LWWRegister('node1', 'initial');
    expect(reg.get()).toBe('initial');
  });

  it('should set and get value', () => {
    const reg = new LWWRegister('node1');
    const result = reg.set('hello', 100);
    expect(reg.get()).toBe('hello');
    expect(result.value).toBe('hello');
    expect(result.timestamp).toBe(100);
  });

  it('should only update with higher timestamp', () => {
    const reg = new LWWRegister('node1', 'initial');
    reg.set('old', 100);
    reg.set('new', 50);
    expect(reg.get()).toBe('old');
  });

  it('should merge remote entry with higher timestamp', () => {
    const reg = new LWWRegister('node1', 'local');
    const remote: LWWEntry<string> = { value: 'remote', timestamp: 200, nodeId: 'node2' };
    const result = reg.merge(remote);
    expect(result).toBe('remote');
    expect(reg.get()).toBe('remote');
  });

  it('should not merge remote entry with lower timestamp', () => {
    const reg = new LWWRegister('node1', 'local');
    reg.set('local', 200); // Explicit set to timestamp 200
    const remote: LWWEntry<string> = { value: 'remote', timestamp: 50, nodeId: 'node2' };
    const result = reg.merge(remote);
    expect(result).toBe('local');
    expect(reg.get()).toBe('local');
  });

  it('should serialize to JSON', () => {
    const reg = new LWWRegister('node1', 'test');
    const json = reg.toJSON();
    expect(json.value).toBe('test');
    expect(json.nodeId).toBe('node1');
    expect(typeof json.timestamp).toBe('number');
  });
});

describe('ORSet', () => {
  it('should add elements', () => {
    const set = new ORSet<string>('node1');
    const id1 = set.add('item1');
    const id2 = set.add('item2');
    expect(set.has(id1)).toBe(true);
    expect(set.has(id2)).toBe(true);
  });

  it('should remove elements', () => {
    const set = new ORSet<string>('node1');
    const id = set.add('item1');
    expect(set.has(id)).toBe(true);
    set.remove(id);
    expect(set.has(id)).toBe(false);
  });

  it('should not remove already removed element', () => {
    const set = new ORSet<string>('node1');
    const id = set.add('item1');
    set.remove(id);
    const result = set.remove(id);
    expect(result).toBe(false);
  });

  it('should get element by id', () => {
    const set = new ORSet<string>('node1');
    const id = set.add('item1');
    expect(set.get(id)).toBe('item1');
  });

  it('should return undefined for removed element', () => {
    const set = new ORSet<string>('node1');
    const id = set.add('item1');
    set.remove(id);
    expect(set.get(id)).toBeUndefined();
  });

  it('should get all active elements', () => {
    const set = new ORSet<string>('node1');
    set.add('item1');
    set.add('item2');
    const all = set.getAll();
    expect(all.size).toBe(2);
  });

  it('should merge remote elements', () => {
    const local = new ORSet<string>('node1');
    // Use explicit timestamp of 100 so remote (200) wins
    const localId = local.add('localItem', 100);

    const remoteElements = new Map<string, ORSetElement<string>>();
    remoteElements.set(localId, {
      value: 'updatedItem',
      addTimestamp: 200,
      removeTimestamp: 0,
      nodeId: 'node2',
    });
    remoteElements.set('remoteId', {
      value: 'remoteItem',
      addTimestamp: 150,
      removeTimestamp: 0,
      nodeId: 'node2',
    });

    local.merge(remoteElements);
    expect(local.get(localId)).toBe('updatedItem');
    expect(local.get('remoteId')).toBe('remoteItem');
  });
});

describe('TextCRDT', () => {
  it('should insert text', () => {
    const crdt = new TextCRDT('node1');
    const op = crdt.insert(0, 'hello');
    expect(op.type).toBe('insert');
    expect(op.position).toBe(0);
    expect(op.character).toBe('hello');
  });

  it('should delete text', () => {
    const crdt = new TextCRDT('node1');
    crdt.insert(0, 'hello');
    const op = crdt.delete(0);
    expect(op.type).toBe('delete');
    expect(op.position).toBe(0);
  });

  it('should apply operations to get text', () => {
    const crdt = new TextCRDT('node1');
    crdt.insert(0, 'hello');
    crdt.insert(5, ' world');
    expect(crdt.apply(crdt.getState())).toBe('hello world');
  });

  it('should merge remote operations', () => {
    const crdt1 = new TextCRDT('node1');
    const crdt2 = new TextCRDT('node2');

    crdt1.insert(0, 'hello');

    const remoteOps = crdt2.insert(0, 'world');
    crdt2.insert(5, '!');

    crdt1.merge([remoteOps, crdt2.getState()[0]]);
    expect(crdt1.apply(crdt1.getState())).toContain('hello');
  });

  it('should track clock', () => {
    const crdt = new TextCRDT('node1');
    expect(crdt.getClock()).toBe(0);
    crdt.insert(0, 'a');
    expect(crdt.getClock()).toBe(1);
  });
});

describe('CRDTDocument', () => {
  let doc: CRDTDocument;

  beforeEach(() => {
    doc = new CRDTDocument('doc1', 'node1', 'Test Doc');
  });

  it('should create document with title', () => {
    expect(doc.getTitle()).toBe('Test Doc');
  });

  it('should set title', () => {
    doc.setTitle('New Title');
    expect(doc.getTitle()).toBe('New Title');
  });

  it('should get text', () => {
    doc.insertText(0, 'Hello');
    expect(doc.getText()).toBe('Hello');
  });

  it('should insert and delete text', () => {
    doc.insertText(0, 'Hello');
    doc.insertText(5, ' World');
    expect(doc.getText()).toBe('Hello World');

    doc.deleteText(5);
    expect(doc.getText()).toBe('Hello');
  });

  it('should add and remove tags', () => {
    const tagId = doc.addTag('important');
    expect(doc.getTags().size).toBe(1);

    doc.removeTag(tagId);
    expect(doc.getTags().size).toBe(0);
  });

  it('should set and get attributes', () => {
    doc.setAttribute('color', 'blue');
    expect(doc.getAttribute('color')).toBe('blue');
  });

  it('should increment version on changes', () => {
    const initialVersion = doc.getVersion();
    doc.setTitle('New');
    expect(doc.getVersion()).toBeGreaterThan(initialVersion);
  });

  it('should get state for sync', () => {
    doc.insertText(0, 'test');
    const state = doc.getState();
    expect(state.metadata.id).toBe('doc1');
    expect(state.text.length).toBe(1);
  });

  it('should merge remote state', () => {
    doc.insertText(0, 'original');

    const remoteState = {
      metadata: {
        id: 'doc1',
        title: { value: 'Remote Title', timestamp: 200, nodeId: 'node2' },
        createdAt: Date.now(),
        version: 5,
      },
      text: [],
      tags: new Map(),
      attributes: { value: {}, timestamp: 0, nodeId: 'node1' },
    };

    doc.mergeRemote(remoteState);
    expect(doc.getTitle()).toBe('Remote Title');
  });
});
