import React, { createContext, useContext, useState, useEffect } from 'react';
import './themes.css';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';
export type FontSize = 'normal' | 'large' | 'extra-large';

interface ThemeContextType {
  theme: ThemeMode;
  fontSize: FontSize;
  setTheme: (theme: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  defaultFontSize?: FontSize;
}

/**
 * Theme provider for accessible high-contrast themes
 * Supports light, dark, and high-contrast modes
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  defaultFontSize = 'normal',
}) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('healthcare-theme');
    return (saved as ThemeMode) || defaultTheme;
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const saved = localStorage.getItem('healthcare-font-size');
    return (saved as FontSize) || defaultFontSize;
  });

  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.className = `theme-${theme} font-size-${fontSize}`;
    
    // Save to localStorage
    localStorage.setItem('healthcare-theme', theme);
    localStorage.setItem('healthcare-font-size', fontSize);
  }, [theme, fontSize]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setFontSize = (newSize: FontSize) => {
    setFontSizeState(newSize);
  };

  return (
    <ThemeContext.Provider value={{ theme, fontSize, setTheme, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};
