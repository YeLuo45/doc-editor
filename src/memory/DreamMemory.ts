import type { Message, DreamPhase, DreamArchive } from './types';
import { compactMessages } from './CompactionEngine';

const DREAM_THRESHOLD_MESSAGES = 50;
const IDLE_THRESHOLD_MS = 30000;
const MAX_TOKEN_THRESHOLD = 80000;
const TOKENS_PER_CHAR = 4;
const MAX_ARCHIVES = 10;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKENS_PER_CHAR);
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export interface DreamStats {
  phase: DreamPhase;
  messageCount: number;
  tokenCount: number;
  dreamCount: number;
  archivesCount: number;
}

export class DreamMemory {
  private messages: Message[] = [];
  private archives: DreamArchive[] = [];
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

  wake(message: Message): void {
    this.messages.push(message);
    this.lastActivity = Date.now();
    this.resetIdleTimer();
    
    const totalText = this.messages.map(m => m.content).join('');
    const tokens = estimateTokens(totalText);

    if (this.messages.length >= DREAM_THRESHOLD_MESSAGES || tokens >= MAX_TOKEN_THRESHOLD * 0.8) {
      this.triggerDream();
    }
    
    this.save();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.messages.length > 5) this.triggerDream();
    }, IDLE_THRESHOLD_MS);
  }

  triggerDream(): void {
    this.phaseHandler?.('dream');
    
    const result = compactMessages(this.messages);
    this.messages = result.newMessages;
    this.dreamCount++;

    if (result.archivedCount > 0) {
      this.archives.unshift({
        id: generateId(),
        summary: `Archived ${result.archivedCount} messages, created ${result.skillsCreated} skills`,
        messageCount: result.archivedCount,
        timestamp: Date.now(),
      });
      if (this.archives.length > MAX_ARCHIVES) this.archives.pop();
    }

    this.phaseHandler?.('wake');
    this.save();
  }

  getStats(): DreamStats {
    const totalText = this.messages.map(m => m.content).join('');
    return {
      phase: this.messages.length >= DREAM_THRESHOLD_MESSAGES ? 'dream' : 'wake',
      messageCount: this.messages.length,
      tokenCount: estimateTokens(totalText),
      dreamCount: this.dreamCount,
      archivesCount: this.archives.length,
    };
  }

  getMessages(): Message[] { return this.messages; }
  getArchives(): DreamArchive[] { return this.archives; }
  
  clear(): void { 
    this.messages = []; 
    this.dreamCount = 0; 
    this.save(); 
  }

  load(): void {
    try {
      const phaseData = localStorage.getItem('doc-editor-dream-phase');
      if (phaseData) {
        const parsed = JSON.parse(phaseData);
        this.messages = parsed.messages || [];
        this.dreamCount = parsed.dreamCount || 0;
        this.lastActivity = parsed.lastActivity || Date.now();
      }
      const archiveData = localStorage.getItem('doc-editor-dream-archives');
      this.archives = archiveData ? JSON.parse(archiveData) : [];
    } catch { /* ignore */ }
  }

  save(): void {
    try {
      localStorage.setItem('doc-editor-dream-phase', JSON.stringify({
        messages: this.messages,
        dreamCount: this.dreamCount,
        lastActivity: this.lastActivity,
      }));
      localStorage.setItem('doc-editor-dream-archives', JSON.stringify(this.archives));
    } catch { /* ignore */ }
  }
}

export const dreamMemory = new DreamMemory();