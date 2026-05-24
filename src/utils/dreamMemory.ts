// Dream two-phase memory system
import { create } from 'zustand';

export type DreamPhase = 'wake' | 'dream';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const DREAM_THRESHOLD_MESSAGES = 50;
const IDLE_THRESHOLD_MS = 30000;
const TOKEN_THRESHOLD = 80000;
const TOKENS_PER_CHAR = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKENS_PER_CHAR);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function summarizeMessages(messages: Message[]): string {
  if (messages.length === 0) return '';
  const content = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  if (content.length <= 400) return content;
  return content.slice(0, 200) + '...[compressed]...' + content.slice(-200);
}

class DreamMemoryImpl {
  private messages: Message[] = [];
  private lastActivity = Date.now();
  private dreamCount = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private phaseHandler?: (phase: DreamPhase) => void;

  constructor() {
    this.load();
  }

  setPhaseHandler(handler: (phase: DreamPhase) => void) {
    this.phaseHandler = handler;
  }

  wake(message: Message) {
    this.messages.push(message);
    this.lastActivity = Date.now();
    this.resetIdleTimer();
    if (this.messages.length >= DREAM_THRESHOLD_MESSAGES) {
      this.triggerDream();
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.messages.length > 5) this.triggerDream();
    }, IDLE_THRESHOLD_MS);
  }

  private triggerDream() {
    this.phaseHandler?.('dream');
    if (this.messages.length > 20) {
      const recent = this.messages.slice(-20);
      const oldMessages = this.messages.slice(0, -20);
      const summary = summarizeMessages(oldMessages);
      const archives = this.loadArchives();
      archives.unshift({ id: generateId(), summary, messageCount: oldMessages.length, timestamp: Date.now() });
      if (archives.length > 10) archives.pop();
      this.saveArchives(archives);
      this.messages = recent;
    }
    this.dreamCount++;
    this.phaseHandler?.('wake');
    this.save();
  }

  shouldCompact(): boolean {
    const total = this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    return total > TOKEN_THRESHOLD * 0.8;
  }

  compact() {
    if (this.messages.length <= 20) return;
    const systemMsgs = this.messages.filter(m => m.role === 'system');
    const recent = this.messages.slice(-20);
    const middle = this.messages.slice(this.messages.length > 20 ? systemMsgs.length : 0, -20);
    const summary = summarizeMessages(middle);
    const compressedMsg: Message = { id: generateId(), role: 'assistant', content: `[Earlier context: ${summary}]`, timestamp: Date.now() };
    this.messages = systemMsgs.length > 0 ? [...systemMsgs, compressedMsg, ...recent] : [compressedMsg, ...recent];
    this.save();
  }

  getMessages(): Message[] { return [...this.messages]; }
  getDreamCount(): number { return this.dreamCount; }

  save() {
    try { localStorage.setItem('doc-editor-dream-messages', JSON.stringify(this.messages)); } catch {}
  }

  load() {
    try {
      const stored = localStorage.getItem('doc-editor-dream-messages');
      if (stored) this.messages = JSON.parse(stored);
    } catch {}
  }

  private loadArchives(): any[] {
    try { return JSON.parse(localStorage.getItem('doc-editor-dream-archives') || '[]'); } catch { return []; }
  }

  private saveArchives(archives: any[]) {
    try { localStorage.setItem('doc-editor-dream-archives', JSON.stringify(archives)); } catch {}
  }

  getStats() {
    return {
      messageCount: this.messages.length,
      totalTokens: this.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0),
      dreamCount: this.dreamCount,
      lastActivity: this.lastActivity,
    };
  }
}

export const dreamMemory = new DreamMemoryImpl();

interface DreamStore {
  phase: DreamPhase;
  messageCount: number;
  tokenCount: number;
  dreamCount: number;
  setPhase: (phase: DreamPhase) => void;
  updateStats: () => void;
}

export const useDreamStore = create<DreamStore>((set) => ({
  phase: 'wake',
  messageCount: 0,
  tokenCount: 0,
  dreamCount: 0,
  setPhase: (phase) => set({ phase }),
  updateStats: () => {
    const stats = dreamMemory.getStats();
    set({ messageCount: stats.messageCount, tokenCount: stats.totalTokens, dreamCount: stats.dreamCount });
  },
}));

export function useAutoCompact() {
  const { updateStats, setPhase } = useDreamStore();
  const checkAndCompact = () => {
    if (dreamMemory.shouldCompact()) {
      setPhase('dream');
      dreamMemory.compact();
      setPhase('wake');
      updateStats();
    }
  };
  return { checkAndCompact };
}