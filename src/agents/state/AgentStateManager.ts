// AgentStateManager - Manages agent states with pub/sub pattern

import { AgentState, AgentStatus, AGENT_IDS } from './AgentState';
import { storageAdapter } from '../../context/storage/LocalStorageAdapter';

const STATE_KEY = 'agent:states';

type StateChangeCallback = (state: AgentState) => void;

class AgentStateManagerImpl {
  private states: Map<string, AgentState>;
  private subscribers: Map<string, Set<StateChangeCallback>>;
  private persistKey: string;

  constructor() {
    this.states = new Map();
    this.subscribers = new Map();
    this.persistKey = STATE_KEY;
    this.initializeStates();
  }

  private initializeStates(): void {
    // Initialize default states for all agents
    Object.values(AGENT_IDS).forEach(id => {
      if (!this.states.has(id)) {
        const state: AgentState = {
          id,
          status: 'idle',
          lastUpdate: Date.now(),
        };
        this.states.set(id, state);
      }
    });
  }

  private loadStates(): void {
    const saved = storageAdapter.get(this.persistKey) as Record<string, AgentState> | null;
    if (saved) {
      Object.entries(saved).forEach(([id, state]) => {
        this.states.set(id, state);
      });
    }
  }

  private persistStates(): void {
    const obj: Record<string, AgentState> = {};
    this.states.forEach((state, id) => {
      obj[id] = state;
    });
    storageAdapter.set(this.persistKey, obj);
  }

  getState(agentId: string): AgentState {
    const state = this.states.get(agentId);
    if (!state) {
      const newState: AgentState = {
        id: agentId,
        status: 'idle',
        lastUpdate: Date.now(),
      };
      this.states.set(agentId, newState);
      return newState;
    }
    return { ...state };
  }

  updateState(agentId: string, patch: Partial<AgentState>): void {
    const current = this.getState(agentId);
    const updated: AgentState = {
      ...current,
      ...patch,
      id: agentId,
      lastUpdate: Date.now(),
    };
    this.states.set(agentId, updated);
    this.persistStates();
    this.notifySubscribers(agentId, updated);
  }

  subscribe(agentId: string, callback: StateChangeCallback): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }
    this.subscribers.get(agentId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(agentId);
      if (subs) {
        subs.delete(callback);
      }
    };
  }

  private notifySubscribers(agentId: string, state: AgentState): void {
    const subs = this.subscribers.get(agentId);
    if (subs) {
      subs.forEach(cb => cb(state));
    }
  }

  getAllStates(): AgentState[] {
    const result: AgentState[] = [];
    this.states.forEach(state => {
      result.push({ ...state });
    });
    return result;
  }

  resetState(agentId: string): void {
    this.updateState(agentId, {
      status: 'idle',
      currentTask: undefined,
    });
  }

  resetAllStates(): void {
    Object.values(AGENT_IDS).forEach(id => {
      this.resetState(id);
    });
  }
}

export const agentStateManager = new AgentStateManagerImpl();
