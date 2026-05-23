import { create } from 'zustand';
import type { AgentId, AgentMessage, Workflow } from '../agents/types';

interface WorkflowState {
  workflow: Workflow | null;
  currentStageIndex: number;
  agentStates: Map<AgentId, 'idle' | 'working' | 'done' | 'error'>;
  messages: AgentMessage[];
  isExecuting: boolean;
  result: string;
  
  setWorkflow: (wf: Workflow) => void;
  advanceStage: () => void;
  setAgentState: (id: AgentId, state: 'idle' | 'working' | 'done' | 'error') => void;
  addMessage: (msg: AgentMessage) => void;
  setExecuting: (v: boolean) => void;
  setResult: (s: string) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflow: null,
  currentStageIndex: -1,
  agentStates: new Map(),
  messages: [],
  isExecuting: false,
  result: '',
  
  setWorkflow: (wf) => set({ workflow: wf }),
  advanceStage: () => set((s) => ({ currentStageIndex: s.currentStageIndex + 1 })),
  setAgentState: (id, state) => set((s) => {
    const newStates = new Map(s.agentStates);
    newStates.set(id, state);
    return { agentStates: newStates };
  }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setExecuting: (v) => set({ isExecuting: v }),
  setResult: (r) => set({ result: r }),
  reset: () => set({
    currentStageIndex: -1,
    agentStates: new Map(),
    messages: [],
    isExecuting: false,
    result: '',
  }),
}));