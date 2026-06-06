// 简体中文 — 默认语言
import type { TranslationKey } from './types';

export const zhCN: Record<TranslationKey, string> = {
  // App / brand
  'app.brand': 'doc-editor',
  'app.subtitle': '多智能体文档协作',

  // Sidebar
  'sidebar.section.workspace': '工作区',
  'sidebar.section.live': '实时状态',
  'sidebar.nav.editor': '编辑器',
  'sidebar.nav.dreamMemory': '梦境记忆',
  'sidebar.nav.agentCanvas': '智能体画布',
  'sidebar.nav.writingCoach': '写作教练',
  'sidebar.nav.settings': '设置',
  'sidebar.footer.modulesLive': '{count} 个模块 · 运行中',

  // Sidebar live status
  'sidebar.live.wakePhase': '清醒阶段',
  'sidebar.live.dreamPhase': '梦境阶段',
  'sidebar.live.crossSessionOn': '跨会话记忆已启用',
  'sidebar.live.crossSessionOff': '跨会话记忆已关闭',

  // Topbar
  'topbar.eyebrow.editor': '工作区',
  'topbar.eyebrow.memory': '记忆',
  'topbar.eyebrow.workflow': '工作流',
  'topbar.eyebrow.productivity': '生产力',
  'topbar.eyebrow.system': '系统',
  'topbar.title.editor': '编辑器',
  'topbar.title.dreamDashboard': '梦境仪表板',
  'topbar.title.agentCanvas': '智能体画布',
  'topbar.title.writingCoach': '写作教练',
  'topbar.title.settings': '设置',
  'topbar.action.showDashboard': '显示仪表板',
  'topbar.action.hideDashboard': '隐藏仪表板',
  'topbar.action.syncStatus': '同步状态',
  'topbar.action.openCanvas': '打开画布',
  'topbar.action.closeCanvas': '关闭画布',
  'topbar.action.coach': '教练',

  // Main / welcome
  'welcome.eyebrow': '工作区',
  'welcome.title': '一个与你同思的多智能体创作平台。',
  'welcome.subtitle': '跨会话梦境记忆、分层上下文压缩、智能体画布与不断演化的写作教练。开始一次对话以唤醒系统。',
  'welcome.meta.modules': '{count} 个模块已接入',
  'welcome.quickAction.openCanvas.title': '打开画布',
  'welcome.quickAction.openCanvas.desc': '可视化勾画智能体与阶段节点',
  'welcome.quickAction.dreamMemory.title': '查看梦境记忆',
  'welcome.quickAction.dreamMemory.desc': '检视阶段、归档与 L3 技能',
  'welcome.quickAction.writingCoach.title': '启动写作教练',
  'welcome.quickAction.writingCoach.desc': '分析风格并提供改写建议',
  'welcome.quickAction.featureFlags.title': '切换功能开关',
  'welcome.quickAction.featureFlags.desc': '配置实验性子系统',

  // Chat composer
  'composer.placeholder': '输入消息，按回车发送，Shift+回车换行',
  'composer.action.clear': '清空',
  'composer.action.send': '发送',
  'composer.role.you': '你',
  'composer.role.assistant': '助手',

  // Inspector
  'inspector.tab.status': '状态',
  'inspector.tab.flags': '开关',
  'inspector.tab.memory': '记忆',
  'inspector.card.runtime': '运行时',
  'inspector.card.featureFlags': '功能开关',
  'inspector.runtime.phase': '阶段',
  'inspector.runtime.dreamMemory': '梦境记忆',
  'inspector.runtime.autoCompact': '自动压缩',
  'inspector.runtime.layeredMemory': '分层记忆',
  'inspector.runtime.sessionArchive': '会话归档',
  'inspector.value.on': '开',
  'inspector.value.off': '关',
  'inspector.pill.live': '运行中',

  // Meta Rules card
  'metaRules.title': '元规则',
  'metaRules.subtitle': '编辑器约束',
  'metaRules.rule.editorStructure': '禁止删除文档核心结构',
  'metaRules.rule.completeCriteria': '每项操作必须有独立完成判据',
  'metaRules.rule.loadFromStorage': '禁止凭记忆执行——必须从存储加载',

  // Settings
  'settings.tab.general': '通用',
  'settings.tab.appearance': '外观',
  'settings.tab.about': '关于',
  'settings.general.title': '通用设置',
  'settings.general.language': '语言',
  'settings.general.languageDesc': '选择界面显示语言',
  'settings.appearance.title': '外观设置',
  'settings.appearance.theme': '主题',
  'settings.appearance.themeDesc': '当前为深色模式',
  'settings.about.title': '关于 doc-editor',
  'settings.about.version': '版本 {version}',
  'settings.about.modules': '{count} 个模块已接入',
  'settings.about.description': '一个多智能体文档协作工具，集成跨会话记忆、智能体画布与写作教练。',

  // Language switcher
  'language.zh-CN': '简体中文',
  'language.zh-TW': '繁體中文',
  'language.de': 'Deutsch',
  'language.nativeName.zh-CN': '简体中文',
  'language.nativeName.zh-TW': '繁體中文',
  'language.nativeName.de': 'Deutsch',
};
