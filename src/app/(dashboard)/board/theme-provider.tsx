import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Palette } from 'lucide-react';
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
  // New sophisticated gray themes
  platinum: {
    name: 'Platinum',
    background: '#f8fafc',
    text: '#334155',
    primary: '#64748b',
    secondary: '#94a3b8',
    accent: '#475569',
    border: '#e2e8f0',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(100 116 139 / 0.1)',
    backgroundDots: '#cbd5e1',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(248, 250, 252, 0.95)',
  },
  graphite: {
    name: 'Graphite',
    background: '#1e293b',
    text: '#e2e8f0',
    primary: '#94a3b8',
    secondary: '#64748b',
    accent: '#cbd5e1',
    border: '#334155',
    nodeBackground: '#0f172a',
    nodeShadow: '0 4px 6px -1px rgb(15 23 42 / 0.3)',
    backgroundDots: '#334155',
    controlsBackground: '#0f172a',
    minimapBackground: 'rgba(15, 23, 42, 0.95)',
  },
  // New blue themes
  azure: {
    name: 'Azure',
    background: '#f0f9ff',
    text: '#0c4a6e',
    primary: '#0ea5e9',
    secondary: '#38bdf8',
    accent: '#0284c7',
    border: '#bae6fd',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(14 165 233 / 0.1)',
    backgroundDots: '#7dd3fc',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.9)',
  },
  sapphire: {
    name: 'Sapphire',
    background: '#172554',
    text: '#bfdbfe',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    accent: '#2563eb',
    border: '#1e40af',
    nodeBackground: '#1e3a8a',
    nodeShadow: '0 4px 6px -1px rgb(30 58 138 / 0.3)',
    backgroundDots: '#1e40af',
    controlsBackground: '#1e3a8a',
    minimapBackground: 'rgba(30, 58, 138, 0.95)',
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
  // New modern dashboard themes
  frost: {
    name: 'Frost',
    background: '#f8fafc',
    text: '#0f172a',
    primary: '#38bdf8',
    secondary: '#7dd3fc',
    accent: '#0ea5e9',
    border: '#e2e8f0',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(56 189 248 / 0.1)',
    backgroundDots: '#bae6fd',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.95)',
  },
  midnight: {
    name: 'Midnight',
    background: '#020617',
    text: '#e2e8f0',
    primary: '#818cf8',
    secondary: '#a5b4fc',
    accent: '#6366f1',
    border: '#1e293b',
    nodeBackground: '#0f172a',
    nodeShadow: '0 4px 6px -1px rgb(99 102 241 / 0.3)',
    backgroundDots: '#1e293b',
    controlsBackground: '#0f172a',
    minimapBackground: 'rgba(15, 23, 42, 0.95)',
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
  },
  // New professional dashboard theme
  corporate: {
    name: 'Corporate',
    background: '#f9fafb',
    text: '#111827',
    primary: '#4f46e5',
    secondary: '#6366f1',
    accent: '#4338ca',
    border: '#e5e7eb',
    nodeBackground: '#ffffff',
    nodeShadow: '0 4px 6px -1px rgb(79 70 229 / 0.1)',
    backgroundDots: '#e0e7ff',
    controlsBackground: '#ffffff',
    minimapBackground: 'rgba(255, 255, 255, 0.95)',
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
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed bottom-4 right-4 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-2" 
        side="top" 
        align="end"
      >
        <ScrollArea className="h-auto max-h-[300px]">
          <div className="space-y-1">
            {Object.entries(themes).map(([name, theme]) => (
              <Button
                key={name}
                variant="ghost"
                className="w-full justify-start gap-2 px-2 py-4 hover:bg-accent/5"
                onClick={() => setThemeName(name as ThemeNames)}
              >
                <div 
                  className="h-6 w-6 rounded-full border"
                  style={{ backgroundColor: theme.primary }}
                />
                <span className="flex-1 text-sm">{theme.name}</span>
                {themeName === name && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export type { Theme, ThemeNames };
export { themes };