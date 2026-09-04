import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme } from '../types.js';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('telemetry_dashboard_theme') as Theme | null;
      if (stored === 'light' || stored === 'dark') return stored;
      return 'dark';
    }
    return 'dark';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('telemetry_dashboard_theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('telemetry_dashboard_theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    const isLight = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
    return {
      theme: (isLight ? 'light' : 'dark') as Theme,
      toggleTheme: () => {
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          const isCurrentDark = root.classList.contains('dark') || !root.classList.contains('light');
          const next = isCurrentDark ? 'light' : 'dark';
          if (next === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
          } else {
            root.classList.add('light');
            root.classList.remove('dark');
          }
          localStorage.setItem('telemetry_dashboard_theme', next);
        }
      },
      setTheme: (t: Theme) => {
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          if (t === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
          } else {
            root.classList.add('light');
            root.classList.remove('dark');
          }
          localStorage.setItem('telemetry_dashboard_theme', t);
        }
      },
    };
  }
  return context;
};
