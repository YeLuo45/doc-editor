/**
 * V188 AgentTester - Direction B Agent Forge (Iter 4/30)
 * thunderbolt: Test sandbox for agent execution with sample inputs
 */
export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput?: string;
  tags: string[];
}

export interface TestResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  duration: number;
  error?: string;
  timestamp: number;
}

export interface TesterState {
  cases: Map<string, TestCase>;
  results: TestResult[];
  lastRunAt: number;
  totalRuns: number;
}

let counter = 0;
function nextId(): string { return `tc-${++counter}-${Date.now()}`; }

export function createTesterState(): TesterState {
  return { cases: new Map(), results: [], lastRunAt: 0, totalRuns: 0 };
}

export function addTestCase(state: TesterState, testCase: Omit<TestCase, 'id'>): TesterState {
  const id = nextId();
  return { ...state, cases: new Map(state.cases).set(id, { ...testCase, id }) };
}

export function removeTestCase(state: TesterState, id: string): TesterState {
  const cases = new Map(state.cases);
  cases.delete(id);
  return { ...state, cases };
}

export function listTestCases(state: TesterState): TestCase[] {
  return Array.from(state.cases.values());
}

export function findTestCasesByTag(state: TesterState, tag: string): TestCase[] {
  return Array.from(state.cases.values()).filter(tc => tc.tags.includes(tag));
}

export function runTestCase(state: TesterState, id: string, agentFn: (input: string) => string | Promise<string>): Promise<{ state: TesterState; result: TestResult }> {
  const tc = state.cases.get(id);
  if (!tc) return Promise.resolve({ state, result: { testCaseId: id, passed: false, actualOutput: '', duration: 0, error: 'not found', timestamp: Date.now() } });
  const start = Date.now();
  return Promise.resolve(agentFn(tc.input)).then(output => {
    const result: TestResult = {
      testCaseId: id,
      passed: tc.expectedOutput ? output === tc.expectedOutput : true,
      actualOutput: output,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
    return { state: { ...state, results: [...state.results, result].slice(-500), lastRunAt: Date.now(), totalRuns: state.totalRuns + 1 }, result };
  });
}

export function runAllTestCases(state: TesterState, agentFn: (input: string) => string | Promise<string>): Promise<{ state: TesterState; results: TestResult[] }> {
  const cases = Array.from(state.cases.values());
  // Chain state through each call so totalRuns accumulates
  return cases.reduce<Promise<{ state: TesterState; results: TestResult[] }>>(
    (p, tc) => p.then(async (acc) => {
      const r = await runTestCase(acc.state, tc.id, agentFn);
      return { state: r.state, results: [...acc.results, r.result] };
    }),
    Promise.resolve({ state, results: [] })
  );
}

export function getTestResultByCase(state: TesterState, caseId: string): TestResult[] {
  return state.results.filter(r => r.testCaseId === caseId);
}

export function clearResults(state: TesterState): TesterState {
  return { ...state, results: [] };
}

export function getTesterReport(state: TesterState): { cases: number; runs: number; passRate: number; avgDuration: number } {
  const passCount = state.results.filter(r => r.passed).length;
  const passRate = state.results.length > 0 ? passCount / state.results.length : 0;
  const avgDuration = state.results.length > 0 ? state.results.reduce((a, b) => a + b.duration, 0) / state.results.length : 0;
  return { cases: state.cases.size, runs: state.totalRuns, passRate, avgDuration };
}
