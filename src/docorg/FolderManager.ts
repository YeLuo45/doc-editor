/**
 * FolderManager - Intelligent folder structure with auto-categorization
 */

import { classifyDocument, DocumentType } from './DocumentClassifier';
import type { DocumentContent } from './DocumentClassifier';

export interface Folder {
  id: string;
  name: string;
  path: string;
  type?: DocumentType;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
  documentIds: string[];
  children: string[];
  parentId?: string;
}

export interface FolderTree {
  folders: Map<string, Folder>;
  rootIds: string[];
}

export interface FolderStats {
  totalFolders: number;
  totalDocuments: number;
  documentsByFolder: Record<string, number>;
}

export const FOLDER_COLORS: Record<DocumentType, string> = {
  code: '#3b82f6',
  config: '#10b981',
  doc: '#8b5cf6',
  note: '#f59e0b',
  unknown: '#6b7280',
};

export const FOLDER_ICONS: Record<DocumentType, string> = {
  code: '💻',
  config: '⚙️',
  doc: '📄',
  note: '📝',
  unknown: '📁',
};

class FolderManagerImpl implements FolderTree {
  folders: Map<string, Folder> = new Map();
  rootIds: string[] = [];

  constructor() {
    this.folders = new Map();
    this.rootIds = [];
    this.initializeDefaultFolders();
  }

  /**
   * Initialize default folder structure
   */
  private initializeDefaultFolders(): void {
    const defaultFolders: Array<{ id: string; name: string; type?: DocumentType; parentId?: string }> = [
      { id: 'code', name: 'Code', type: 'code' },
      { id: 'config', name: 'Config', type: 'config' },
      { id: 'docs', name: 'Documents', type: 'doc' },
      { id: 'notes', name: 'Notes', type: 'note' },
      { id: 'uncategorized', name: 'Uncategorized', type: 'unknown' },
    ];

    for (const folder of defaultFolders) {
      const now = Date.now();
      this.folders.set(folder.id, {
        id: folder.id,
        name: folder.name,
        path: `/${folder.name}`,
        type: folder.type,
        color: folder.type ? FOLDER_COLORS[folder.type] : FOLDER_COLORS.unknown,
        icon: folder.type ? FOLDER_ICONS[folder.type] : '📁',
        createdAt: now,
        updatedAt: now,
        documentIds: [],
        children: [],
        parentId: folder.parentId,
      });
      this.rootIds.push(folder.id);
    }
  }

  /**
   * Get folder by ID
   */
  getFolder(id: string): Folder | undefined {
    return this.folders.get(id);
  }

  /**
   * Get all folders
   */
  getAllFolders(): Folder[] {
    return Array.from(this.folders.values());
  }

  /**
   * Create a new folder
   */
  createFolder(name: string, parentId?: string, type?: DocumentType): Folder {
    const id = this.generateId(name);
    const now = Date.now();
    const path = parentId
      ? `${this.folders.get(parentId)?.path || ''}/${name}`
      : `/${name}`;

    const folder: Folder = {
      id,
      name,
      path,
      type,
      color: type ? FOLDER_COLORS[type] : '#6b7280',
      icon: type ? FOLDER_ICONS[type] : '📁',
      createdAt: now,
      updatedAt: now,
      documentIds: [],
      children: [],
      parentId,
    };

    this.folders.set(id, folder);

    if (parentId) {
      const parent = this.folders.get(parentId);
      if (parent) {
        parent.children.push(id);
        parent.updatedAt = now;
      }
    } else {
      this.rootIds.push(id);
    }

    return folder;
  }

  /**
   * Delete a folder and optionally its contents
   */
  deleteFolder(id: string, deleteContents = false): void {
    const folder = this.folders.get(id);
    if (!folder) return;

    // Remove from parent's children
    if (folder.parentId) {
      const parent = this.folders.get(folder.parentId);
      if (parent) {
        parent.children = parent.children.filter(cid => cid !== id);
      }
    } else {
      this.rootIds = this.rootIds.filter(rid => rid !== id);
    }

    // Delete children recursively
    for (const childId of folder.children) {
      this.deleteFolder(childId, deleteContents);
    }

    this.folders.delete(id);
  }

  /**
   * Move folder to a new parent
   */
  moveFolder(id: string, newParentId?: string): void {
    const folder = this.folders.get(id);
    if (!folder) return;

    // Prevent moving to self or descendant
    if (newParentId === id || (newParentId && this.isDescendant(id, newParentId))) {
      return;
    }

    // Remove from old parent
    if (folder.parentId) {
      const oldParent = this.folders.get(folder.parentId);
      if (oldParent) {
        oldParent.children = oldParent.children.filter(cid => cid !== id);
      }
    } else {
      this.rootIds = this.rootIds.filter(rid => rid !== id);
    }

    // Add to new parent
    folder.parentId = newParentId;
    folder.updatedAt = Date.now();

    if (newParentId) {
      const newParent = this.folders.get(newParentId);
      if (newParent) {
        newParent.children.push(id);
        newParent.updatedAt = Date.now();
        folder.path = `${newParent.path}/${folder.name}`;
      }
    } else {
      this.rootIds.push(id);
      folder.path = `/${folder.name}`;
    }
  }

  /**
   * Add document to folder
   */
  addDocumentToFolder(folderId: string, documentId: string): void {
    const folder = this.folders.get(folderId);
    if (!folder) return;

    if (!folder.documentIds.includes(documentId)) {
      folder.documentIds.push(documentId);
      folder.updatedAt = Date.now();
    }
  }

  /**
   * Remove document from folder
   */
  removeDocumentFromFolder(folderId: string, documentId: string): void {
    const folder = this.folders.get(folderId);
    if (!folder) return;

    folder.documentIds = folder.documentIds.filter(id => id !== documentId);
    folder.updatedAt = Date.now();
  }

  /**
   * Auto-categorize document based on content
   */
  autoCategorize(doc: DocumentContent): string {
    const classification = classifyDocument(doc);

    // Find matching folder based on type
    const typeToFolderId: Record<DocumentType, string> = {
      code: 'code',
      config: 'config',
      doc: 'docs',
      note: 'notes',
      unknown: 'uncategorized',
    };

    const folderId = typeToFolderId[classification.type];
    this.addDocumentToFolder(folderId, doc.fileName || doc.title || 'unknown');

    return folderId;
  }

  /**
   * Get folder for a specific document
   */
  getFolderForDocument(documentId: string): Folder | undefined {
    for (const folder of this.folders.values()) {
      if (folder.documentIds.includes(documentId)) {
        return folder;
      }
    }
    return undefined;
  }

  /**
   * Get folder path (breadcrumb)
   */
  getFolderPath(folderId: string): Folder[] {
    const path: Folder[] = [];
    let current = this.folders.get(folderId);

    while (current) {
      path.unshift(current);
      current = current.parentId ? this.folders.get(current.parentId) : undefined;
    }

    return path;
  }

  /**
   * Check if ancestorId is an ancestor of descendantId
   */
  private isDescendant(ancestorId: string, descendantId: string): boolean {
    const descendant = this.folders.get(descendantId);
    if (!descendant) return false;

    let current = descendant.parentId ? this.folders.get(descendant.parentId) : undefined;
    while (current) {
      if (current.id === ancestorId) return true;
      current = current.parentId ? this.folders.get(current.parentId) : undefined;
    }

    return false;
  }

  /**
   * Generate unique folder ID from name
   */
  private generateId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = base;
    let counter = 1;

    while (this.folders.has(id)) {
      id = `${base}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Get folder statistics
   */
  getStats(): FolderStats {
    const documentsByFolder: Record<string, number> = {};
    let totalDocuments = 0;

    for (const folder of this.folders.values()) {
      documentsByFolder[folder.id] = folder.documentIds.length;
      totalDocuments += folder.documentIds.length;
    }

    return {
      totalFolders: this.folders.size,
      totalDocuments,
      documentsByFolder,
    };
  }

  /**
   * Rebuild folder structure from document types
   */
  rebuildFromDocuments(docs: DocumentContent[]): void {
    // Clear existing documents from folders
    for (const folder of this.folders.values()) {
      folder.documentIds = [];
    }

    // Re-categorize all documents
    for (const doc of docs) {
      this.autoCategorize(doc);
    }
  }

  /**
   * Export folder structure
   */
  export(): { folders: Folder[]; rootIds: string[] } {
    return {
      folders: Array.from(this.folders.values()),
      rootIds: this.rootIds,
    };
  }

  /**
   * Import folder structure
   */
  import(data: { folders: Folder[]; rootIds: string[] }): void {
    this.folders.clear();
    this.rootIds = data.rootIds;

    for (const folder of data.folders) {
      this.folders.set(folder.id, { ...folder });
    }
  }

  /**
   * Clear all folders and reset to defaults
   */
  clear(): void {
    this.folders.clear();
    this.rootIds = [];
    this.initializeDefaultFolders();
  }
}

export const folderManager = new FolderManagerImpl();
export { FolderManagerImpl };
export default folderManager;