import { Editor } from '@tiptap/react';

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToMarkdown(editor: Editor): string {
  let md = '';
  editor.storage.markdown?.getMarkdown?.() ?? editor.getText().split('\n').map(line => {
    md += line + '\n';
  });
  if (!md) md = editor.getText();
  return md;
}

export function exportToHTML(editor: Editor): string {
  return editor.getHTML();
}

export async function exportToPDF(editor: Editor): Promise<void> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>document</title>
<style>
body{font-family:system-ui;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8}
</style>
</head>
<body>${editor.getHTML()}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${m}月${day}日 ${h}:${min}`;
}

export function countWords(text: string): number {
  return text.trim().replace(/\s+/g, ' ').split(' ').filter(w => w).length;
}
