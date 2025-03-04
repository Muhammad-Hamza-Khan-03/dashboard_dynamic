import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Palette, Sparkles } from 'lucide-react';
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
  boardTheme: Theme;
  chartTheme: Theme;
  setBoardThemeName: (name: ThemeNames) => void;
  setChartThemeName: (name: ThemeNames) => void;
  boardThemeName: ThemeNames;
  chartThemeName: ThemeNames;
  syncThemes: boolean;
  setSyncThemes: (sync: boolean) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: ThemeNames;
}> = ({ children, defaultTheme = 'light' }) => {
  const [boardThemeName, setBoardThemeName] = useState<ThemeNames>(defaultTheme);
  const [chartThemeName, setChartThemeName] = useState<ThemeNames>(defaultTheme);
  const [boardTheme, setBoardTheme] = useState(themes[defaultTheme]);
  const [chartTheme, setChartTheme] = useState(themes[defaultTheme]);
  const [syncThemes, setSyncThemes] = useState(true);

  // Update board theme and document properties
  useEffect(() => {
    const savedBoardTheme = localStorage.getItem('boardTheme');
    const savedChartTheme = localStorage.getItem('chartTheme');
    const savedSyncThemes = localStorage.getItem('syncThemes');
    
    if (savedBoardTheme && themes[savedBoardTheme as ThemeNames]) {
      setBoardThemeName(savedBoardTheme as ThemeNames);
    }
    
    if (savedChartTheme && themes[savedChartTheme as ThemeNames]) {
      setChartThemeName(savedChartTheme as ThemeNames);
    }
    
    if (savedSyncThemes !== null) {
      setSyncThemes(savedSyncThemes === 'true');
    }
  }, []);

  // Update board theme
  useEffect(() => {
    setBoardTheme(themes[boardThemeName]);
    document.documentElement.style.setProperty('--background-color', themes[boardThemeName].background);
    document.documentElement.style.setProperty('--text-color', themes[boardThemeName].text);
    document.documentElement.classList.toggle('dark', 
      ['dark', 'midnight', 'graphite', 'sapphire'].includes(boardThemeName));
    
    localStorage.setItem('boardTheme', boardThemeName);
    
    if (syncThemes) {
      setChartThemeName(boardThemeName);
    }
  }, [boardThemeName, syncThemes]);
  // Update chart theme
  useEffect(() => {
    setChartTheme(themes[chartThemeName]);
    localStorage.setItem('chartTheme', chartThemeName);
    
    if (syncThemes && chartThemeName !== boardThemeName) {
      setBoardThemeName(chartThemeName);
    }
  }, [chartThemeName, syncThemes]);

  useEffect(() => {
    localStorage.setItem('syncThemes', String(syncThemes));
  }, [syncThemes]);
  return (
    <ThemeContext.Provider value={{ 
      boardTheme, chartTheme, setBoardThemeName, setChartThemeName,
      boardThemeName, chartThemeName, syncThemes, setSyncThemes
    }}>
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

export const ThemeSelector: React.FC = () => {
  const { 
    boardThemeName, 
    chartThemeName, 
    setBoardThemeName, 
    setChartThemeName,
    syncThemes,
    setSyncThemes
  } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900"
        >
          <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-4 rounded-xl shadow-xl border border-blue-100 dark:border-blue-900"
        side="top" 
        align="end"
        sideOffset={16}
      >
        <div className="mb-4">
          <h3 className="font-medium text-sm flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span>Theme Settings</span>
          </h3>
          
          <div className="flex items-center space-x-2 bg-blue-50/50 dark:bg-blue-950/30 p-2 rounded-lg">
            <Checkbox 
              id="sync-themes" 
              checked={syncThemes} 
              onCheckedChange={(checked) => setSyncThemes(!!checked)}
              className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
            />
            <Label htmlFor="sync-themes" className="text-xs font-medium cursor-pointer">
              Sync dashboard and chart themes
            </Label>
          </div>
        </div>

        <Tabs defaultValue="board" className="w-full">
          <TabsList className="w-full mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <TabsTrigger 
              value="board" 
              className="rounded-md flex-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="chart" 
              className="rounded-md flex-1 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700" 
              disabled={syncThemes}
            >
              Charts
            </TabsTrigger>
          </TabsList>
          
          {/* Theme selection grids for board and charts */}
          <TabsContent value="board">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(themes).map(([name, theme]) => (
                <Button
                  key={`board-${name}`}
                  variant="ghost"
                  className={`h-auto py-3 px-2 rounded-lg justify-start gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    boardThemeName === name ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                  }`}
                  onClick={() => setBoardThemeName(name as ThemeNames)}
                >
                  <div 
                    className="h-6 w-6 rounded-full border shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <span className="text-xs font-medium">{theme.name}</span>
                  {boardThemeName === name && (
                    <Check className="h-3 w-3 ml-auto text-blue-500" />
                  )}
                </Button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="chart">
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-1">
                {Object.entries(themes).map(([name, theme]) => (
                  <Button
                    key={`chart-${name}`}
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2 py-3 hover:bg-accent/5"
                    onClick={() => setChartThemeName(name as ThemeNames)}
                  >
                    <div 
                      className="h-6 w-6 rounded-full border"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span className="flex-1 text-sm">{theme.name}</span>
                    {chartThemeName === name && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export type { Theme, ThemeNames };
export { themes };