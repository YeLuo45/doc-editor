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

export function exportToJSON(editor: Editor, title: string): string {
  const doc = {
    title,
    content: editor.getHTML(),
    text: editor.getText(),
    wordCount: countWords(editor.getText()),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  return JSON.stringify(doc, null, 2);
}

export function exportToLaTeX(editor: Editor): string {
  const html = editor.getHTML();
  let tex = html
    // 标题
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\\section{$1}\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\\subsection{$1}\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\\subsubsection{$1}\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\\paragraph{$1}\n')
    // 粗体斜体
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '\\textbf{$1}')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '\\textbf{$1}')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '\\textit{$1}')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '\\textit{$1}')
    // 链接
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '\\href{$1}{$2}')
    // 列表
    .replace(/<ul[^>]*>/gi, '\\begin{itemize}\n')
    .replace(/<\/ul>/gi, '\\end{itemize}\n')
    .replace(/<ol[^>]*>/gi, '\\begin{enumerate}\n')
    .replace(/<\/ol>/gi, '\\end{enumerate}\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\\item $1\n')
    // 代码
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '\\texttt{$1}')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '\\begin{verbatim}$1\\end{verbatim}\n')
    // 段落
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // 换行
    .replace(/<br\s*\/?>/gi, '\\\\\n')
    // 清理残留标签
    .replace(/<[^>]+>/g, '')
    // 清理多余空白
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{hyperref}\n\\usepackage{xeCJK}\n\\begin{document}\n\n${tex}\n\n\\end{document}`;
}

export function exportToDOCX(editor: Editor, title: string): Blob {
  // 生成 Word 可打开的 HTML 文件（.docx 实际上接受 HTML 格式）
  const html = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="urn:schemas-microsoft-com:office:word">
<w:body>
<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
${htmlToWordXml(editor.getHTML())}
</w:body>
</w:wordDocument>`;
  return new Blob([html], { type: 'application/vnd.ms-word' });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlToWordXml(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>$1</w:t></w:r></w:p>')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>$1</w:t></w:r></w:p>')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>$1</w:t></w:r></w:p>')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '<w:p><w:r><w:t>$1</w:t></w:r></w:p>')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '<w:r><w:rPr><w:b/></w:rPr><w:t>$1</w:t></w:r>')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '<w:r><w:rPr><w:b/></w:rPr><w:t>$1</w:t></w:r>')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '<w:r><w:rPr><w:i/></w:rPr><w:t>$1</w:t></w:r>')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '<w:r><w:rPr><w:i/></w:rPr><w:t>$1</w:t></w:r>')
    .replace(/<br\s*\/?>/gi, '<w:r><w:br/></w:r>')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>$1</w:t></w:r></w:p>')
    .replace(/<[^>]+>/g, '');
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
