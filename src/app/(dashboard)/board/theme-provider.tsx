import React, { createContext, useContext, useState, useEffect } from 'react';

// First, let's define our theme configurations
const themes = {
  light: {
    name: 'Light',
    background: '#ffffff',
    text: '#1a1a1a',
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#0ea5e9',
    border: '#e5e7eb',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    backgroundDots: '#e5e7eb',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.9)',
  },
  dark: {
    name: 'Dark',
    background: '#1a1a1a',
    text: '#ffffff',
    primary: '#60a5fa',
    secondary: '#94a3b8',
    accent: '#38bdf8',
    border: '#374151',
    nodeBackground: '#262626',
    nodeShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
    backgroundDots: '#333333',
    controlsBackground: '#262626',
    minimapBackground: 'rgba(38, 38, 38, 0.9)',
  },
  crimson: {
    name: 'Crimson',
    background: '#fef2f2',
    text: '#7f1d1d',
    primary: '#dc2626',
    secondary: '#ef4444',
    accent: '#b91c1c',
    border: '#fecaca',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(220 38 38 / 0.1)',
    backgroundDots: '#fee2e2',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.9)',
  },
  aqua: {
    name: 'Aqua',
    background: '#ecfeff',
    text: '#164e63',
    primary: '#06b6d4',
    secondary: '#22d3ee',
    accent: '#0891b2',
    border: '#cffafe',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(6 182 212 / 0.1)',
    backgroundDots: '#a5f3fc',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.9)',
  },
  forest: {
    name: 'Forest',
    background: '#f0fdf4',
    text: '#166534',
    primary: '#22c55e',
    secondary: '#4ade80',
    accent: '#15803d',
    border: '#bbf7d0',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(34 197 94 / 0.1)',
    backgroundDots: '#86efac',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.9)',
  }
};

type ThemeNames = keyof typeof themes;
type Theme = typeof themes[ThemeNames];

interface ThemeContextType {
  theme: Theme;
  setThemeName: (name: ThemeNames) => void;
  themeName: ThemeNames;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: ThemeNames;
}> = ({ children, defaultTheme = 'light' }) => {
  const [themeName, setThemeName] = useState<ThemeNames>(defaultTheme);
  const [theme, setTheme] = useState(themes[defaultTheme]);

  useEffect(() => {
    setTheme(themes[themeName]);
    document.documentElement.style.setProperty('--background-color', themes[themeName].background);
    document.documentElement.style.setProperty('--text-color', themes[themeName].text);
    document.documentElement.classList.toggle('dark', themeName === 'dark');
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ theme, setThemeName, themeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme selector component for easy theme switching
export const ThemeSelector: React.FC = () => {
  const { themeName, setThemeName } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      {Object.keys(themes).map((name) => (
        <button
          key={name}
          onClick={() => setThemeName(name as ThemeNames)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            themeName === name ? 'scale-110 border-white' : 'border-transparent'
          }`}
          style={{
            backgroundColor: themes[name as ThemeNames].primary,
          }}
          title={themes[name as ThemeNames].name}
        />
      ))}
    </div>
  );
};

export type { Theme, ThemeNames };
export { themes };