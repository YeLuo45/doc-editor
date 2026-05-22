import { Theme, ThemeType } from './types';
import { lightTheme } from './themes/light';
import { darkTheme } from './themes/dark';
import { applyTheme } from './css-variables';

const STORAGE_KEY = 'doc-editor-theme';

class ThemeManager {
  private currentTheme: Theme;
  private themes: Map<ThemeType, Theme>;

  constructor() {
    this.themes = new Map<ThemeType, Theme>([
      ['light', lightTheme],
      ['dark', darkTheme],
    ]);
    
    const savedThemeType = localStorage.getItem(STORAGE_KEY) as ThemeType | null;
    this.currentTheme = savedThemeType ? this.themes.get(savedThemeType)! : lightTheme;
    applyTheme(this.currentTheme);
  }

  setTheme(themeType: ThemeType): void {
    const theme = this.themes.get(themeType);
    if (theme) {
      this.currentTheme = theme;
      localStorage.setItem(STORAGE_KEY, themeType);
      applyTheme(theme);
    }
  }

  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  getAvailableThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  toggleTheme(): void {
    const newType: ThemeType = this.currentTheme.id === 'light' ? 'dark' : 'light';
    this.setTheme(newType);
  }
}

export const themeManager = new ThemeManager();
