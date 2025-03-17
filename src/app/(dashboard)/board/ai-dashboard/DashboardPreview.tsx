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
  Database,
  TrendingUp
} from 'lucide-react';

interface DashboardPreviewProps {
  config: AiDashboardConfig | null;
  scale?: number;
  isDarkMode?: boolean;
}

// Enhanced map of chart types to icons with consistent styling
const chartTypeIcons: Record<string, React.ReactNode> = {
  'line': <LineChart className="h-5 w-5" />,
  'bar': <BarChart className="h-5 w-5" />,
  'pie': <PieChart className="h-5 w-5" />,
  'scatter': <ScatterChart className="h-5 w-5" />,
  'histogram': <BarChart className="h-5 w-5" />,
  'box': <Activity className="h-5 w-5" />,
  'heatmap': <TrendingUp className="h-5 w-5" />,
  'radar': <Activity className="h-5 w-5" />,
  'treemap': <Square className="h-5 w-5" />
};

const DashboardPreview: React.FC<DashboardPreviewProps> = ({ 
  config, 
  scale = 0.5,
  isDarkMode = false
}) => {
  if (!config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          No dashboard configuration available
        </p>
      </div>
    );
  }
  
  // Color theme based on mode
  const colors = isDarkMode ? {
    chart: {
      border: 'border-blue-700',
      bg: 'bg-blue-950/30',
      header: 'bg-blue-900/60',
      tag: 'bg-blue-900/80'
    },
    textBox: {
      border: 'border-green-700',
      bg: 'bg-green-950/30',
      header: 'bg-green-900/60'
    },
    dataTable: {
      border: 'border-purple-700',
      bg: 'bg-purple-950/30',
      header: 'bg-purple-900/60',
      tag: 'bg-purple-900/80'
    },
    statCard: {
      border: 'border-amber-700',
      bg: 'bg-amber-950/30',
      header: 'bg-amber-900/60'
    }
  } : {
    chart: {
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      header: 'bg-blue-100',
      tag: 'bg-blue-200'
    },
    textBox: {
      border: 'border-green-400',
      bg: 'bg-green-50',
      header: 'bg-green-100'
    },
    dataTable: {
      border: 'border-purple-400',
      bg: 'bg-purple-50',
      header: 'bg-purple-100',
      tag: 'bg-purple-200'
    },
    statCard: {
      border: 'border-amber-400',
      bg: 'bg-amber-50',
      header: 'bg-amber-100'
    }
  };
  
  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className={`absolute inset-0 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-100'} overflow-auto`}>
        {/* Background grid for visual reference */}
        <div className="absolute inset-0 grid grid-cols-12 gap-4 p-4 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={`h-full ${isDarkMode ? 'border-l border-slate-800' : 'border-l border-gray-200'}`}></div>
          ))}
        </div>
        
        {/* Charts */}
        {config.charts.map((chart, i) => (
          <div 
            key={`chart-${i}`}
            className={`absolute rounded-lg shadow-md border-2 ${colors.chart.border} ${colors.chart.bg} transition-all duration-300 overflow-hidden`}
            style={{
              left: `${chart.position.x * scale}px`,
              top: `${chart.position.y * scale}px`,
              width: `${(chart.position.width || 300) * scale}px`,
              height: `${(chart.position.height || 200) * scale}px`,
              transformOrigin: 'top left',
              transition: 'all 0.3s ease-in-out'
            }}
          >
            <div className={`px-3 py-2 ${colors.chart.header} flex items-center gap-1.5 border-b ${colors.chart.border}`}>
              {chartTypeIcons[chart.type] || <Square className="h-5 w-5" />}
              <div className="text-xs font-medium truncate flex-1">
                {chart.title || `Chart ${i+1}`}
              </div>
            </div>
            <div className="p-2">
              <div className="flex flex-wrap text-xs gap-1.5">
                <span className={`${colors.chart.tag} px-2 py-1 rounded font-medium`}>
                  {chart.type}
                </span>
                {chart.columns.slice(0, 3).map((col, colIndex) => (
                  <span 
                    key={colIndex} 
                    className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} px-2 py-1 rounded truncate max-w-full`}
                    title={col}
                  >
                    {col}
                  </span>
                ))}
                {chart.columns.length > 3 && (
                  <span className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                    +{chart.columns.length - 3} more
                  </span>
                )}
              </div>
              
              {/* Chart visualization placeholder with gradient background to look more realistic */}
              <div className={`mt-3 flex items-center justify-center h-[60%] rounded relative overflow-hidden 
                              ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border border-dashed 
                              ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                <div className="absolute inset-0 opacity-30">
                  {chart.type === 'line' && (
                    <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                      <linearGradient id={`chartGradient-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                      </linearGradient>
                      <path 
                        d="M0,50 L0,30 C10,25 30,40 50,20 C70,0 90,15 100,10 L100,50 Z" 
                        fill={`url(#chartGradient-${i})`} 
                      />
                      <path 
                        d="M0,30 C10,25 30,40 50,20 C70,0 90,15 100,10" 
                        fill="none" 
                        stroke="#3B82F6" 
                        strokeWidth="2" 
                      />
                    </svg>
                  )}
                  {chart.type === 'bar' && (
                    <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
                      <rect x="5" y="10" width="10" height="40" fill="#3B82F6" fillOpacity="0.7" rx="1" />
                      <rect x="25" y="5" width="10" height="45" fill="#3B82F6" fillOpacity="0.8" rx="1" />
                      <rect x="45" y="20" width="10" height="30" fill="#3B82F6" fillOpacity="0.7" rx="1" />
                      <rect x="65" y="15" width="10" height="35" fill="#3B82F6" fillOpacity="0.8" rx="1" />
                      <rect x="85" y="25" width="10" height="25" fill="#3B82F6" fillOpacity="0.7" rx="1" />
                    </svg>
                  )}
                  {chart.type === 'pie' && (
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="20" />
                      <path d="M50,50 L50,10 A40,40 0 0,1 90,50 Z" fill="#3B82F6" />
                      <path d="M50,50 L90,50 A40,40 0 0,1 50,90 Z" fill="#60A5FA" />
                      <path d="M50,50 L50,90 A40,40 0 0,1 10,50 Z" fill="#93C5FD" />
                      <path d="M50,50 L10,50 A40,40 0 0,1 50,10 Z" fill="#DBEAFE" />
                    </svg>
                  )}
                </div>
                {chartTypeIcons[chart.type] || <Square className={`h-8 w-8 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`} />}
              </div>
            </div>
          </div>
        ))}
        
        {/* Text boxes */}
        {config.textBoxes.map((textBox, i) => (
          <div 
            key={`textbox-${i}`}
            className={`absolute rounded-lg shadow-md border-2 ${colors.textBox.border} ${colors.textBox.bg} transition-all duration-300`}
            style={{
              left: `${textBox.position.x * scale}px`,
              top: `${textBox.position.y * scale}px`,
              width: `${(textBox.position.width || 200) * scale}px`,
              height: `${(textBox.position.height || 100) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className={`px-3 py-2 ${colors.textBox.header} flex items-center gap-1.5 border-b ${colors.textBox.border}`}>
              <FileText className="h-5 w-5" />
              <div className="text-xs font-medium truncate">
                Text Box {i+1}
              </div>
            </div>
            <div className="p-3 text-xs overflow-hidden h-[calc(100%-34px)]">
              {textBox.content ? (
                <p className="line-clamp-4">{textBox.content}</p>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className={isDarkMode ? "text-slate-500" : "text-slate-400"}>Text content...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Data tables */}
        {config.dataTables.map((table, i) => (
          <div 
            key={`table-${i}`}
            className={`absolute rounded-lg shadow-md border-2 ${colors.dataTable.border} ${colors.dataTable.bg} transition-all duration-300`}
            style={{
              left: `${table.position.x * scale}px`,
              top: `${table.position.y * scale}px`,
              width: `${(table.position.width || 300) * scale}px`,
              height: `${(table.position.height || 200) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className={`px-3 py-2 ${colors.dataTable.header} flex items-center gap-1.5 border-b ${colors.dataTable.border}`}>
              <Table className="h-5 w-5" />
              <div className="text-xs font-medium truncate">
                {table.title || `Data Table ${i+1}`}
              </div>
            </div>
            <div className="p-2">
              <div className="flex flex-wrap gap-1.5">
                {table.columns.slice(0, 3).map((col, colIndex) => (
                  <span 
                    key={colIndex} 
                    className={`${colors.dataTable.tag} px-2 py-1 rounded text-xs truncate max-w-full font-medium`}
                    title={col}
                  >
                    {col}
                  </span>
                ))}
                {table.columns.length > 3 && (
                  <span className={`${colors.dataTable.tag} px-2 py-1 rounded text-xs font-medium`}>
                    +{table.columns.length - 3} more
                  </span>
                )}
              </div>
              
              {/* Table visualization placeholder */}
              <div className={`mt-3 h-[60%] ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded border 
                            ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
                <div className="w-full h-8 border-b flex items-center px-2 opacity-70">
                  <div className="w-1/4 h-3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                  <div className="w-1/4 h-3 bg-slate-300 dark:bg-slate-600 rounded mx-2"></div>
                  <div className="w-1/4 h-3 bg-slate-300 dark:bg-slate-600 rounded"></div>
                </div>
                <div className="w-full h-6 border-b flex items-center px-2 opacity-50">
                  <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-700 rounded mx-2"></div>
                  <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="w-full h-6 border-b flex items-center px-2 opacity-50">
                  <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-700 rounded mx-2"></div>
                  <div className="w-1/4 h-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Stat cards */}
        {config.statCards.map((card, i) => (
          <div 
            key={`card-${i}`}
            className={`absolute rounded-lg shadow-md border-2 ${colors.statCard.border} ${colors.statCard.bg} transition-all duration-300`}
            style={{
              left: `${card.position.x * scale}px`,
              top: `${card.position.y * scale}px`,
              width: `${(card.position.width || 200) * scale}px`,
              height: `${(card.position.height || 120) * scale}px`,
              transformOrigin: 'top left'
            }}
          >
            <div className={`px-3 py-2 ${colors.statCard.header} flex items-center gap-1.5 border-b ${colors.statCard.border}`}>
              <Database className="h-5 w-5" />
              <div className="text-xs font-medium truncate">
                {card.title || `Stat Card ${i+1}`}
              </div>
            </div>
            <div className="p-2 flex flex-col items-center justify-center h-[calc(100%-34px)]">
              <div className={`text-lg font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'} mb-1`}>
                {Math.round(Math.random() * 1000).toLocaleString()}
              </div>
              <div className="text-xs opacity-70 text-center">
                {card.column} {card.statType}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardPreview;