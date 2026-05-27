/**
 * ConflictResolver - 并发编辑冲突检测与合并策略
 */

import type { DocumentSnapshot } from './DeltaEngine';

export interface ConflictInfo {
  documentKey: string;
  localVersion: string;
  remoteVersion: string;
  localContent: string;
  remoteContent: string;
  localTimestamp: number;
  remoteTimestamp: number;
}

export interface ResolutionStrategy {
  type: 'local-wins' | 'remote-wins' | 'merge' | 'manual';
  confidence: number;
  mergedContent?: string;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  resolvedContent: string;
  requiresManualReview: boolean;
  conflictDetails?: string[];
}

export interface LineDiff {
  lineNumber: number;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  localContent?: string;
  remoteContent?: string;
}

/**
 * 检测两个版本之间是否存在冲突
 */
export function detectConflict(
  local: DocumentSnapshot,
  remote: DocumentSnapshot
): boolean {
  // 如果hash相同，没有冲突
  if (local.hash === remote.hash) {
    return false;
  }
  
  // 如果内容完全相同，没有冲突
  if (local.content === remote.content) {
    return false;
  }
  
  return true;
}

/**
 * 获取冲突信息
 */
export function getConflictInfo(
  documentKey: string,
  local: DocumentSnapshot,
  remote: DocumentSnapshot
): ConflictInfo {
  return {
    documentKey,
    localVersion: local.version,
    remoteVersion: remote.version,
    localContent: local.content,
    remoteContent: remote.content,
    localTimestamp: local.timestamp,
    remoteTimestamp: remote.timestamp
  };
}

/**
 * 计算行级差异
 */
export function computeLineDiff(local: string, remote: string): LineDiff[] {
  // Handle empty strings specially
  if (local === '' && remote === '') {
    return [{ lineNumber: 1, type: 'unchanged', localContent: '' }];
  }
  if (local === '' && remote !== '') {
    return remote.split('\n').map((line, i) => ({
      lineNumber: i + 1,
      type: 'added' as const,
      remoteContent: line
    }));
  }
  if (local !== '' && remote === '') {
    return local.split('\n').map((line, i) => ({
      lineNumber: i + 1,
      type: 'removed' as const,
      localContent: line
    }));
  }
  
  const localLines = local.split('\n');
  const remoteLines = remote.split('\n');
  
  const diff: LineDiff[] = [];
  const maxLen = Math.max(localLines.length, remoteLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const localLine = localLines[i];
    const remoteLine = remoteLines[i];
    
    if (localLine === undefined && remoteLine !== undefined) {
      diff.push({ lineNumber: i + 1, type: 'added', remoteContent: remoteLine });
    } else if (remoteLine === undefined && localLine !== undefined) {
      diff.push({ lineNumber: i + 1, type: 'removed', localContent: localLine });
    } else if (localLine !== remoteLine) {
      diff.push({ 
        lineNumber: i + 1, 
        type: 'modified', 
        localContent: localLine, 
        remoteContent: remoteLine 
      });
    } else {
      diff.push({ lineNumber: i + 1, type: 'unchanged', localContent: localLine });
    }
  }
  
  return diff;
}

/**
 * 分析冲突类型
 */
export function analyzeConflictType(diff: LineDiff[]): {
  hasAdditions: boolean;
  hasDeletions: boolean;
  hasModifications: boolean;
  conflictRegions: Array<{ start: number; end: number }>;
} {
  const hasAdditions = diff.some(d => d.type === 'added');
  const hasDeletions = diff.some(d => d.type === 'removed');
  const hasModifications = diff.some(d => d.type === 'modified');
  
  // 找出冲突区域（连续的非unchanged行）
  const conflictRegions: Array<{ start: number; end: number }> = [];
  let regionStart: number | null = null;
  
  for (let i = 0; i < diff.length; i++) {
    if (diff[i].type !== 'unchanged') {
      if (regionStart === null) {
        regionStart = i;
      }
    } else {
      if (regionStart !== null) {
        conflictRegions.push({ start: regionStart, end: i - 1 });
        regionStart = null;
      }
    }
  }
  
  if (regionStart !== null) {
    conflictRegions.push({ start: regionStart, end: diff.length - 1 });
  }
  
  return { hasAdditions, hasDeletions, hasModifications, conflictRegions };
}

/**
 * 自动合并（简单的三向合并）
 */
export function autoMerge(local: string, remote: string, base: string): string {
  const localLines = local.split('\n');
  const remoteLines = remote.split('\n');
  const baseLines = base.split('\n');
  
  const result: string[] = [];
  const maxLen = Math.max(localLines.length, remoteLines.length, baseLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const localLine = localLines[i];
    const remoteLine = remoteLines[i];
    const baseLine = baseLines[i];
    
    if (localLine === remoteLine) {
      // 双方一致，使用任一方
      result.push(localLine ?? '');
    } else if (localLine === baseLine) {
      // local没有变，remote变了，采用remote
      result.push(remoteLine ?? '');
    } else if (remoteLine === baseLine) {
      // remote没有变，local变了，采用local
      result.push(localLine ?? '');
    } else {
      // 双方都变了，冲突 - 使用local优先
      result.push(localLine ?? '');
    }
  }
  
  return result.join('\n');
}

/**
 * 选择分辨率策略
 */
export function chooseStrategy(
  conflict: ConflictInfo,
  diff: LineDiff[]
): ResolutionStrategy {
  const analysis = analyzeConflictType(diff);
  
  // 如果没有冲突区域，选择 local-wins
  if (analysis.conflictRegions.length === 0) {
    return { type: 'local-wins', confidence: 1.0 };
  }
  
  // 计算冲突行数
  const totalConflictLines = analysis.conflictRegions.reduce(
    (sum, r) => sum + (r.end - r.start + 1), 0
  );
  
  // 如果冲突区域很小（<=3行），可以自动合并
  if (totalConflictLines <= 3) {
    return { type: 'merge', confidence: 0.8 };
  }
  
  // 冲突较大时，根据时间戳决定
  if (conflict.localTimestamp > conflict.remoteTimestamp) {
    return { type: 'local-wins', confidence: 0.7 };
  } else {
    return { type: 'remote-wins', confidence: 0.7 };
  }
}

/**
 * 解决冲突
 */
export function resolveConflict(
  conflict: ConflictInfo,
  baseContent: string
): ConflictResolution {
  const diff = computeLineDiff(conflict.localContent, conflict.remoteContent);
  const strategy = chooseStrategy(conflict, diff);
  const analysis = analyzeConflictType(diff);
  
  let resolvedContent: string;
  let requiresManualReview = false;
  const conflictDetails: string[] = [];
  
  switch (strategy.type) {
    case 'local-wins':
      resolvedContent = conflict.localContent;
      break;
      
    case 'remote-wins':
      resolvedContent = conflict.remoteContent;
      break;
      
    case 'merge':
      resolvedContent = autoMerge(
        conflict.localContent,
        conflict.remoteContent,
        baseContent
      );
      break;
      
    case 'manual':
      requiresManualReview = true;
      resolvedContent = conflict.localContent; // 临时使用local
      break;
  }
  
  // 生成冲突详情
  if (analysis.conflictRegions.length > 0) {
    for (const region of analysis.conflictRegions) {
      conflictDetails.push(
        `Lines ${region.start + 1}-${region.end + 1}: conflict`
      );
    }
  }
  
  return {
    strategy,
    resolvedContent,
    requiresManualReview,
    conflictDetails: conflictDetails.length > 0 ? conflictDetails : undefined
  };
}

/**
 * 标记冲突为已解决
 */
export function markResolved(documentKey: string): void {
  // 存储已解决的冲突记录
  const resolvedKey = `doc-editor-conflict-resolved-${documentKey}`;
  localStorage.setItem(resolvedKey, JSON.stringify({
    resolvedAt: Date.now()
  }));
}

/**
 * 检查冲突是否已解决
 */
export function isResolved(documentKey: string): boolean {
  const resolvedKey = `doc-editor-conflict-resolved-${documentKey}`;
  const data = localStorage.getItem(resolvedKey);
  return data !== null;
}

/**
 * 清除已解决标记
 */
export function clearResolved(documentKey: string): void {
  const resolvedKey = `doc-editor-conflict-resolved-${documentKey}`;
  localStorage.removeItem(resolvedKey);
}

/**
 * 生成冲突报告
 */
export function generateConflictReport(conflicts: ConflictInfo[]): string {
  const lines: string[] = [
    `# Conflict Resolution Report`,
    `Generated: ${new Date().toISOString()}`,
    `Total Conflicts: ${conflicts.length}`,
    ``
  ];
  
  for (const conflict of conflicts) {
    lines.push(`## Document: ${conflict.documentKey}`);
    lines.push(`- Local Version: ${conflict.localVersion} (${new Date(conflict.localTimestamp).toISOString()})`);
    lines.push(`- Remote Version: ${conflict.remoteVersion} (${new Date(conflict.remoteTimestamp).toISOString()})`);
    lines.push(``);
  }
  
  return lines.join('\n');
}