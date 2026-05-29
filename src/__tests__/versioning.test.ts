/**
 * V58 Versioning System - Test Suite
 */

import { VersionManager } from '../versioning/VersionManager';
import { BranchManager } from '../versioning/BranchManager';
import { DiffEngine } from '../versioning/DiffEngine';
import { MergeEngine } from '../versioning/MergeEngine';

describe('VersionManager', () => {
  let vm: VersionManager;

  beforeEach(() => {
    vm = new VersionManager({ maxHistory: 50 });
  });

  afterEach(() => {
    vm.reset();
  });

  test('should create version with snapshot', () => {
    const version = vm.create('Hello World', 'Initial');
    expect(version).toBeDefined();
    expect(version.name).toBe('Initial');
    expect(version.id).toMatch(/^v/);
    expect(version.snapshotId).toMatch(/^snap_/);
  });

  test('should create snapshot independently', () => {
    const snap = vm.snapshot('Test content', { type: 'test' });
    expect(snap).toBeDefined();
    expect(snap.content).toBe('Test content');
    expect(snap.metadata.type).toBe('test');
  });

  test('should revert to previous version', () => {
    const v1 = vm.create('Content A', 'V1');
    vm.create('Content B', 'V2');
    const result = vm.revert(v1.id);
    expect(result).toBe(true);
    expect(vm.getCurrentVersion()?.id).toBe(v1.id);
  });

  test('should return history with limit', () => {
    vm.create('A', 'V1');
    vm.create('B', 'V2');
    vm.create('C', 'V3');
    const history = vm.getHistory(2);
    expect(history.length).toBe(2);
  });

  test('should get version by id', () => {
    const created = vm.create('Test', 'TestVersion');
    const found = vm.getVersion(created.id);
    expect(found?.id).toBe(created.id);
  });

  test('should get snapshot by id', () => {
    const snap = vm.snapshot('Test content');
    const found = vm.retrieveSnapshot(snap.id);
    expect(found?.content).toBe('Test content');
  });

  test('should get snapshot metrics', () => {
    vm.create('A', 'V1');
    vm.create('B', 'V2');
    const metrics = vm.getSnapshot();
    expect(metrics.totalVersions).toBe(2);
    expect(metrics.totalSnapshots).toBe(2);
  });

  test('should reset all data', () => {
    vm.create('A', 'V1');
    vm.reset();
    const metrics = vm.getSnapshot();
    expect(metrics.totalVersions).toBe(0);
    expect(metrics.historySize).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = vm.exportMetrics();
    expect(metrics.version).toBe('V58-VersionManager');
    expect(metrics.metrics.versions).toBe(0);
  });

  test('should generate report', () => {
    const report = vm.getReport();
    expect(report).toContain('VersionManager Report');
  });
});

describe('BranchManager', () => {
  let bm: BranchManager;

  beforeEach(() => {
    bm = new BranchManager({ maxBranches: 10 });
  });

  afterEach(() => {
    bm.reset();
  });

  test('should create branch', () => {
    const branch = bm.create('feature-x');
    expect(branch).toBeDefined();
    expect(branch.name).toBe('feature-x');
    expect(branch.id).toMatch(/^br_/);
  });

  test('should delete branch', () => {
    const branch = bm.create('feature-x');
    const result = bm.delete(branch.id);
    expect(result).toBe(true);
    expect(bm.getById(branch.id)).toBeUndefined();
  });

  test('should switch branch', () => {
    const newBranch = bm.create('feature-x');
    const result = bm.switch(newBranch.id);
    expect(result).toBe(true);
    expect(bm.getCurrentBranch()?.id).toBe(newBranch.id);
  });

  test('should get all branches', () => {
    bm.create('feature-a');
    bm.create('feature-b');
    const branches = bm.getBranches();
    expect(branches.length).toBe(3); // including default 'main'
  });

  test('should get branch by name', () => {
    bm.create('feature-x');
    const branch = bm.getByName('feature-x');
    expect(branch?.name).toBe('feature-x');
  });

  test('should set branch head', () => {
    const branch = bm.create('feature-x');
    bm.setBranchHead(branch.id, 'v123');
    expect(bm.getById(branch.id)?.headVersionId).toBe('v123');
  });

  test('should get snapshot metrics', () => {
    bm.create('feature-a');
    const metrics = bm.getSnapshot();
    expect(metrics.totalBranches).toBe(2);
  });

  test('should reset branches', () => {
    bm.create('feature-a');
    bm.reset();
    const metrics = bm.getSnapshot();
    expect(metrics.totalBranches).toBe(1); // just default branch
  });

  test('should export metrics', () => {
    const metrics = bm.exportMetrics();
    expect(metrics.version).toBe('V58-BranchManager');
    expect(metrics.metrics.branches).toBe(1);
  });

  test('should generate report', () => {
    const report = bm.getReport();
    expect(report).toContain('BranchManager Report');
  });
});

describe('DiffEngine', () => {
  let de: DiffEngine;

  beforeEach(() => {
    de = new DiffEngine({ contextLines: 3 });
  });

  afterEach(() => {
    de.reset();
  });

  test('should compute diff for identical text', () => {
    const result = de.compute('Hello\nWorld', 'Hello\nWorld');
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
  });

  test('should compute diff with changes', () => {
    const result = de.compute('Hello\nWorld', 'Hello\nUniverse');
    expect(result.deletions).toBe(1);
    expect(result.additions).toBe(1);
  });

  test('should apply diff to original', () => {
    const original = 'Line 1\nLine 2\nLine 3';
    const diff = de.compute(original, 'Line 1\nModified\nLine 3');
    const applied = de.apply(original, diff);
    expect(applied).toContain('Modified');
  });

  test('should get changes from diff', () => {
    de.compute('A\nB', 'A\nC');
    const changes = de.getChanges();
    expect(changes.length).toBeGreaterThan(0);
  });

  test('should handle empty old text', () => {
    const result = de.compute('', 'New content');
    expect(result.additions).toBe(1);
  });

  test('should handle empty new text', () => {
    const result = de.compute('Old content', '');
    expect(result.deletions).toBe(1);
  });

  test('should ignore whitespace when configured', () => {
    const de2 = new DiffEngine({ ignoreWhitespace: true });
    const result = de2.compute('  Hello  ', 'Hello');
    expect(result.deletions).toBe(0);
    expect(result.additions).toBe(0);
  });

  test('should get snapshot metrics', () => {
    de.compute('A', 'B');
    const metrics = de.getSnapshot();
    expect(metrics.historySize).toBe(1);
  });

  test('should export metrics', () => {
    const metrics = de.exportMetrics();
    expect(metrics.version).toBe('V58-DiffEngine');
  });

  test('should generate report', () => {
    const report = de.getReport();
    expect(report).toContain('DiffEngine Report');
  });
});

describe('MergeEngine', () => {
  let me: MergeEngine;

  beforeEach(() => {
    me = new MergeEngine({ conflictStrategy: 'manual' });
  });

  afterEach(() => {
    me.reset();
  });

  test('should merge identical content', () => {
    const result = me.merge('Same', 'Same');
    expect(result.success).toBe(true);
    expect(result.conflicts.length).toBe(0);
  });

  test('should merge different content without base', () => {
    const result = me.merge('Ours\nLine 2', 'Theirs\nLine 2');
    expect(result.conflicts.length).toBe(1);
    expect(result.unresolved).toBe(1);
  });

  test('should merge with base (three-way)', () => {
    // When base is different from both ours and theirs, three-way merge is used
    const result = me.merge('Old', 'New Ours', 'Old Base');
    expect(result).toBeDefined();
    expect(result.conflicts).toBeDefined();
  });

  test('should resolve conflict', () => {
    me.merge('A', 'B');
    const resolved = me.resolve(0, 'Resolved content');
    expect(resolved).toBe(true);
  });

  test('should get conflicts', () => {
    me.merge('A', 'B');
    const conflicts = me.getConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
  });

  test('should check if has conflicts', () => {
    me.merge('A', 'B');
    expect(me.hasConflicts()).toBe(true);
  });

  test('should get conflict count', () => {
    me.merge('Line 1\nLine 2', 'Line A\nLine B');
    expect(me.getConflictCount()).toBe(2);
  });

  test('should get snapshot metrics', () => {
    me.merge('A', 'B');
    const metrics = me.getSnapshot();
    expect(metrics.activeMerges).toBe(1);
  });

  test('should export metrics', () => {
    const metrics = me.exportMetrics();
    expect(metrics.version).toBe('V58-MergeEngine');
  });

  test('should generate report', () => {
    const report = me.getReport();
    expect(report).toContain('MergeEngine Report');
  });

  test('should clear conflicts', () => {
    me.merge('A', 'B');
    me.clearConflicts();
    expect(me.getConflictCount()).toBe(0);
  });

  test('should handle auto-resolve with ours strategy', () => {
    const me2 = new MergeEngine({ conflictStrategy: 'ours', autoResolve: true });
    // Create actual conflict: both diverge from base differently
    const result = me2.merge('Old\nBase\nEnd', 'New\nBase\nEnd', 'Old\nBase\nChanged');
    expect(result.resolved).toBeGreaterThanOrEqual(0);
  });
});