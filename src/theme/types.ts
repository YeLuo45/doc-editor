export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    border: string;
    error: string;
    success: string;
  };
  fonts: {
    primary: string;
    monospace: string;
  };
}

export type ThemeType = 'light' | 'dark';
