import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  zh: {
    translation: {
      appTitle: '文档编辑器',
      newDoc: '新建文档',
      untitled: '未命名文档',
      delete: '删除',
      rename: '重命名',
      export: '导出',
      exportMarkdown: '导出 Markdown',
      exportHTML: '导出 HTML',
      exportPDF: '导出 PDF',
      theme: '主题',
      light: '浅色',
      dark: '深色',
      autoSave: '自动保存',
      saved: '已保存',
      saving: '保存中...',
      history: '历史版本',
      restore: '恢复',
      noHistory: '暂无历史版本',
      confirmDelete: '确认删除文档「{{title}}」？',
      confirm: '确认',
      cancel: '取消',
      lastModified: '最后修改：{{time}}',
      wordCount: '字数：{{count}}',
      placeholder: '开始输入...',
      docList: '文档列表',
      noDocs: '暂无文档，点击左上角新建',
      bold: '粗体',
      italic: '斜体',
      underline: '下划线',
      strikethrough: '删除线',
      heading1: '标题1',
      heading2: '标题2',
      heading3: '标题3',
      bulletList: '无序列表',
      orderedList: '有序列表',
      blockquote: '引用',
      codeBlock: '代码块',
      link: '链接',
      image: '图片',
      undo: '撤销',
      redo: '重做',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  interpolation: { escapeValue: false },
});

export default i18n;
