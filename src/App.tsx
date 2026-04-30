import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { v4 as uuidv4 } from 'uuid';
import { Doc, Folder } from './types';
import {
  getAllDocs, getDocsByFolder, getDocsByTag, getDoc, saveDoc, deleteDoc,
  getHistory, addHistory, clearOldHistory,
  getAllFolders, saveFolder, deleteFolder, moveDocToFolder, getAllTags,
} from './db';
import { downloadFile, exportToMarkdown, exportToPDF, formatDate, countWords } from './utils';

const lowlight = createLowlight(common);

type SidebarTab = 'docs' | 'folders' | 'tags';

// ---- Small components ----

const ToolbarButton: React.FC<{
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button className={`toolbar-btn ${active ? 'active' : ''}`} onClick={onClick} title={title} type="button">
    {children}
  </button>
);

const Modal: React.FC<{
  title: string; onClose: () => void; children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-title">{title}</div>
      {children}
    </div>
  </div>
);

// ---- Main App ----
const App: React.FC = () => {
  const { t } = useTranslation();
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('docs');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: string; timestamp: number }[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'doc' | 'folder'; item: Doc | Folder } | null>(null);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moveTargetDocId, setMoveTargetDocId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; docId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; snippet: string; folderId: string | null }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: t('placeholder') }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(countWords(text));
      scheduleAutoSave();
      scheduleHistory();
    },
  });

  // Load initial data
  useEffect(() => {
    loadAll();
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('doc-editor-theme', theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem('doc-editor-theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDocId, editor]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const loadAll = async () => {
    const [docsList, foldersList, tags] = await Promise.all([
      getAllDocs(),
      getAllFolders(),
      getAllTags(),
    ]);
    setDocs(docsList);
    setFolders(foldersList);
    setAllTags(tags);
    if (docsList.length > 0 && !activeDocId) {
      selectDoc(docsList[0].id);
    }
  };

  const loadDocsForCurrentView = async () => {
    if (sidebarTab === 'folders' && activeFolderId !== undefined) {
      const docsInFolder = activeFolderId === null
        ? await getDocsByFolder(null)
        : await getDocsByFolder(activeFolderId);
      setDocs(docsInFolder);
    } else if (sidebarTab === 'tags' && activeTag) {
      setDocs(await getDocsByTag(activeTag));
    } else {
      setDocs(await getAllDocs());
    }
  };

  useEffect(() => {
    loadDocsForCurrentView();
  }, [sidebarTab, activeFolderId, activeTag]);

  const selectDoc = async (id: string) => {
    const doc = await getDoc(id);
    if (doc && editor) {
      editor.commands.setContent(doc.content);
      setActiveDocId(id);
      setWordCount(countWords(editor.getText()));
    }
  };

  const handleSave = useCallback(async () => {
    if (!activeDocId || !editor) return;
    setSaveStatus('saving');
    const content = editor.getHTML();
    const existing = await getDoc(activeDocId);
    if (existing) {
      const updated = { ...existing, content, updatedAt: Date.now() };
      await saveDoc(updated);
      setDocs(prev => prev.map(d => d.id === activeDocId ? updated : d));
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [activeDocId, editor]);

  const scheduleAutoSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(handleSave, 2000);
  };

  const scheduleHistory = () => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(saveHistory, 30000);
  };

  const saveHistory = async () => {
    if (!activeDocId || !editor) return;
    const content = editor.getHTML();
    if (!content || content === '<p></p>') return;
    const entry = { id: uuidv4(), docId: activeDocId, content, timestamp: Date.now() };
    await addHistory(entry);
    await clearOldHistory(activeDocId);
    if (showHistory) loadHistory();
  };

  const loadHistory = async () => {
    if (!activeDocId) return;
    const entries = await getHistory(activeDocId);
    setHistory(entries.map(e => ({ id: e.id, timestamp: e.timestamp })));
  };

  const restoreHistory = async (entryId: string) => {
    if (!activeDocId || !editor) return;
    const entries = await getHistory(activeDocId);
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      editor.commands.setContent(entry.content);
      setShowHistory(false);
    }
  };

  // ---- Doc operations ----
  const createNewDoc = async () => {
    const doc: Doc = {
      id: uuidv4(), title: t('untitled'), content: '',
      folderId: sidebarTab === 'folders' ? (activeFolderId === undefined ? null : activeFolderId) : null,
      tags: [], createdAt: Date.now(), updatedAt: Date.now(),
    };
    await saveDoc(doc);
    await loadAll();
    selectDoc(doc.id);
  };

  const handleDeleteDoc = async (doc: Doc) => {
    await deleteDoc(doc.id);
    if (activeDocId === doc.id) {
      setActiveDocId(null);
      if (editor) editor.commands.setContent('');
    }
    await loadAll();
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleRename = async () => {
    if (!renameDocId || !renameValue.trim()) return;
    const doc = await getDoc(renameDocId);
    if (doc) {
      doc.title = renameValue.trim();
      doc.updatedAt = Date.now();
      await saveDoc(doc);
      await loadAll();
    }
    setRenameDocId(null);
    setRenameValue('');
  };

  const handleMoveDoc = async (docId: string, folderId: string | null) => {
    await moveDocToFolder(docId, folderId);
    setShowMoveMenu(false);
    setMoveTargetDocId(null);
    await loadAll();
  };

  const openMoveMenu = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMoveTargetDocId(docId);
    setShowMoveMenu(true);
  };

  // ---- Search ----
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const allDocs = await getAllDocs();
    const results: { id: string; title: string; snippet: string; folderId: string | null }[] = [];
    for (const doc of allDocs) {
      // Strip HTML tags for text search
      const textContent = doc.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
      const bodyMatch = textContent.toLowerCase().includes(lowerQuery);
      if (titleMatch || bodyMatch) {
        let snippet = '';
        if (bodyMatch) {
          const idx = textContent.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, idx - 30);
          const end = Math.min(textContent.length, idx + query.length + 50);
          snippet = (start > 0 ? '...' : '') + textContent.slice(start, end) + (end < textContent.length ? '...' : '');
        } else {
          snippet = textContent.slice(0, 80) + (textContent.length > 80 ? '...' : '');
        }
        results.push({ id: doc.id, title: doc.title, snippet, folderId: doc.folderId });
      }
    }
    setSearchResults(results.slice(0, 10));
    setShowSearchResults(true);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => performSearch(value), 300);
  };

  const selectSearchResult = (docId: string) => {
    selectDoc(docId);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // ---- Folder operations ----
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folder: Folder = {
      id: uuidv4(), name: newFolderName.trim(), parentId: null, createdAt: Date.now(),
    };
    await saveFolder(folder);
    setFolders(prev => [...prev, folder]);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleDeleteFolder = async (folder: Folder) => {
    await deleteFolder(folder.id);
    setFolders(prev => prev.filter(f => f.id !== folder.id));
    if (activeFolderId === folder.id) setActiveFolderId(null);
    await loadAll();
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // ---- Tag operations ----
  const addTagToDoc = async (tag: string) => {
    if (!activeDocId || !tag.trim()) return;
    const doc = await getDoc(activeDocId);
    if (doc && !doc.tags.includes(tag.trim())) {
      doc.tags = [...doc.tags, tag.trim()];
      doc.updatedAt = Date.now();
      await saveDoc(doc);
      await loadAll();
    }
    setTagInput('');
    setShowTagInput(false);
  };

  const removeTagFromDoc = async (tag: string) => {
    if (!activeDocId) return;
    const doc = await getDoc(activeDocId);
    if (doc) {
      doc.tags = doc.tags.filter(t => t !== tag);
      doc.updatedAt = Date.now();
      await saveDoc(doc);
      await loadAll();
    }
  };

  const handleExport = async (type: 'md' | 'html' | 'pdf') => {
    if (!editor) return;
    setShowExportMenu(false);
    if (type === 'md') downloadFile(exportToMarkdown(editor), 'document.md', 'text/markdown');
    else if (type === 'html') {
      const html = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>${activeDoc?.title || t('untitled')}</title>\n<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8}</style>\n</head>\n<body>${editor.getHTML()}</body>\n</html>`;
      downloadFile(html, 'document.html', 'text/html');
    } else if (type === 'pdf') await exportToPDF(editor);
  };

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) editor?.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('图片 URL:');
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  };

  const handleContextMenu = (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, docId });
  };

  const getDocCountForFolder = (folderId: string | null) => {
    return docs.filter(d => d.folderId === folderId).length;
  };

  const getDocCountForTag = (tag: string) => {
    return docs.filter(d => d.tags.includes(tag)).length;
  };

  const activeDoc = docs.find(d => d.id === activeDocId);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <span className="app-title">{t('appTitle')}</span>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <input
            className="modal-input"
            style={{ marginBottom: 0, width: '100%' }}
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowSearchResults(true); }}
            onKeyDown={e => {
              if (e.key === 'Escape') { setShowSearchResults(false); setSearchQuery(''); }
            }}
            placeholder="搜索文档标题和内容..."
          />
          {showSearchResults && searchResults.length > 0 && (
            <div className="context-menu" style={{ left: 0, right: 0, top: '100%', marginTop: 4, maxHeight: 320, overflowY: 'auto' }}>
              {searchResults.map(r => (
                <button
                  key={r.id}
                  className="context-menu-item"
                  onClick={() => selectSearchResult(r.id)}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
                >
                  <span style={{ fontWeight: 500 }}>{r.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {r.folderId ? `📂 ${folders.find(f => f.id === r.folderId)?.name || ''} — ` : ''}{r.snippet}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={createNewDoc} type="button">+ {t('newDoc')}</button>
          <div className="dropdown">
            <button className="btn" onClick={() => setShowExportMenu(!showExportMenu)} type="button">{t('export')}</button>
            {showExportMenu && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => handleExport('md')} type="button">{t('exportMarkdown')}</button>
                <button className="dropdown-item" onClick={() => handleExport('html')} type="button">{t('exportHTML')}</button>
                <button className="dropdown-item" onClick={() => handleExport('pdf')} type="button">{t('exportPDF')}</button>
              </div>
            )}
          </div>
          <button className="btn" onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }} type="button">{t('history')}</button>
          <button className="btn btn-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} type="button" title={t('theme')}>{theme === 'light' ? '🌙' : '☀️'}</button>
        </div>
      </header>

      <div className="app-main">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Tabs */}
          <div className="sidebar-tabs">
            <button className={`sidebar-tab ${sidebarTab === 'docs' ? 'active' : ''}`} onClick={() => { setSidebarTab('docs'); setActiveFolderId(null); setActiveTag(null); }} type="button">{t('allDocs')}</button>
            <button className={`sidebar-tab ${sidebarTab === 'folders' ? 'active' : ''}`} onClick={() => { setSidebarTab('folders'); setActiveFolderId(null); setActiveTag(null); }} type="button">{t('folders')}</button>
            <button className={`sidebar-tab ${sidebarTab === 'tags' ? 'active' : ''}`} onClick={() => { setSidebarTab('tags'); setActiveTag(''); setActiveFolderId(null); }} type="button">{t('tags')}</button>
          </div>

          <div className="nav-tree">
            {/* ALL DOCS tab */}
            {sidebarTab === 'docs' && (
              <>
                {docs.length === 0 && <div className="empty-state">{t('noDocs')}</div>}
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className={`nav-item ${doc.id === activeDocId ? 'active' : ''}`}
                    onClick={() => selectDoc(doc.id)}
                    onContextMenu={e => handleContextMenu(e, doc.id)}
                  >
                    <div className="nav-item-left">
                      <span className="nav-item-icon">📄</span>
                      <span className="nav-item-title">{doc.title}</span>
                    </div>
                    <span className="nav-item-time">{formatDate(doc.updatedAt)}</span>
                    <div className="nav-item-actions">
                      <button className="nav-action-btn" onClick={e => { e.stopPropagation(); setRenameDocId(doc.id); setRenameValue(doc.title); }} type="button" title={t('rename')}>✏️</button>
                      <button className="nav-action-btn" onClick={e => openMoveMenu(doc.id, e)} type="button" title={t('moveToFolder')}>📁</button>
                      <button className="nav-action-btn" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'doc', item: doc }); setShowDeleteModal(true); }} type="button" title={t('delete')}>🗑️</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* FOLDERS tab */}
            {sidebarTab === 'folders' && (
              <>
                <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
                  {showNewFolderInput ? (
                    <input
                      className="modal-input" style={{ marginBottom: 0, flex: 1 }}
                      value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolderInput(false); }}
                      onBlur={() => { if (!newFolderName.trim()) setShowNewFolderInput(false); }}
                      autoFocus placeholder={t('newFolder')}
                    />
                  ) : (
                    <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setShowNewFolderInput(true)} type="button">+ {t('newFolder')}</button>
                  )}
                </div>

                {/* Root folder */}
                <div
                  className={`nav-item ${activeFolderId === null ? 'active' : ''}`}
                  onClick={() => setActiveFolderId(null)}
                >
                  <div className="nav-item-left">
                    <span className="nav-item-icon">📁</span>
                    <span className="nav-item-title">{t('rootFolder')}</span>
                  </div>
                  <span className="nav-item-count">{getDocCountForFolder(null)}</span>
                </div>

                {/* Folder list */}
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    className={`nav-item ${activeFolderId === folder.id ? 'active' : ''}`}
                    onClick={() => setActiveFolderId(folder.id)}
                  >
                    <div className="nav-item-left">
                      <span className="nav-item-icon">📂</span>
                      <span className="nav-item-title">{folder.name}</span>
                    </div>
                    <span className="nav-item-count">{getDocCountForFolder(folder.id)}</span>
                    <div className="nav-item-actions">
                      <button className="nav-action-btn" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'folder', item: folder }); setShowDeleteModal(true); }} type="button" title={t('delete')}>🗑️</button>
                    </div>
                  </div>
                ))}

                {docs.length === 0 && <div className="empty-state">{t('noDocs')}</div>}
              </>
            )}

            {/* TAGS tab */}
            {sidebarTab === 'tags' && (
              <>
                {allTags.length === 0 ? (
                  <div className="empty-state">{t('noTags')}</div>
                ) : (
                  <div className="tag-cloud">
                    {allTags.map(tag => (
                      <div
                        key={tag}
                        className={`tag-chip ${activeTag === tag ? 'active' : ''}`}
                        onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
                      >
                        {tag} <span className="doc-count">({getDocCountForTag(tag)})</span>
                      </div>
                    ))}
                  </div>
                )}
                {docs.length === 0 && activeTag && <div className="empty-state">{t('noDocs')}</div>}
              </>
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="editor-area">
          {/* Toolbar */}
          {editor && (
            <div className="toolbar">
              <div className="toolbar-group">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title={t('bold')}>B</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title={t('italic')}><i>I</i></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title={t('underline')}><u>U</u></ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title={t('strikethrough')}><s>S</s></ToolbarButton>
              </div>
              <div className="toolbar-group">
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title={t('heading1')}>H1</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title={t('heading2')}>H2</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title={t('heading3')}>H3</ToolbarButton>
              </div>
              <div className="toolbar-group">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title={t('bulletList')}>•</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title={t('orderedList')}>1.</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title={t('blockquote')}>&gt;</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title={t('codeBlock')}>{'<>'}</ToolbarButton>
              </div>
              <div className="toolbar-group">
                <ToolbarButton onClick={addLink} title={t('link')}>🔗</ToolbarButton>
                <ToolbarButton onClick={addImage} title={t('image')}>🖼️</ToolbarButton>
              </div>
              <div className="toolbar-group">
                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title={t('undo')}>↩</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title={t('redo')}>↪</ToolbarButton>
              </div>
            </div>
          )}

          {/* Tag editor */}
          {activeDoc && (
            <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--toolbar-bg)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>标签：</span>
              <div className="tag-editor">
                {activeDoc.tags.map(tag => (
                  <span key={tag} className="tag-editor-chip">
                    {tag}
                    <span className="tag-editor-remove" onClick={() => removeTagFromDoc(tag)}>×</span>
                  </span>
                ))}
                {showTagInput ? (
                  <input
                    className="tag-editor-input"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addTagToDoc(tagInput); if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); } }}
                    onBlur={() => { if (tagInput.trim()) addTagToDoc(tagInput); else setShowTagInput(false); }}
                    autoFocus
                    placeholder={t('tagPlaceholder')}
                  />
                ) : (
                  <button className="btn btn-sm" onClick={() => setShowTagInput(true)} type="button">+ {t('addTag')}</button>
                )}
              </div>
            </div>
          )}

          <div className="editor-content">
            <EditorContent editor={editor} />
          </div>

          {/* Status Bar */}
          <div className="status-bar">
            <div className="status-left">
              <span>{activeDoc?.title || t('untitled')}</span>
              <span>{t('wordCount', { count: wordCount })}</span>
              {activeDoc?.folderId && (
                <span>📂 {folders.find(f => f.id === activeDoc.folderId)?.name || t('rootFolder')}</span>
              )}
            </div>
            <div className="status-right">
              <span>{saveStatus === 'saving' ? t('saving') : saveStatus === 'saved' ? t('saved') : ''}</span>
              <span>{activeDoc ? t('lastModified', { time: formatDate(activeDoc.updatedAt) }) : ''}</span>
            </div>
          </div>
        </main>

        {/* History Panel */}
        {showHistory && (
          <aside className="history-panel">
            <div className="history-header">
              <span className="history-title">{t('history')}</span>
              <button className="btn btn-icon" onClick={() => setShowHistory(false)} type="button">✕</button>
            </div>
            <div className="history-list">
              {history.length === 0 && <div className="empty-state">{t('noHistory')}</div>}
              {history.map(entry => (
                <div key={entry.id} className="history-item">
                  <div className="history-item-time">{formatDate(entry.timestamp)}</div>
                  <div className="history-item-actions">
                    <button className="btn btn-sm" onClick={() => restoreHistory(entry.id)} type="button">{t('restore')}</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <Modal title={deleteTarget.type === 'doc' ? t('confirmDelete', { title: (deleteTarget.item as Doc).title }) : t('confirmDeleteFolder', { name: (deleteTarget.item as Folder).name })} onClose={() => setShowDeleteModal(false)}>
          <div className="modal-actions">
            <button className="btn" onClick={() => setShowDeleteModal(false)} type="button">{t('cancel')}</button>
            <button className="btn btn-danger" onClick={() => {
              if (deleteTarget.type === 'doc') handleDeleteDoc(deleteTarget.item as Doc);
              else handleDeleteFolder(deleteTarget.item as Folder);
            }} type="button">{t('confirm')}</button>
          </div>
        </Modal>
      )}

      {/* Rename Modal */}
      {renameDocId && (
        <Modal title={t('rename')} onClose={() => setRenameDocId(null)}>
          <input
            className="modal-input"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameDocId(null); }}
            autoFocus
          />
          <div className="modal-actions">
            <button className="btn" onClick={() => setRenameDocId(null)} type="button">{t('cancel')}</button>
            <button className="btn btn-primary" onClick={handleRename} type="button">{t('confirm')}</button>
          </div>
        </Modal>
      )}

      {/* Move to Folder Menu */}
      {showMoveMenu && moveTargetDocId && (
        <div className="context-menu" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div style={{ padding: '4px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('moveToFolder')}</div>
          <button className="context-menu-item" onClick={() => handleMoveDoc(moveTargetDocId, null)} type="button">📁 {t('rootFolder')}</button>
          {folders.map(folder => (
            <button key={folder.id} className="context-menu-item" onClick={() => handleMoveDoc(moveTargetDocId, folder.id)} type="button">📂 {folder.name}</button>
          ))}
          <div className="context-menu-separator" />
          <button className="context-menu-item" onClick={() => { setShowMoveMenu(false); setMoveTargetDocId(null); }} type="button">{t('cancel')}</button>
        </div>
      )}

      {/* Context Menu (right-click doc) */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button className="context-menu-item" onClick={() => { setRenameDocId(contextMenu.docId); setRenameValue(docs.find(d => d.id === contextMenu.docId)?.title || ''); setContextMenu(null); }} type="button">✏️ {t('rename')}</button>
          <button className="context-menu-item" onClick={() => { setMoveTargetDocId(contextMenu.docId); setShowMoveMenu(true); setContextMenu(null); }} type="button">📁 {t('moveToFolder')}</button>
          <div className="context-menu-separator" />
          <button className="context-menu-item danger" onClick={() => { const doc = docs.find(d => d.id === contextMenu.docId); if (doc) { setDeleteTarget({ type: 'doc', item: doc }); setShowDeleteModal(true); } setContextMenu(null); }} type="button">🗑️ {t('delete')}</button>
        </div>
      )}

      {showExportMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowExportMenu(false)} />}
    </div>
  );
};

export default App;
