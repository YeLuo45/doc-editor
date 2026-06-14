/**
 * V188 AgentTester Tests - Direction B Agent Forge (Iter 4/30)
 */
import { describe, it, expect } from 'vitest';
import {
  createTesterState, addTestCase, removeTestCase, listTestCases,
  findTestCasesByTag, runTestCase, runAllTestCases, getTestResultByCase, clearResults, getTesterReport,
} from '../../forge/V188-AgentTester';

describe('V188 AgentTester', () => {
  it('should create empty state', () => {
    const s = createTesterState();
    expect(s.cases.size).toBe(0);
    expect(s.results).toHaveLength(0);
  });

  it('should add test case', () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'hello', expectedOutput: 'world', tags: ['basic'] });
    expect(s.cases.size).toBe(1);
  });

  it('should remove test case', () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'hi', tags: [] });
    const id = s.cases.keys().next().value as string;
    s = removeTestCase(s, id);
    expect(s.cases.size).toBe(0);
  });

  it('should list test cases', () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'a', tags: [] });
    s = addTestCase(s, { name: 't2', input: 'b', tags: [] });
    expect(listTestCases(s)).toHaveLength(2);
  });

  it('should find test cases by tag', () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'a', tags: ['edge'] });
    s = addTestCase(s, { name: 't2', input: 'b', tags: ['basic'] });
    expect(findTestCasesByTag(s, 'edge')).toHaveLength(1);
  });

  it('should run test case', async () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'hello', expectedOutput: 'world', tags: [] });
    const id = s.cases.keys().next().value as string;
    const { result, state } = await runTestCase(s, id, (input: string) => input === 'hello' ? 'world' : 'other');
    s = state;
    expect(result.passed).toBe(true);
    expect(result.actualOutput).toBe('world');
  });

  it('should fail test when output mismatches', async () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'hello', expectedOutput: 'world', tags: [] });
    const id = s.cases.keys().next().value as string;
    const { result, state } = await runTestCase(s, id, () => 'other');
    s = state;
    expect(result.passed).toBe(false);
  });

  it('should run all test cases', async () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'a', tags: [] });
    s = addTestCase(s, { name: 't2', input: 'b', tags: [] });
    const { state: newState, results } = await runAllTestCases(s, (input: string) => `out-${input}`);
    s = newState;
    expect(results).toHaveLength(2);
    expect(s.totalRuns).toBe(2);
  });

  it('should get test result by case', async () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'a', tags: [] });
    const id = s.cases.keys().next().value as string;
    const { state: newState } = await runTestCase(s, id, () => 'out');
    s = newState;
    const results = getTestResultByCase(s, id);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should clear results', async () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'a', tags: [] });
    const id = s.cases.keys().next().value as string;
    const { state: newState } = await runTestCase(s, id, () => 'out');
    s = newState;
    s = clearResults(s);
    expect(s.results).toHaveLength(0);
  });

  it('should produce report', async () => {
    let s = createTesterState();
    s = addTestCase(s, { name: 't1', input: 'a', expectedOutput: 'x', tags: [] });
    const id = s.cases.keys().next().value as string;
    const { state: newState } = await runTestCase(s, id, () => 'x');
    s = newState;
    const r = getTesterReport(s);
    expect(r.cases).toBe(1);
    expect(r.passRate).toBe(1);
  });
});
