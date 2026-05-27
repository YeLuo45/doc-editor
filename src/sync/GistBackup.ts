/**
 * GistBackup - GitHub Gist API 云端备份
 * 支持匿名Gist和认证Gist两种模式
 */

export interface GistFile {
  filename: string;
  content: string;
  language?: string;
}

export interface GistData {
  id?: string;
  description: string;
  public: boolean;
  files: Record<string, { content: string; language?: string }>;
}

export interface GistBackupResult {
  success: boolean;
  gistId?: string;
  url?: string;
  error?: string;
}

export interface GistConfig {
  token?: string;
  anonymous?: boolean;
}

const GIST_API_URL = 'https://api.github.com/gists';

/**
 * 创建或更新 Gist
 */
export async function createGist(data: GistData, config: GistConfig = {}): Promise<GistBackupResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    };

    // 如果有token，添加认证头
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(GIST_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody}`
      };
    }

    const result = await response.json();
    return {
      success: true,
      gistId: result.id,
      url: result.html_url
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * 更新现有 Gist
 */
export async function updateGist(gistId: string, data: GistData, config: GistConfig = {}): Promise<GistBackupResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(`${GIST_API_URL}/${gistId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorBody}`
      };
    }

    const result = await response.json();
    return {
      success: true,
      gistId: result.id,
      url: result.html_url
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * 获取 Gist
 */
export async function getGist(gistId: string, config: GistConfig = {}): Promise<GistData | null> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json'
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(`${GIST_API_URL}/${gistId}`, { headers });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 删除 Gist
 */
export async function deleteGist(gistId: string, config: GistConfig = {}): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json'
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(`${GIST_API_URL}/${gistId}`, {
      method: 'DELETE',
      headers
    });

    return response.status === 204 || response.status === 200;
  } catch {
    return false;
  }
}

/**
 * 备份文档到 Gist
 */
export async function backupToGist(
  content: string,
  filename: string,
  description: string,
  config: GistConfig = {}
): Promise<GistBackupResult> {
  const files: Record<string, { content: string; language?: string }> = {
    [filename]: { content, language: 'markdown' }
  };

  // 添加元数据文件
  const metadata = {
    backedUpAt: new Date().toISOString(),
    filename,
    version: Date.now().toString(36)
  };
  files['_meta.json'] = { content: JSON.stringify(metadata, null, 2) };

  const data: GistData = {
    description,
    public: config.anonymous ?? true,
    files
  };

  return createGist(data, config);
}

/**
 * 从 Gist 恢复文档
 */
export async function restoreFromGist(
  gistId: string,
  filename: string,
  config: GistConfig = {}
): Promise<string | null> {
  const gist = await getGist(gistId, config);
  if (!gist || !gist.files[filename]) {
    return null;
  }
  return gist.files[filename].content;
}

/**
 * 列出用户的 Gists
 */
export async function listGists(config: GistConfig = {}, page = 1, perPage = 30): Promise<GistData[]> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json'
    };

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    const response = await fetch(`${GIST_API_URL}?page=${page}&per_page=${perPage}`, { headers });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch {
    return [];
  }
}

/**
 * 检查 Gist token 是否有效
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 构建 Gist URL
 */
export function buildGistUrl(gistId: string): string {
  return `https://gist.github.com/${gistId}`;
}

/**
 * 从 URL 提取 Gist ID
 */
export function extractGistId(url: string): string | null {
  // 支持多种格式:
  // https://gist.github.com/username/gistid
  // https://gist.github.com/gistid
  const patterns = [
    /gist\.github\.com\/[^\/]+\/([a-f0-9]+)/i,
    /gist\.github\.com\/([a-f0-9]+)/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // 如果直接就是 gist id
  if (/^[a-f0-9]+$/i.test(url)) {
    return url;
  }

  return null;
}