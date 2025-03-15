import React from 'react';
import { layoutTemplates, LayoutTemplate } from './layoutTemplate';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Grid2Icon, Grid3Icon, Grid4Icon, ExecutiveIcon, FeatureFocusIcon, AnalyticalIcon } from './layout-icons';
import { LayoutGrid } from 'lucide-react';

interface LayoutSelectorProps {
  selectedLayout: string;
  onSelectLayout: (layoutId: string) => void;
}

// Map of layout IDs to custom SVG icons
const layoutIcons: Record<string, React.ReactNode> = {
  'grid-2': <Grid2Icon />,
  'grid-3': <Grid3Icon />,
  'grid-4': <Grid4Icon />,
  'executive': <ExecutiveIcon />,
  'feature-focus': <FeatureFocusIcon />,
  'analytical': <AnalyticalIcon />
};

const LayoutSelector: React.FC<LayoutSelectorProps> = ({ 
  selectedLayout, 
  onSelectLayout 
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium mb-3">Select Dashboard Layout</h3>
      
      <RadioGroup
        value={selectedLayout}
        onValueChange={onSelectLayout}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
      >
        {layoutTemplates.map((template) => (
          <div key={template.id} className="relative">
            <RadioGroupItem
              value={template.id}
              id={`layout-${template.id}`}
              className="sr-only"
            />
            <Label
              htmlFor={`layout-${template.id}`}
              className="block cursor-pointer"
            >
              <Card className={`
                p-4 h-full flex flex-col items-center justify-center text-center
                hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                ${selectedLayout === template.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
              `}>
                {layoutIcons[template.id] || <LayoutGrid className="h-8 w-8 mb-2 text-gray-400" />}
                <span className="text-sm font-medium mb-1">{template.name}</span>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </Card>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default LayoutSelector;