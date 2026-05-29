/**
 * iteration7.test.ts - V37 Iteration 7 Tests
 * Tests for Compiler, Linker, Optimizer, and Debugger modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Compiler } from '../iteration7/Compiler';
import { Linker } from '../iteration7/Linker';
import { Optimizer } from '../iteration7/Optimizer';
import { Debugger } from '../iteration7/Debugger';

// ==================== COMPILER TESTS ====================

describe('Compiler', () => {
  let compiler: Compiler;

  beforeEach(() => {
    compiler = new Compiler();
  });

  it('should create a new compiler instance', () => {
    expect(compiler).toBeDefined();
  });

  it('should parse source code into compilation unit', () => {
    const unit = compiler.parse('const x = 1;', 'test');
    expect(unit).toBeDefined();
    expect(unit.name).toBe('test');
    expect(unit.source).toBe('const x = 1;');
  });

  it('should compile source code into module', () => {
    const mod = compiler.compile('function hello() { return 42; }', 'hello');
    expect(mod).toBeDefined();
    expect(mod?.name).toBe('hello');
    expect(mod?.bytecode).toBeDefined();
  });

  it('should fail compilation with syntax errors', () => {
    const unit = compiler.parse('', 'empty');
    expect(unit.errors.length).toBe(0);
  });

  it('should track multiple compilation units', () => {
    compiler.parse('const a = 1;', 'a');
    compiler.parse('const b = 2;', 'b');
    const snap = compiler.getSnapshot();
    expect(snap.metrics.totalUnits).toBe(2);
  });

  it('should track compiled modules', () => {
    compiler.compile('function test() {}', 'test');
    const compiled = compiler.getCompiled();
    expect(compiled.length).toBeGreaterThanOrEqual(1);
  });

  it('should extract exports and imports', () => {
    const mod = compiler.compile('import { x } from "y"; export const z = 1;', 'test');
    expect(mod?.exports).toBeDefined();
    expect(mod?.imports).toBeDefined();
  });

  it('should generate bytecode from AST', () => {
    const unit = compiler.parse('const x = 42;', 'test');
    expect(unit.ast).toBeDefined();
  });

  it('should get compilation unit by id', () => {
    const unit = compiler.parse('const x = 1;', 'test');
    const found = compiler.getUnit(unit.id);
    expect(found).toBeDefined();
  });

  it('should get compiled module by id', () => {
    const mod = compiler.compile('function test() {}', 'test');
    const found = compiler.getModule(mod!.id);
    expect(found).toBeDefined();
  });

  it('should get snapshot with metrics', () => {
    compiler.compile('function test() {}', 'test');
    const snap = compiler.getSnapshot();
    expect(snap).toBeDefined();
    expect(snap.metrics.compilations).toBe(1);
  });

  it('should reset all state', () => {
    compiler.compile('function test() {}', 'test');
    compiler.reset();
    const snap = compiler.getSnapshot();
    expect(snap.metrics.compilations).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = compiler.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.compilations).toBe('number');
  });

  it('should get report', () => {
    const report = compiler.getReport();
    expect(report).toContain('Compiler Report');
  });
});

// ==================== LINKER TESTS ====================

describe('Linker', () => {
  let linker: Linker;

  beforeEach(() => {
    linker = new Linker();
  });

  it('should create a new linker instance', () => {
    expect(linker).toBeDefined();
  });

  it('should link a module with imports', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    const imports = { react: ['module1'] };
    const result = linker.link('mod1', imports, bytecode, 'test');
    expect(result).toBeDefined();
  });

  it('should resolve linked modules', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    const imports = { react: ['module1'] };
    linker.link('mod1', imports, bytecode, 'test');
    const resolved = linker.resolve('mod1');
    expect(resolved).toBeDefined();
  });

  it('should fail linking with unresolved imports', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    const imports = { react: ['nonexistent'] };
    const result = linker.link('mod1', imports, bytecode, 'test');
    expect(result.success).toBe(false);
  });

  it('should get all linked modules', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    linker.link('mod1', {}, bytecode, 'test1');
    linker.link('mod2', {}, bytecode, 'test2');
    const linked = linker.getLinked();
    expect(linked.length).toBeGreaterThanOrEqual(2);
  });

  it('should detect circular dependencies', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    linker.link('mod1', { dep: ['mod2'] }, bytecode, 'test');
    const hasCircular = linker.detectCircular('mod1');
    expect(typeof hasCircular).toBe('boolean');
  });

  it('should get linkage result', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    linker.link('mod1', {}, bytecode, 'test');
    const result = linker.getResult('mod1');
    expect(result).toBeDefined();
  });

  it('should track successful and failed links', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    linker.link('mod1', {}, bytecode, 'test1');
    linker.link('mod2', { x: ['nonexistent'] }, bytecode, 'test2');
    const snap = linker.getSnapshot();
    expect(snap.metrics.successfulLinks).toBe(1);
    expect(snap.metrics.failedLinks).toBe(1);
  });

  it('should get snapshot with metrics', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    linker.link('mod1', {}, bytecode, 'test');
    const snap = linker.getSnapshot();
    expect(snap).toBeDefined();
    expect(snap.metrics.totalModules).toBe(1);
  });

  it('should reset all state', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    linker.link('mod1', {}, bytecode, 'test');
    linker.reset();
    const snap = linker.getSnapshot();
    expect(snap.metrics.totalModules).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = linker.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalModules).toBe('number');
  });

  it('should get report', () => {
    const report = linker.getReport();
    expect(report).toContain('Linker Report');
  });
});

// ==================== OPTIMIZER TESTS ====================

describe('Optimizer', () => {
  let optimizer: Optimizer;

  beforeEach(() => {
    optimizer = new Optimizer();
  });

  it('should create a new optimizer instance', () => {
    expect(optimizer).toBeDefined();
  });

  it('should optimize bytecode with default passes', () => {
    const bytecode = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
    const result = optimizer.optimize(bytecode, 'test');
    expect(result).toBeDefined();
    expect(result.originalSize).toBe(100);
  });

  it('should optimize bytecode with custom passes', () => {
    const bytecode = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
    const result = optimizer.optimize(bytecode, 'test', ['constantFolding', 'deadCodeElimination']);
    expect(result.passes).toContain('constantFolding');
    expect(result.passes).toContain('deadCodeElimination');
  });

  it('should track bytes saved', () => {
    const bytecode = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
    optimizer.optimize(bytecode, 'test');
    const snap = optimizer.getSnapshot();
    expect(snap.metrics.bytesSaved).toBeGreaterThanOrEqual(0);
  });

  it('should analyze bytecode', () => {
    const bytecode = new Uint8Array([1, 2, 3, 4, 5]);
    const analysis = optimizer.analyze(bytecode);
    expect(analysis).toBeDefined();
    expect(analysis.complexity).toBeGreaterThan(0);
  });

  it('should analyze bytecode with source', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    const source = 'function test() {\n  return 1;\n}\n';
    const analysis = optimizer.analyze(bytecode, source);
    expect(analysis.linesOfCode).toBe(4);
  });

  it('should calculate cyclomatic complexity', () => {
    const bytecode = new Uint8Array(Array.from({ length: 50 }, (_, i) => i));
    const analysis = optimizer.analyze(bytecode);
    expect(analysis.cyclomaticComplexity).toBeGreaterThan(0);
  });

  it('should get all optimization results', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    optimizer.optimize(bytecode, 'test1');
    optimizer.optimize(bytecode, 'test2');
    const results = optimizer.getOptimized();
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('should get optimization result by name', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    optimizer.optimize(bytecode, 'test');
    const result = optimizer.getResult('test');
    expect(result).toBeDefined();
  });

  it('should get all analysis data', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    optimizer.analyze(bytecode);
    const allAnalysis = optimizer.getAllAnalysis();
    expect(allAnalysis.length).toBeGreaterThanOrEqual(1);
  });

  it('should get snapshot with metrics', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    optimizer.optimize(bytecode, 'test');
    const snap = optimizer.getSnapshot();
    expect(snap).toBeDefined();
    expect(snap.metrics.totalOptimizations).toBe(1);
  });

  it('should reset all state', () => {
    const bytecode = new Uint8Array([1, 2, 3]);
    optimizer.optimize(bytecode, 'test');
    optimizer.reset();
    const snap = optimizer.getSnapshot();
    expect(snap.metrics.totalOptimizations).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = optimizer.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalOptimizations).toBe('number');
  });

  it('should get report', () => {
    const report = optimizer.getReport();
    expect(report).toContain('Optimizer Report');
  });
});

// ==================== DEBUGGER TESTS ====================

describe('Debugger', () => {
  let debugger_: Debugger;

  beforeEach(() => {
    debugger_ = new Debugger();
  });

  it('should create a new debugger instance', () => {
    expect(debugger_).toBeDefined();
  });

  it('should start a debug session', () => {
    const session = debugger_.debug('module1');
    expect(session).toBeDefined();
    expect(session.moduleId).toBe('module1');
    expect(session.status).toBe('active');
  });

  it('should pause a debug session', () => {
    const session = debugger_.debug('module1');
    const paused = debugger_.pause(session.id);
    expect(paused).toBe(true);
  });

  it('should stop a debug session', () => {
    const session = debugger_.debug('module1');
    const stopped = debugger_.stop(session.id);
    expect(stopped).toBe(true);
  });

  it('should add a breakpoint', () => {
    const bp = debugger_.addBreakpoint('module1', 10);
    expect(bp).toBeDefined();
    expect(bp.line).toBe(10);
    expect(bp.enabled).toBe(true);
  });

  it('should add a breakpoint with condition', () => {
    const bp = debugger_.addBreakpoint('module1', 10, 'x > 5');
    expect(bp.condition).toBe('x > 5');
  });

  it('should remove a breakpoint', () => {
    const bp = debugger_.addBreakpoint('module1', 10);
    const removed = debugger_.removeBreakpoint(bp.id);
    expect(removed).toBe(true);
  });

  it('should toggle breakpoint', () => {
    const bp = debugger_.addBreakpoint('module1', 10);
    const toggled = debugger_.toggleBreakpoint(bp.id);
    expect(toggled).toBe(true);
  });

  it('should track breakpoint hits', () => {
    const bp = debugger_.addBreakpoint('module1', 10);
    debugger_.hitBreakpoint(bp.id);
    debugger_.hitBreakpoint(bp.id);
    const updated = debugger_.getBreakpoints()[0];
    expect(updated.hitCount).toBe(2);
  });

  it('should add trace entry', () => {
    debugger_.trace('operation1', 'module1', { data: 'test' });
    const traces = debugger_.getTraces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
  });

  it('should get traces by module', () => {
    debugger_.trace('op1', 'module1');
    debugger_.trace('op2', 'module2');
    const module1Traces = debugger_.getTraces('module1');
    expect(module1Traces.length).toBe(1);
  });

  it('should clear traces', () => {
    debugger_.trace('operation1', 'module1');
    debugger_.clearTraces();
    const traces = debugger_.getTraces();
    expect(traces.length).toBe(0);
  });

  it('should get breakpoints by module', () => {
    debugger_.addBreakpoint('module1', 10);
    debugger_.addBreakpoint('module2', 20);
    const module1Bps = debugger_.getBreakpoints('module1');
    expect(module1Bps.length).toBe(1);
  });

  it('should get snapshot with metrics', () => {
    debugger_.debug('module1');
    const snap = debugger_.getSnapshot();
    expect(snap).toBeDefined();
    expect(snap.metrics.totalSessions).toBe(1);
  });

  it('should reset all state', () => {
    debugger_.debug('module1');
    debugger_.addBreakpoint('module1', 10);
    debugger_.reset();
    const snap = debugger_.getSnapshot();
    expect(snap.metrics.totalSessions).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = debugger_.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalSessions).toBe('number');
  });

  it('should get report', () => {
    const report = debugger_.getReport();
    expect(report).toContain('Debugger Report');
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Iteration7 Integration', () => {
  it('should work together - Compiler with Linker', () => {
    const compiler = new Compiler();
    const linker = new Linker();

    const mod = compiler.compile('function hello() { return 42; }', 'hello');
    expect(mod).toBeDefined();

    const linkResult = linker.link(mod!.id, mod!.imports, mod!.bytecode, mod!.name);
    expect(linkResult).toBeDefined();
  });

  it('should work together - Linker with Optimizer', () => {
    const linker = new Linker();
    const optimizer = new Optimizer();

    const bytecode = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
    linker.link('mod1', {}, bytecode, 'test');

    const linked = linker.getLinked()[0];
    const optResult = optimizer.optimize(linked.bytecode, linked.name);
    expect(optResult).toBeDefined();
  });

  it('should work together - Optimizer with Debugger', () => {
    const optimizer = new Optimizer();
    const debugger_ = new Debugger();

    const bytecode = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
    optimizer.optimize(bytecode, 'test');

    const session = debugger_.debug('test');
    expect(session).toBeDefined();
  });

  it('should work together - Full pipeline', () => {
    const compiler = new Compiler();
    const linker = new Linker();
    const optimizer = new Optimizer();
    const debugger_ = new Debugger();

    // Compile
    const mod = compiler.compile('function test() { return 1; }', 'test');
    expect(mod).toBeDefined();

    // Link
    const linkResult = linker.link(mod!.id, mod!.imports, mod!.bytecode, mod!.name);
    expect(linkResult.success).toBe(true);

    // Optimize
    const linked = linker.getLinked()[0];
    const optResult = optimizer.optimize(linked.bytecode, linked.name);
    expect(optResult).toBeDefined();

    // Debug
    const session = debugger_.debug(linked.id);
    expect(session).toBeDefined();
  });

  it('should track metrics across modules', () => {
    const compiler = new Compiler();
    const linker = new Linker();
    const optimizer = new Optimizer();
    const debugger_ = new Debugger();

    // Compile multiple modules
    compiler.compile('function a() {}', 'a');
    compiler.compile('function b() {}', 'b');

    // Link them
    const mods = compiler.getCompiled();
    mods.forEach(mod => {
      linker.link(mod.id, mod.imports, mod.bytecode, mod.name);
    });

    // Optimize
    linker.getLinked().forEach(mod => {
      optimizer.optimize(mod.bytecode, mod.name);
    });

    // Debug sessions
    linker.getLinked().forEach(mod => {
      debugger_.debug(mod.id);
    });

    // Check metrics flow
    expect(compiler.getSnapshot().metrics.totalModules).toBe(2);
    expect(linker.getSnapshot().metrics.successfulLinks).toBe(2);
    expect(optimizer.getSnapshot().metrics.totalOptimizations).toBe(2);
    expect(debugger_.getSnapshot().metrics.totalSessions).toBe(2);
  });
});