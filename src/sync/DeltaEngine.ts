/**
 * DeltaEngine - 文档变更 diff 算法
 * 返回增量 JSON patch (RFC 6902)
 */

export interface DeltaOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy';
  path: string;
  value?: unknown;
  from?: string;
}

export interface DeltaResult {
  operations: DeltaOperation[];
  originalLength: number;
  resultLength: number;
  timestamp: number;
}

export interface DocumentSnapshot {
  version: string;
  content: string;
  timestamp: number;
  hash: string;
}

export interface PatchResult {
  success: boolean;
  patchedContent?: string;
  error?: string;
}

/**
 * 计算两个字符串之间的差异，返回增量操作数组
 */
export function computeDelta(oldContent: string, newContent: string): DeltaResult {
  const originalLength = oldContent.length;
  const resultLength = newContent.length;
  const timestamp = Date.now();

  if (oldContent === newContent) {
    return { operations: [], originalLength, resultLength, timestamp };
  }

  const operations: DeltaOperation[] = [];
  
  // 使用简单行级diff算法
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  // 构建LCS (Longest Common Subsequence) 索引
  const lcs = computeLCS(oldLines, newLines);
  
  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && newIdx < newLines.length &&
        oldLines[oldIdx] === lcs[lcsIdx] && newLines[newIdx] === lcs[lcsIdx]) {
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else if (oldIdx < oldLines.length && (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])) {
      // 删除操作
      operations.push({
        op: 'remove',
        path: `/lines/${newIdx}`,
        value: oldLines[oldIdx]
      });
      oldIdx++;
    } else if (newIdx < newLines.length && (lcsIdx >= lcs.length || newLines[newIdx] !== lcs[lcsIdx])) {
      // 添加操作
      operations.push({
        op: 'add',
        path: `/lines/${newIdx}`,
        value: newLines[newIdx]
      });
      newIdx++;
    }
  }

  return { operations, originalLength, resultLength, timestamp };
}

/**
 * 计算最长公共子序列
 */
function computeLCS(oldLines: string[], newLines: string[]): string[] {
  const m = oldLines.length;
  const n = newLines.length;
  
  // DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // 回溯构建LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      lcs.unshift(oldLines[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * 将增量操作应用到文档，生成新内容
 */
export function applyDelta(content: string, delta: DeltaResult): PatchResult {
  try {
    const lines = content.split('\n');
    
    // 按路径索引排序（从后往前应用，避免索引偏移）
    const sortedOps = [...delta.operations].sort((a, b) => {
      const aIdx = parseInt(a.path.split('/')[2]) || 0;
      const bIdx = parseInt(b.path.split('/')[2]) || 0;
      return bIdx - aIdx;
    });
    
    for (const op of sortedOps) {
      const parts = op.path.split('/');
      const lineIdx = parseInt(parts[2]);
      
      switch (op.op) {
        case 'add':
          if (lineIdx >= 0 && lineIdx <= lines.length) {
            lines.splice(lineIdx, 0, op.value as string);
          }
          break;
        case 'remove':
          if (lineIdx >= 0 && lineIdx < lines.length) {
            lines.splice(lineIdx, 1);
          }
          break;
        case 'replace':
          if (lineIdx >= 0 && lineIdx < lines.length) {
            lines[lineIdx] = op.value as string;
          }
          break;
      }
    }
    
    return {
      success: true,
      patchedContent: lines.join('\n')
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 合并多个增量（用于离线队列）
 */
export function mergeDeltas(deltas: DeltaResult[]): DeltaResult {
  if (deltas.length === 0) {
    return { operations: [], originalLength: 0, resultLength: 0, timestamp: Date.now() };
  }
  
  if (deltas.length === 1) {
    return deltas[0];
  }
  
  // 简单合并：拼接所有操作
  const mergedOps: DeltaOperation[] = [];
  let originalLength = 0;
  let resultLength = 0;
  
  for (let i = 0; i < deltas.length; i++) {
    const delta = deltas[i];
    if (i === 0) {
      originalLength = delta.originalLength;
    }
    resultLength = delta.resultLength;
    
    // 为冲突操作添加索引标记
    for (const op of delta.operations) {
      mergedOps.push({ ...op });
    }
  }
  
  return {
    operations: mergedOps,
    originalLength,
    resultLength,
    timestamp: Date.now()
  };
}

/**
 * 生成文档内容的hash
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * 序列化Delta用于存储
 */
export function serializeDelta(delta: DeltaResult): string {
  return JSON.stringify(delta);
}

/**
 * 反序列化Delta
 */
export function deserializeDelta(json: string): DeltaResult {
  return JSON.parse(json) as DeltaResult;
}

/**
 * 创建文档快照
 */
export async function createSnapshot(content: string, version: string): Promise<DocumentSnapshot> {
  const hash = await generateHash(content);
  return {
    version,
    content,
    timestamp: Date.now(),
    hash
  };
}