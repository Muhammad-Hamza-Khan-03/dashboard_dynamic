import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Palette } from 'lucide-react';
import { useTheme, themes, ThemeNames } from './theme-provider';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check } from 'lucide-react';

export const ThemeSelector: React.FC = () => {
  const { boardThemeName:themeName, setBoardThemeName:setThemeName } = useTheme();

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

export default ThemeSelector;