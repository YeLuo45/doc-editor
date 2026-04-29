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
import { Doc } from './types';
import { getAllDocs, getDoc, saveDoc, deleteDoc, getHistory, addHistory, clearOldHistory } from './db';
import { downloadFile, exportToMarkdown, exportToPDF, formatDate, countWords } from './utils';

const lowlight = createLowlight(common);

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    className={`toolbar-btn ${active ? 'active' : ''}`}
    onClick={onClick}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const App: React.FC = () => {
  const { t } = useTranslation();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: string; timestamp: number }[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [renameDocId, setRenameDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load docs
  useEffect(() => {
    loadDocs();
  }, []);

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('doc-editor-theme', theme);
  }, [theme]);

  // Load theme
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

  const loadDocs = async () => {
    const list = await getAllDocs();
    setDocs(list);
    if (list.length > 0 && !activeDocId) {
      selectDoc(list[0].id);
    }
  };

  const selectDoc = async (id: string) => {
    const doc = await getDoc(id);
    if (doc && editor) {
      editor.commands.setContent(doc.content);
      setActiveDocId(id);
      setWordCount(countWords(editor.getText()));
    }
  };

  const createNewDoc = async () => {
    const doc: Doc = {
      id: uuidv4(),
      title: t('untitled'),
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveDoc(doc);
    await loadDocs();
    selectDoc(doc.id);
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

  const restoreHistory = (content: string) => {
    if (!editor) return;
    editor.commands.setContent(content);
    setShowHistory(false);
  };

  const handleDeleteDoc = async (doc: Doc) => {
    await deleteDoc(doc.id);
    if (activeDocId === doc.id) {
      setActiveDocId(null);
      if (editor) editor.commands.setContent('');
    }
    await loadDocs();
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
      await loadDocs();
    }
    setRenameDocId(null);
    setRenameValue('');
  };

  const handleExport = async (type: 'md' | 'html' | 'pdf') => {
    if (!editor) return;
    setShowExportMenu(false);
    if (type === 'md') downloadFile(exportToMarkdown(editor), 'document.md', 'text/markdown');
    else if (type === 'html') {
      const html = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>${t('untitled')}</title>\n<style>body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8}</style>\n</head>\n<body>${editor.getHTML()}</body>\n</html>`;
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

  const activeDoc = docs.find(d => d.id === activeDocId);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <span className="app-title">{t('appTitle')}</span>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={createNewDoc} type="button">
            + {t('newDoc')}
          </button>
          <div className="dropdown">
            <button className="btn" onClick={() => setShowExportMenu(!showExportMenu)} type="button">
              {t('export')}
            </button>
            {showExportMenu && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => handleExport('md')} type="button">{t('exportMarkdown')}</button>
                <button className="dropdown-item" onClick={() => handleExport('html')} type="button">{t('exportHTML')}</button>
                <button className="dropdown-item" onClick={() => handleExport('pdf')} type="button">{t('exportPDF')}</button>
              </div>
            )}
          </div>
          <button className="btn" onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }} type="button">
            {t('history')}
          </button>
          <button className="btn btn-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} type="button" title={t('theme')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <div className="app-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">{t('docList')}</span>
          </div>
          <div className="doc-list">
            {docs.length === 0 && <div className="empty-docs">{t('noDocs')}</div>}
            {docs.map(doc => (
              <div
                key={doc.id}
                className={`doc-item ${doc.id === activeDocId ? 'active' : ''}`}
                onClick={() => selectDoc(doc.id)}
              >
                {renameDocId === doc.id ? (
                  <input
                    className="modal-input"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenameDocId(null); setRenameValue(''); } }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="doc-item-title">{doc.title}</span>
                    <span className="doc-item-time">{formatDate(doc.updatedAt)}</span>
                    <div className="doc-item-actions">
                      <button className="doc-action-btn" onClick={e => { e.stopPropagation(); setRenameDocId(doc.id); setRenameValue(doc.title); }} type="button" title={t('rename')}>✏️</button>
                      <button className="doc-action-btn" onClick={e => { e.stopPropagation(); setDeleteTarget(doc); setShowDeleteModal(true); }} type="button" title={t('delete')}>🗑️</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor */}
        <main className="editor-area">
          <div className="toolbar">
            <div className="toolbar-group">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title={t('bold')}>B</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title={t('italic')}><i>I</i></ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title={t('underline')}><u>U</u></ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive('strike')} title={t('strikethrough')}><s>S</s></ToolbarButton>
            </div>
            <div className="toolbar-group">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title={t('heading1')}>H1</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title={t('heading2')}>H2</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title={t('heading3')}>H3</ToolbarButton>
            </div>
            <div className="toolbar-group">
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title={t('bulletList')}>•</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title={t('orderedList')}>1.</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')} title={t('blockquote')}>&gt;</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive('codeBlock')} title={t('codeBlock')}>{'<>'}</ToolbarButton>
            </div>
            <div className="toolbar-group">
              <ToolbarButton onClick={addLink} title={t('link')}>🔗</ToolbarButton>
              <ToolbarButton onClick={addImage} title={t('image')}>🖼️</ToolbarButton>
            </div>
            <div className="toolbar-group">
              <ToolbarButton onClick={() => editor?.chain().focus().undo().run()} title={t('undo')}>↩</ToolbarButton>
              <ToolbarButton onClick={() => editor?.chain().focus().redo().run()} title={t('redo')}>↪</ToolbarButton>
            </div>
          </div>

          <div className="editor-content">
            <EditorContent editor={editor} />
          </div>

          <div className="status-bar">
            <div className="status-left">
              <span>{activeDoc?.title || t('untitled')}</span>
              <span>{t('wordCount', { count: wordCount })}</span>
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
              {history.length === 0 && <div className="empty-docs">{t('noHistory')}</div>}
              {history.map(entry => (
                <div key={entry.id} className="history-item">
                  <div className="history-item-time">{formatDate(entry.timestamp)}</div>
                  <div className="history-item-actions">
                    <button className="btn" onClick={async () => { const h = (await getHistory(activeDocId!)).find(e => e.id === entry.id); if (h) restoreHistory(h.content); }} type="button">{t('restore')}</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{t('confirmDelete', { title: deleteTarget.title })}</div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowDeleteModal(false)} type="button">{t('cancel')}</button>
              <button className="btn btn-danger" onClick={() => handleDeleteDoc(deleteTarget)} type="button">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Close export menu on outside click */}
      {showExportMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowExportMenu(false)} />}
    </div>
  );
};

export default App;
