// Deutsch — formelle Anrede ("Sie"), kanonische Tech-Fachbegriffe beibehalten
import type { TranslationKey } from './types';

export const de: Record<TranslationKey, string> = {
  // App / brand
  'app.brand': 'doc-editor',
  'app.subtitle': 'Multi-Agenten-Dokumentzusammenarbeit',

  // Sidebar
  'sidebar.section.workspace': 'Arbeitsbereich',
  'sidebar.section.live': 'Live-Status',
  'sidebar.nav.editor': 'Editor',
  'sidebar.nav.dreamMemory': 'Traumgedächtnis',
  'sidebar.nav.agentCanvas': 'Agenten-Leinwand',
  'sidebar.nav.writingCoach': 'Schreibcoach',
  'sidebar.nav.settings': 'Einstellungen',
  'sidebar.footer.modulesLive': '{count} Module · aktiv',

  // Sidebar live status
  'sidebar.live.wakePhase': 'Wachphase',
  'sidebar.live.dreamPhase': 'Traumphase',
  'sidebar.live.crossSessionOn': 'Sitzungsübergreifendes Gedächtnis aktiviert',
  'sidebar.live.crossSessionOff': 'Sitzungsübergreifendes Gedächtnis deaktiviert',

  // Topbar
  'topbar.eyebrow.editor': 'Arbeitsbereich',
  'topbar.eyebrow.memory': 'Gedächtnis',
  'topbar.eyebrow.workflow': 'Arbeitsablauf',
  'topbar.eyebrow.productivity': 'Produktivität',
  'topbar.eyebrow.system': 'System',
  'topbar.title.editor': 'Editor',
  'topbar.title.dreamDashboard': 'Traum-Dashboard',
  'topbar.title.agentCanvas': 'Agenten-Leinwand',
  'topbar.title.writingCoach': 'Schreibcoach',
  'topbar.title.settings': 'Einstellungen',
  'topbar.action.showDashboard': 'Dashboard anzeigen',
  'topbar.action.hideDashboard': 'Dashboard ausblenden',
  'topbar.action.syncStatus': 'Sync-Status',
  'topbar.action.openCanvas': 'Leinwand öffnen',
  'topbar.action.closeCanvas': 'Leinwand schließen',
  'topbar.action.coach': 'Coach',

  // Main / welcome
  'welcome.eyebrow': 'Arbeitsbereich',
  'welcome.title': 'Eine Multi-Agenten-Autorenumgebung, die mitdenkt.',
  'welcome.subtitle': 'Sitzungsübergreifendes Traumgedächtnis, geschichtete Kontextverdichtung, Agenten-Leinwand und ein lernfähiger Schreibcoach. Starten Sie einen Thread, um das System aufzuwecken.',
  'welcome.meta.modules': '{count} Module verkabelt',
  'welcome.quickAction.openCanvas.title': 'Leinwand öffnen',
  'welcome.quickAction.openCanvas.desc': 'Agenten und Phasenknoten visuell skizzieren',
  'welcome.quickAction.dreamMemory.title': 'Traumgedächtnis ansehen',
  'welcome.quickAction.dreamMemory.desc': 'Phasen, Archive und L3-Fähigkeiten prüfen',
  'welcome.quickAction.writingCoach.title': 'Schreibcoach starten',
  'welcome.quickAction.writingCoach.desc': 'Stil analysieren, Umschreibungen vorschlagen',
  'welcome.quickAction.featureFlags.title': 'Funktionsschalter umlegen',
  'welcome.quickAction.featureFlags.desc': 'Experimentelle Subsysteme konfigurieren',

  // Chat composer
  'composer.placeholder': 'Nachricht eingeben, Enter zum Senden, Shift+Enter für neue Zeile',
  'composer.action.clear': 'Leeren',
  'composer.action.send': 'Senden',
  'composer.role.you': 'Sie',
  'composer.role.assistant': 'Assistent',

  // Inspector
  'inspector.tab.status': 'Status',
  'inspector.tab.flags': 'Schalter',
  'inspector.tab.memory': 'Gedächtnis',
  'inspector.card.runtime': 'Laufzeit',
  'inspector.card.featureFlags': 'Funktionsschalter',
  'inspector.runtime.phase': 'Phase',
  'inspector.runtime.dreamMemory': 'Traumgedächtnis',
  'inspector.runtime.autoCompact': 'Auto-Verdichtung',
  'inspector.runtime.layeredMemory': 'Geschichtetes Gedächtnis',
  'inspector.runtime.sessionArchive': 'Sitzungsarchiv',
  'inspector.value.on': 'an',
  'inspector.value.off': 'aus',
  'inspector.pill.live': 'aktiv',

  // Meta Rules card
  'metaRules.title': 'Meta-Regeln',
  'metaRules.subtitle': 'Editor-Einschränkungen',
  'metaRules.rule.editorStructure': 'Löschen der Dokumentkernstruktur verboten',
  'metaRules.rule.completeCriteria': 'Jede Aktion benötigt ein eigenes Fertigstellungs-Kriterium',
  'metaRules.rule.loadFromStorage': 'Nicht aus dem Gedächtnis ausführen — stets aus dem Speicher laden',

  // Settings
  'settings.tab.general': 'Allgemein',
  'settings.tab.appearance': 'Erscheinungsbild',
  'settings.tab.about': 'Über',
  'settings.general.title': 'Allgemeine Einstellungen',
  'settings.general.language': 'Sprache',
  'settings.general.languageDesc': 'Anzeigesprache der Benutzeroberfläche wählen',
  'settings.appearance.title': 'Erscheinungsbild-Einstellungen',
  'settings.appearance.theme': 'Design',
  'settings.appearance.themeDesc': 'Derzeit im Dunkelmodus',
  'settings.about.title': 'Über doc-editor',
  'settings.about.version': 'Version {version}',
  'settings.about.modules': '{count} Module verkabelt',
  'settings.about.description': 'Ein Multi-Agenten-Dokumentkollaborations-Tool mit sitzungsübergreifendem Gedächtnis, Agenten-Leinwand und Schreibcoach.',

  // Language switcher
  'language.zh-CN': '简体中文',
  'language.zh-TW': '繁體中文',
  'language.de': 'Deutsch',
  'language.nativeName.zh-CN': '简体中文',
  'language.nativeName.zh-TW': '繁體中文',
  'language.nativeName.de': 'Deutsch',
};
