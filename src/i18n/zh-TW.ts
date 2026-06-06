// 繁體中文 — 臺灣 / 香港慣用譯法
import type { TranslationKey } from './types';

export const zhTW: Record<TranslationKey, string> = {
  // App / brand
  'app.brand': 'doc-editor',
  'app.subtitle': '多代理文件協作',

  // Sidebar
  'sidebar.section.workspace': '工作區',
  'sidebar.section.live': '即時狀態',
  'sidebar.nav.editor': '編輯器',
  'sidebar.nav.dreamMemory': '夢境記憶',
  'sidebar.nav.agentCanvas': '代理畫布',
  'sidebar.nav.writingCoach': '寫作教練',
  'sidebar.nav.settings': '設定',
  'sidebar.footer.modulesLive': '{count} 個模組 · 執行中',

  // Sidebar live status
  'sidebar.live.wakePhase': '清醒階段',
  'sidebar.live.dreamPhase': '夢境階段',
  'sidebar.live.crossSessionOn': '跨會話記憶已啟用',
  'sidebar.live.crossSessionOff': '跨會話記憶已關閉',

  // Topbar
  'topbar.eyebrow.editor': '工作區',
  'topbar.eyebrow.memory': '記憶',
  'topbar.eyebrow.workflow': '工作流程',
  'topbar.eyebrow.productivity': '生產力',
  'topbar.eyebrow.system': '系統',
  'topbar.title.editor': '編輯器',
  'topbar.title.dreamDashboard': '夢境儀表板',
  'topbar.title.agentCanvas': '代理畫布',
  'topbar.title.writingCoach': '寫作教練',
  'topbar.title.settings': '設定',
  'topbar.action.showDashboard': '顯示儀表板',
  'topbar.action.hideDashboard': '隱藏儀表板',
  'topbar.action.syncStatus': '同步狀態',
  'topbar.action.openCanvas': '開啟畫布',
  'topbar.action.closeCanvas': '關閉畫布',
  'topbar.action.coach': '教練',

  // Main / welcome
  'welcome.eyebrow': '工作區',
  'welcome.title': '一個與你同思的多代理創作平臺。',
  'welcome.subtitle': '跨會話夢境記憶、分層上下文壓縮、代理畫布與不斷演化的寫作教練。開啟一段對話以喚醒系統。',
  'welcome.meta.modules': '{count} 個模組已接入',
  'welcome.quickAction.openCanvas.title': '開啟畫布',
  'welcome.quickAction.openCanvas.desc': '視覺化勾勒代理與階段節點',
  'welcome.quickAction.dreamMemory.title': '檢視夢境記憶',
  'welcome.quickAction.dreamMemory.desc': '查看階段、封存與 L3 技能',
  'welcome.quickAction.writingCoach.title': '啟動寫作教練',
  'welcome.quickAction.writingCoach.desc': '分析風格並提供改寫建議',
  'welcome.quickAction.featureFlags.title': '切換功能開關',
  'welcome.quickAction.featureFlags.desc': '設定實驗性子系統',

  // Chat composer
  'composer.placeholder': '輸入訊息，按 Enter 送出，Shift+Enter 換行',
  'composer.action.clear': '清除',
  'composer.action.send': '送出',
  'composer.role.you': '你',
  'composer.role.assistant': '助手',

  // Inspector
  'inspector.tab.status': '狀態',
  'inspector.tab.flags': '開關',
  'inspector.tab.memory': '記憶',
  'inspector.card.runtime': '執行階段',
  'inspector.card.featureFlags': '功能開關',
  'inspector.runtime.phase': '階段',
  'inspector.runtime.dreamMemory': '夢境記憶',
  'inspector.runtime.autoCompact': '自動壓縮',
  'inspector.runtime.layeredMemory': '分層記憶',
  'inspector.runtime.sessionArchive': '會話封存',
  'inspector.value.on': '開',
  'inspector.value.off': '關',
  'inspector.pill.live': '執行中',

  // Meta Rules card
  'metaRules.title': '中繼規則',
  'metaRules.subtitle': '編輯器約束',
  'metaRules.rule.editorStructure': '禁止刪除文件核心結構',
  'metaRules.rule.completeCriteria': '每項操作必須有獨立完成判據',
  'metaRules.rule.loadFromStorage': '禁止憑記憶執行——必須從儲存載入',

  // Settings
  'settings.tab.general': '一般',
  'settings.tab.appearance': '外觀',
  'settings.tab.about': '關於',
  'settings.general.title': '一般設定',
  'settings.general.language': '語言',
  'settings.general.languageDesc': '選擇介面顯示語言',
  'settings.appearance.title': '外觀設定',
  'settings.appearance.theme': '主題',
  'settings.appearance.themeDesc': '目前為深色模式',
  'settings.about.title': '關於 doc-editor',
  'settings.about.version': '版本 {version}',
  'settings.about.modules': '{count} 個模組已接入',
  'settings.about.description': '一個多代理文件協作工具，整合跨會話記憶、代理畫布與寫作教練。',

  // Language switcher
  'language.zh-CN': '简体中文',
  'language.zh-TW': '繁體中文',
  'language.de': 'Deutsch',
  'language.nativeName.zh-CN': '简体中文',
  'language.nativeName.zh-TW': '繁體中文',
  'language.nativeName.de': 'Deutsch',
};
