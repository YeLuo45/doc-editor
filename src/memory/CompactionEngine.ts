import type { Message } from './types';
import { getL4Sessions, setL4Sessions, saveSession } from './layers/L4Sessions';
import { saveSkill } from './layers/L3Skills';
import { getL2Facts, setL2Facts } from './layers/L2Facts';

const TOKENS_PER_CHAR = 4;
const MAX_TOKEN_THRESHOLD = 80000;

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

export interface CompactionResult {
  archivedCount: number;
  skillsCreated: number;
  newMessages: Message[];
}

export function compactMessages(messages: Message[]): CompactionResult {
  const totalText = messages.map(m => m.content).join('');
  const tokenCount = estimateTokens(totalText);

  if (tokenCount < MAX_TOKEN_THRESHOLD * 0.8) {
    return { archivedCount: 0, skillsCreated: 0, newMessages: messages };
  }

  const recent = messages.slice(-20);
  const oldMessages = messages.slice(0, -20);
  
  if (oldMessages.length > 0) {
    const summary = summarizeMessages(oldMessages);
    saveSession({
      startedAt: oldMessages[0].timestamp,
      endedAt: oldMessages[oldMessages.length - 1].timestamp,
      messageCount: oldMessages.length,
      contextSummary: summary,
      isActive: false,
    });
  }

  const patterns = detectPatterns(oldMessages);
  let skillsCreated = 0;
  if (patterns.length >= 3) {
    saveSkill({
      name: patterns[0] || 'Auto-detected Pattern',
      description: `Detected from ${oldMessages.length} messages`,
      steps: patterns.slice(0, 5),
    });
    skillsCreated = 1;
  }

  const facts = getL2Facts();
  facts.userPreferences['lastCompaction'] = Date.now();
  setL2Facts(facts);

  return {
    archivedCount: oldMessages.length,
    skillsCreated,
    newMessages: recent,
  };
}

function detectPatterns(messages: Message[]): string[] {
  const patterns: string[] = [];
  const seen = new Set<string>();
  for (const msg of messages) {
    const words = msg.content.split(/\s+/).slice(0, 5).join(' ');
    if (words && !seen.has(words)) {
      seen.add(words);
      patterns.push(words);
    }
  }
  return patterns;
}

export function getCompactionStats() {
  const l4Sessions = getL4Sessions();
  return {
    totalArchivedSessions: l4Sessions.length,
    totalArchivedMessages: l4Sessions.reduce((sum, s) => sum + s.messageCount, 0),
    oldestSession: l4Sessions.length > 0 ? l4Sessions[l4Sessions.length - 1].endedAt : null,
  };
}