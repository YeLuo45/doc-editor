import { Theme } from './types';

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-secondary', theme.colors.secondary);
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-surface', theme.colors.surface);
  root.style.setProperty('--color-text', theme.colors.text);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-error', theme.colors.error);
  root.style.setProperty('--color-success', theme.colors.success);
  
  root.style.setProperty('--font-primary', theme.fonts.primary);
  root.style.setProperty('--font-monospace', theme.fonts.monospace);
}
