import type { L0Meta } from '../types';

const STORAGE_KEY = 'doc-editor-L0-meta';
const DEFAULT_META: L0Meta = {
  rules: [
    '始终保持文档上下文完整',
    '优先恢复上一会话未完成的编辑',
    '跨会话记忆优先于即时生成',
  ],
  version: '1.0',
};

export function getL0Meta(): L0Meta {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_META, ...JSON.parse(stored) } : { ...DEFAULT_META };
  } catch { return { ...DEFAULT_META }; }
}

export function setL0Meta(meta: L0Meta): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

export function addL0Rule(rule: string): void {
  const meta = getL0Meta();
  if (!meta.rules.includes(rule)) {
    meta.rules.push(rule);
    setL0Meta(meta);
  }
}