# 文档编辑器

一款简洁高效的 Web 富文本编辑器，基于 React + Tiptap 构建。

**访问地址**: https://yeluo45.github.io/doc-editor/

**GitHub 仓库**: https://github.com/YeLuo45/doc-editor

---

## 功能特性

### 富文本编辑
- **文本格式**: 加粗、斜体、下划线、删除线
- **标题**: H1 / H2 / H3
- **列表**: 无序列表、有序列表
- **块级元素**: 引用、代码块
- **媒体**: 链接、图片
- **操作**: 撤销、重做

### 文档管理
- 侧边栏文档列表（按最后修改时间排序）
- 新建、删除、重命名文档
- **文件夹分类**: 创建文件夹，将文档移动到文件夹
- **标签分类**: 为文档添加标签，通过标签筛选文档
- **三视图切换**: 全部文档 / 文件夹 / 标签

### 自动保存
- 编辑后自动保存（2秒防抖）
- `Ctrl+S` 手动保存
- localStorage + IndexedDB 本地持久化

### 历史版本
- 每30秒自动保存历史快照
- 随时恢复历史版本
- 保留最近20个历史记录

### 导出
- **Markdown** 格式导出
- **HTML** 格式导出（带样式）
- **PDF** 打印导出（调用浏览器打印）

### 主题
- 浅色 / 深色模式切换
- 记住用户偏好

### 本地化
- 完整中文界面

---

## 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | UI 框架 |
| Vite 5 | 构建工具 |
| TypeScript | 类型安全 |
| @tiptap/react | 富文本编辑器核心 |
| lowlight | 代码语法高亮 |
| i18next | 国际化 |
| idb | IndexedDB 封装 |
| uuid | 文档 ID 生成 |

---

## 本地运行

```bash
cd doc-editor
npm install
npm run dev
```

---

## 目录结构

```
src/
├── App.tsx       # 主应用组件
├── main.tsx      # 入口文件
├── index.css     # 全局样式
├── i18n.ts       # 国际化配置
├── db.ts         # IndexedDB 数据层
├── types/        # TypeScript 类型
│   └── index.ts
└── utils.ts      # 工具函数（导出/格式化）
```
