/**
 * V183 MindAdapter - Direction A Writing Mind (Iter 29/30)
 * generic-agent: adapt to user's writing context (genre/tone/length)
 */
export type WritingContext = 'academic' | 'business' | 'creative' | 'technical' | 'casual' | 'journalistic';

export interface ContextAdaptation {
  id: string;
  context: WritingContext;
  parameters: {
    formality: number;
    sentenceLength: number;
    vocabulary: number;
    paragraphLength: number;
    examples: number;
  };
  active: boolean;
}

export interface AdapterState {
  adaptations: Map<WritingContext, ContextAdaptation>;
  currentContext: WritingContext | null;
  adaptHistory: Array<{ from: WritingContext | null; to: WritingContext; timestamp: number }>;
}

export function createAdapterState(): AdapterState {
  return { adaptations: new Map(), currentContext: null, adaptHistory: [] };
}

export function registerAdaptation(state: AdapterState, adaptation: ContextAdaptation): AdapterState {
  const adaptations = new Map(state.adaptations);
  adaptations.set(adaptation.context, adaptation);
  return { ...state, adaptations };
}

export function seedDefaultAdaptations(state: AdapterState): AdapterState {
  const defaults: ContextAdaptation[] = [
    { id: 'academic', context: 'academic', parameters: { formality: 0.9, sentenceLength: 150, vocabulary: 0.9, paragraphLength: 500, examples: 0.3 }, active: true },
    { id: 'business', context: 'business', parameters: { formality: 0.7, sentenceLength: 100, vocabulary: 0.6, paragraphLength: 300, examples: 0.5 }, active: true },
    { id: 'creative', context: 'creative', parameters: { formality: 0.3, sentenceLength: 80, vocabulary: 0.8, paragraphLength: 400, examples: 0.7 }, active: true },
    { id: 'technical', context: 'technical', parameters: { formality: 0.8, sentenceLength: 120, vocabulary: 0.85, paragraphLength: 350, examples: 0.6 }, active: true },
    { id: 'casual', context: 'casual', parameters: { formality: 0.2, sentenceLength: 60, vocabulary: 0.4, paragraphLength: 200, examples: 0.5 }, active: true },
    { id: 'journalistic', context: 'journalistic', parameters: { formality: 0.6, sentenceLength: 90, vocabulary: 0.7, paragraphLength: 250, examples: 0.8 }, active: true },
  ];
  let s = state;
  for (const a of defaults) s = registerAdaptation(s, a);
  return s;
}

export function switchContext(state: AdapterState, context: WritingContext): AdapterState {
  const from = state.currentContext;
  return {
    ...state,
    currentContext: context,
    adaptHistory: [...state.adaptHistory, { from, to: context, timestamp: Date.now() }].slice(-50),
  };
}

export function getCurrentAdaptation(state: AdapterState): ContextAdaptation | undefined {
  return state.currentContext ? state.adaptations.get(state.currentContext) : undefined;
}

export function getAdaptation(state: AdapterState, context: WritingContext): ContextAdaptation | undefined {
  return state.adaptations.get(context);
}

export function listAdaptations(state: AdapterState): ContextAdaptation[] {
  return Array.from(state.adaptations.values());
}

export function detectContext(text: string): WritingContext {
  const lower = text.toLowerCase();
  // Order matters - check more specific patterns first
  if (/\b(research|study|analysis|hypothesis|methodology|abstract)\b/.test(lower)) return 'academic';
  if (/\b(api|function|algorithm|database|server|deploy|implementation|compiler)\b/.test(lower)) return 'technical';
  if (/\b(once upon|felt|imagine|whispered|dream)\b/.test(lower)) return 'creative';
  if (/\b(hey|yeah|gonna|wanna|kinda)\b/.test(lower)) return 'casual';
  if (/\b(reported|according to|officials|spokesperson)\b/.test(lower)) return 'journalistic';
  if (/\b(revenue|stakeholder|strategy|kpi|metrics|business)\b/.test(lower)) return 'business';
  return 'business';
}

export function adaptText(state: AdapterState, text: string, targetContext: WritingContext): string {
  return `[${targetContext}] ${text}`;
}

export function getAdapterReport(state: AdapterState): { registered: number; current: WritingContext | null; history: number; byContext: Record<string, number> } {
  const byContext: Record<string, number> = {};
  for (const a of state.adaptations.values()) byContext[a.context] = (byContext[a.context] || 0) + 1;
  return { registered: state.adaptations.size, current: state.currentContext, history: state.adaptHistory.length, byContext };
}
