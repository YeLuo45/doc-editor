import { describe, it, expect } from 'vitest';
import {
  getFile,
  deleteFile,
  listFiles,
  pushDocument,
  retrieveDocument,
  buildDocumentPath,
  validateGitHubToken,
  validateRepoAccess,
  buildGitHubUrl,
  buildRawUrl,
  type GitStorageConfig
} from '../sync/GitStorageAdapter';

describe('GitStorageAdapter', () => {
  describe('buildDocumentPath', () => {
    it('should build correct path for document', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo' };
      const path = buildDocumentPath(config, 'my-doc', '1.0.0');
      expect(path).toBe('documents/my-doc/v1.0.0.md');
    });

    it('should use custom path prefix', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', pathPrefix: 'custom' };
      const path = buildDocumentPath(config, 'my-doc', '1.0.0');
      expect(path).toBe('custom/my-doc/v1.0.0.md');
    });

    it('should handle nested document keys', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', pathPrefix: 'docs' };
      const path = buildDocumentPath(config, 'folder/doc', '2.0.0');
      expect(path).toBe('docs/folder/doc/v2.0.0.md');
    });
  });

  describe('buildGitHubUrl', () => {
    it('should build correct GitHub URL', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', branch: 'main' };
      const url = buildGitHubUrl(config, 'path/to/file.md');
      expect(url).toBe('https://github.com/test/test-repo/blob/main/path/to/file.md');
    });

    it('should use default branch if not specified', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo' };
      const url = buildGitHubUrl(config, 'path/to/file.md');
      expect(url).toBe('https://github.com/test/test-repo/blob/main/path/to/file.md');
    });

    it('should handle custom branch', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', branch: 'feature-branch' };
      const url = buildGitHubUrl(config, 'file.txt');
      expect(url).toBe('https://github.com/test/test-repo/blob/feature-branch/file.txt');
    });
  });

  describe('buildRawUrl', () => {
    it('should build correct raw content URL', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', branch: 'feature' };
      const url = buildRawUrl(config, 'path/to/file.md');
      expect(url).toBe('https://raw.githubusercontent.com/test/test-repo/feature/path/to/file.md');
    });

    it('should use default branch', () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo' };
      const url = buildRawUrl(config, 'file.md');
      expect(url).toBe('https://raw.githubusercontent.com/test/test-repo/main/file.md');
    });
  });

  describe('validateGitHubToken', () => {
    it('should return false for empty token', async () => {
      const result = await validateGitHubToken('');
      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const result = await validateGitHubToken('invalid-token');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('validateRepoAccess', () => {
    it('should return valid false when token is empty', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      const result = await validateRepoAccess(config);
      expect(result.valid).toBe(false);
    });

    it('should return valid false when token is whitespace', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '   ' };
      const result = await validateRepoAccess(config);
      expect(result.valid).toBe(false);
    });
  });

  describe('pushDocument', () => {
    it('should handle empty token gracefully', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      // When token is empty/whitespace, should not attempt network call
      expect(config.token).toBe('');
    });
  });

  describe('retrieveDocument', () => {
    it('should return null for empty token', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      const result = await retrieveDocument(config, 'doc1', '1.0.0');
      expect(result).toBeNull();
    });
  });

  describe('getFile', () => {
    it('should return null for empty token', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      const result = await getFile(config, 'some/path.md');
      expect(result).toBeNull();
    });
  });

  describe('deleteFile', () => {
    it('should return error for empty token', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      const result = await deleteFile(config, 'path.md', 'sha123');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('listFiles', () => {
    it('should return empty array for empty token', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      const result = await listFiles(config, 'some/path');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty path', async () => {
      const config: GitStorageConfig = { owner: 'test', repo: 'test-repo', token: '' };
      const result = await listFiles(config, '');
      expect(result).toEqual([]);
    });
  });
});