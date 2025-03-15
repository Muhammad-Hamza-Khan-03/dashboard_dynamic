import React from 'react';
import { AiDashboardConfig } from './aiDashboardModal';
import { 
  Square, 
  FileText, 
  Table, 
  LineChart, 
  BarChart, 
  PieChart, 
  ScatterChart, 
  Activity,
  Database
} from 'lucide-react';

interface DashboardPreviewProps {
  config: AiDashboardConfig | null;
  scale?: number;
}

// Map of chart types to icons
const chartTypeIcons: Record<string, React.ReactNode> = {
  'line': <LineChart className="h-4 w-4" />,
  'bar': <BarChart className="h-4 w-4" />,
  'pie': <PieChart className="h-4 w-4" />,
  'scatter': <ScatterChart className="h-4 w-4" />,
  'histogram': <BarChart className="h-4 w-4" />,
  'box': <Activity className="h-4 w-4" />,
  'heatmap': <Activity className="h-4 w-4" />,
  'radar': <Activity className="h-4 w-4" />,
  'treemap': <Activity className="h-4 w-4" />
};

const DashboardPreview: React.FC<DashboardPreviewProps> = ({ config, scale = 0.5 }) => {
  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          No dashboard configuration available
        </p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 overflow-auto">
        {/* Charts */}
        {config.charts.map((chart, i) => (
          <div 
            key={`chart-${i}`}
            className="absolute border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md"
            style={{
              left: `${chart.position.x * scale}px`,
              top: `${chart.position.y * scale}px`,
              width: `${(chart.position.width || 300) * scale}px`,
              height: `${(chart.position.height || 200) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className="px-2 py-1.5 bg-blue-100 dark:bg-blue-800 border-b border-blue-400 flex items-center gap-1">
              {chartTypeIcons[chart.type] || <Square className="h-4 w-4" />}
              <div className="text-xs font-medium truncate">
                {chart.title || `Chart ${i+1}`}
              </div>
            </div>
            <div className="p-2">
              <div className="flex flex-wrap text-xs opacity-70 gap-1">
                <span className="bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded">
                  {chart.type}
                </span>
                {chart.columns.map((col, colIndex) => (
                  <span 
                    key={colIndex} 
                    className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded truncate max-w-full"
                    title={col}
                  >
                    {col}
                  </span>
                ))}
              </div>
              
              {/* Chart visualization placeholder */}
              <div className="mt-2 flex items-center justify-center h-[60%] bg-slate-50 dark:bg-slate-800 rounded border border-dashed border-slate-300 dark:border-slate-600">
                {chartTypeIcons[chart.type] || <Square className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
              </div>
            </div>
          </div>
        ))}
        
        {/* Text boxes */}
        {config.textBoxes.map((textBox, i) => (
          <div 
            key={`textbox-${i}`}
            className="absolute border-2 border-green-400 bg-green-50 dark:bg-green-900/20 rounded-md"
            style={{
              left: `${textBox.position.x * scale}px`,
              top: `${textBox.position.y * scale}px`,
              width: `${(textBox.position.width || 200) * scale}px`,
              height: `${(textBox.position.height || 100) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className="px-2 py-1.5 bg-green-100 dark:bg-green-800 border-b border-green-400 flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <div className="text-xs font-medium truncate">
                Text Box {i+1}
              </div>
            </div>
            <div className="p-2 text-xs overflow-hidden h-[calc(100%-26px)]">
              {textBox.content ? (
                <p className="line-clamp-3">{textBox.content}</p>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-slate-400 dark:text-slate-500">Text content...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Data tables */}
        {config.dataTables.map((table, i) => (
          <div 
            key={`table-${i}`}
            className="absolute border-2 border-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-md"
            style={{
              left: `${table.position.x * scale}px`,
              top: `${table.position.y * scale}px`,
              width: `${(table.position.width || 300) * scale}px`,
              height: `${(table.position.height || 200) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className="px-2 py-1.5 bg-purple-100 dark:bg-purple-800 border-b border-purple-400 flex items-center gap-1">
              <Table className="h-4 w-4" />
              <div className="text-xs font-medium truncate">
                {table.title || `Data Table ${i+1}`}
              </div>
            </div>
            <div className="p-2">
              <div className="flex flex-wrap gap-1">
                {table.columns.slice(0, 5).map((col, colIndex) => (
                  <span 
                    key={colIndex} 
                    className="bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded text-xs truncate max-w-full"
                    title={col}
                  >
                    {col}
                  </span>
                ))}
                {table.columns.length > 5 && (
                  <span className="bg-purple-100 dark:bg-purple-800 px-1.5 py-0.5 rounded text-xs">
                    +{table.columns.length - 5} more
                  </span>
                )}
              </div>
              
              {/* Table visualization placeholder */}
              <div className="mt-2 flex items-center justify-center h-[60%] bg-slate-50 dark:bg-slate-800 rounded border border-dashed border-slate-300 dark:border-slate-600">
                <Table className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
          </div>
        ))}
        
        {/* Stat cards */}
        {config.statCards.map((card, i) => (
          <div 
            key={`card-${i}`}
            className="absolute border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md"
            style={{
              left: `${card.position.x * scale}px`,
              top: `${card.position.y * scale}px`,
              width: `${(card.position.width || 200) * scale}px`,
              height: `${(card.position.height || 120) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className="px-2 py-1.5 bg-amber-100 dark:bg-amber-800 border-b border-amber-400 flex items-center gap-1">
              <Database className="h-4 w-4" />
              <div className="text-xs font-medium truncate">
                {card.title || `Stat Card ${i+1}`}
              </div>
            </div>
            <div className="p-2 flex flex-col items-center justify-center h-[calc(100%-26px)]">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                {card.statType.toUpperCase()}
              </div>
              <div className="text-xs opacity-70 text-center">
                {card.column}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPreview;