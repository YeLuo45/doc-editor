/**
 * GitStorageAdapter - Push document versions to GitHub as commits
 * Integrates with GitHub API to store document snapshots as git commits
 */

export interface GitStorageConfig {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
  pathPrefix?: string;
}

export interface DocumentVersion {
  documentKey: string;
  version: string;
  content: string;
  timestamp: number;
  hash: string;
  message?: string;
}

export interface CommitResult {
  success: boolean;
  sha?: string;
  url?: string;
  error?: string;
}

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
}

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Create a new repository file or update existing one
 */
export async function upsertFile(
  config: GitStorageConfig,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<CommitResult> {
  try {
    const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const body: Record<string, string> = {
      message,
      content: btoa(content),
      branch: config.branch || 'main'
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const result = await response.json();
    return { success: true, sha: result.content?.sha, url: result.content?.html_url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Get file info from repository
 */
export async function getFile(
  config: GitStorageConfig,
  path: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch || 'main'}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const response = await fetch(url, { headers });

    if (!response.ok) return null;

    const result = await response.json();
    
    if (result.content) {
      return { content: atob(result.content.replace(/\n/g, '')), sha: result.sha };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Delete a file from repository
 */
export async function deleteFile(
  config: GitStorageConfig,
  path: string,
  sha: string
): Promise<CommitResult> {
  try {
    const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ message: `Delete ${path}`, sha, branch: config.branch || 'main' })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * List files in repository directory
 */
export async function listFiles(config: GitStorageConfig, path: string = ''): Promise<RepoFile[]> {
  if (!config.token || !config.token.trim()) return [];
  try {
    const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch || 'main'}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const response = await fetch(url, { headers });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

/**
 * Push document version to GitHub
 */
export async function pushDocumentVersion(config: GitStorageConfig, version: DocumentVersion): Promise<CommitResult> {
  const path = buildDocumentPath(config, version.documentKey, version.version);
  const message = version.message || `docs: update ${version.documentKey} v${version.version}`;
  const existingFile = await getFile(config, path);
  return upsertFile(config, path, version.content, message, existingFile?.sha);
}

/**
 * Push document content to a specific path
 */
export async function pushDocument(
  config: GitStorageConfig,
  documentKey: string,
  content: string,
  version: string,
  message?: string
): Promise<CommitResult> {
  const path = buildDocumentPath(config, documentKey, version);
  const existingFile = await getFile(config, path);
  return upsertFile(config, path, content, message || `docs: update ${documentKey} v${version}`, existingFile?.sha);
}

/**
 * Retrieve document from GitHub
 */
export async function retrieveDocument(config: GitStorageConfig, documentKey: string, version: string): Promise<string | null> {
  const path = buildDocumentPath(config, documentKey, version);
  const file = await getFile(config, path);
  return file?.content ?? null;
}

/**
 * Build the path for a document in the repo
 */
export function buildDocumentPath(config: GitStorageConfig, documentKey: string, version: string): string {
  const prefix = config.pathPrefix || 'documents';
  return `${prefix}/${documentKey}/v${version}.md`;
}

/**
 * Get all versions of a document
 */
export async function getDocumentVersions(config: GitStorageConfig, documentKey: string): Promise<RepoFile[]> {
  const prefix = config.pathPrefix || 'documents';
  const files = await listFiles(config, `${prefix}/${documentKey}`);
  return files.filter((f) => f.type === 'file' && f.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Validate GitHub token
 */
export async function validateGitHubToken(token: string): Promise<boolean> {
  if (!token || !token.trim()) return false;
  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Validate repository access
 */
export async function validateRepoAccess(config: GitStorageConfig): Promise<{ valid: boolean; error?: string }> {
  if (!config.token || !config.token.trim()) return { valid: false, error: 'Token is empty' };
  try {
    const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) return { valid: false, error: 'Repository not found' };
      if (response.status === 403) return { valid: false, error: 'Access forbidden - check token permissions' };
      return { valid: false, error: `HTTP ${response.status}` };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Create branch if it doesn't exist
 */
export async function createBranchIfNotExists(config: GitStorageConfig, fromBranch: string = 'main'): Promise<CommitResult> {
  try {
    const refUrl = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/git/refs/heads/${fromBranch}`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const refResponse = await fetch(refUrl, { headers });
    if (!refResponse.ok) return { success: false, error: `Failed to get base branch: ${refResponse.status}` };

    const refData = await refResponse.json();
    const sha = refData.object?.sha;
    if (!sha) return { success: false, error: 'Could not get commit SHA' };

    const branchName = config.branch || 'main';
    const createResponse = await fetch(`${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha })
    });

    if (!createResponse.ok && createResponse.status !== 422) {
      const errorBody = await createResponse.text();
      return { success: false, error: `HTTP ${createResponse.status}: ${errorBody}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}

/**
 * Get commit history for a file
 */
export async function getFileCommits(config: GitStorageConfig, path: string): Promise<Array<{ sha: string; message: string; date: string }>> {
  try {
    const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/commits?path=${path}&per_page=30`;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const response = await fetch(url, { headers });
    if (!response.ok) return [];

    const commits = await response.json();
    return commits.map((c: { sha: string; commit: { message: string; author: { date: string } } }) => ({
      sha: c.sha,
      message: c.commit?.message || '',
      date: c.commit?.author?.date || ''
    }));
  } catch {
    return [];
  }
}

/**
 * Build GitHub URL for a file
 */
export function buildGitHubUrl(config: GitStorageConfig, path: string): string {
  return `https://github.com/${config.owner}/${config.repo}/blob/${config.branch || 'main'}/${path}`;
}

/**
 * Build raw content URL
 */
export function buildRawUrl(config: GitStorageConfig, path: string): string {
  return `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch || 'main'}/${path}`;
}
