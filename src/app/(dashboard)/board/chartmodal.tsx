import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  DatasetComponent,
  AriaComponent,
  TransformComponent,
  MarkPointComponent,
  MarkLineComponent,
  BrushComponent,
  CalendarComponent
} from 'echarts/components';
import {
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  HeatmapChart,
  TreemapChart,
  SunburstChart,
  GraphChart,
  GaugeChart,
  FunnelChart,
  ParallelChart,
  SankeyChart,
  RadarChart,
  MapChart
} from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

import { createChart } from './chart-configurations';

// Import echarts-gl after echarts
// Note: We need to import these in the correct order
import 'echarts';
import 'echarts-gl';

// We still register the core components to be safe
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
  DatasetComponent,
  AriaComponent,
  TransformComponent,
  MarkPointComponent,
  MarkLineComponent,
  BrushComponent,
  CalendarComponent,
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  HeatmapChart,
  TreemapChart,
  SunburstChart,
  GraphChart,
  GaugeChart,
  FunnelChart,
  ParallelChart,
  SankeyChart,
  RadarChart,
  MapChart,
  CanvasRenderer,
  UniversalTransition
]);

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (chartData: ChartCreationData & { position: Position; options?: ChartOptions; }) => void;
  position: { x: number; y: number };
  columns: Array<{ header: string; accessorKey: string; isNumeric: boolean }>;
  data: Array<Record<string, any>>;
}

interface ChartOptions {
  binSize?: number;
  showOutliers?: boolean;
  stackType?: 'stacked' | 'grouped';
}

interface Position {
  x: number;
  y: number;
}

interface ChartCreationData {
  type: string;
  columns: string[];
  options: ChartOptions;
  title: string;
}

const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  onExport,
  position,
  columns,
  data
}) => {
  const [chartType, setChartType] = useState<string>('line');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [options, setOptions] = useState<ChartOptions>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup chart instance when component unmounts
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || selectedColumns.length < 1) return;
  
    try {
      // Dispose previous chart instance if it exists
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
      
      // Create a new chart instance
      chartInstance.current = echarts.init(chartRef.current);
      
      console.log(`Initializing chart type: ${chartType}`);
      console.log(`Selected columns: ${selectedColumns.join(", ")}`);
  
      // Basic validation for column count
      const is3DChart = ['bar3d', 'line3d', 'scatter3d', 'surface3d'].includes(chartType);
      
      if (!validateColumns(chartType, selectedColumns)) {
        const required = is3DChart ? 3 : 2;
        setPreviewError(`${chartType} chart requires at least ${required} columns`);
        return;
      }
  
      // Additional validation for 3D charts
      if (is3DChart && !validateNumericColumns(chartType, selectedColumns, columns)) {
        setPreviewError(`${chartType} chart requires all selected columns to be numeric`);
        return;
      }
      
      // Special handling for surface3d which needs data in a specific format
      if (chartType === 'surface3d' && selectedColumns.length >= 3) {
        // Check if we have enough unique data points to create a surface
        const xValues = [...new Set(data.map(row => row[selectedColumns[0]]))];
        const yValues = [...new Set(data.map(row => row[selectedColumns[1]]))];
        
        if (xValues.length < 2 || yValues.length < 2) {
          setPreviewError('Surface chart requires multiple unique values for X and Y axes');
          return;
        }
      }
  
      // Create chart configuration using our helper
      const chartConfig = createChart(
        chartType,
        data,
        selectedColumns,
        {
          // Chart-specific options
          binSize: options.binSize || 10,
          showOutliers: options.showOutliers,
          stackType: options.stackType,
          // Common chart options
          title: {
            text: 'Preview',
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            }
          },
          toolbox: {
            feature: {
              dataZoom: {},
              restore: {},
              saveAsImage: {}
            }
          },
          // Different grid options for 3D vs 2D charts
          ...(is3DChart ? {
            grid3D: {
              viewControl: {
                autoRotate: false,
                rotateSensitivity: 5
              }
            }
          } : {
            grid: {
              left: '5%',
              right: '5%',
              top: '15%',
              bottom: '15%',
              containLabel: true
            }
          })
        }
      );
  
      console.log(`Chart configuration created successfully for type: ${chartType}`);
  
      // Set the configuration to the chart instance
      chartInstance.current.setOption(chartConfig, true);
      setPreviewError(null);
  
      // Handle resize events
      const handleResize = () => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      };
  
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('Error generating chart preview:', error);
      if (error instanceof Error) {
        setPreviewError('Error generating chart preview: ' + error.message);
      } else {
        setPreviewError('Error generating chart preview');
      }
    }
  }, [chartType, selectedColumns, data, options, columns]);

  // Add validation for required columns based on chart type
  const validateColumns = (chartType: string, selectedColumns: string[]) => {
    const requirements: { [key: string]: number } = {
      'pie': 2,
      'scatter': 2,
      'box': 2,
      'histogram': 1,
      'heatmap': 3,
      'kline': 5,
      'surface3d': 3,
      'bar3d': 3,
      'line3d': 3,
      'scatter3d': 3,
      'graph': 2,
      'sankey': 3
    };
  
    const required = requirements[chartType] || 2;
    return selectedColumns.length >= required;
  };

  const validateNumericColumns = (chartType: string, selectedColumns: string[], columnData: Array<{ header: string; accessorKey: string; isNumeric: boolean }>) => {
    if (!['surface3d', 'bar3d', 'line3d', 'scatter3d'].includes(chartType)) {
      return true; // Not a 3D chart, so no validation needed
    }
  
    // For 3D charts, we need to ensure all selected columns are numeric
    return selectedColumns.every(col => {
      const column = columnData.find(c => c.accessorKey === col);
      return column?.isNumeric === true;
    });
  };

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  // Enhanced handleExport function with better validation
const handleExport = () => {
  const requirements: { [key: string]: number } = {
    'pie': 2,
    'scatter': 2,
    'box': 2,
    'histogram': 1,
    'heatmap': 3,
    'kline': 5,
    'surface3d': 3,
    'bar3d': 3,
    'line3d': 3,
    'scatter3d': 3,
    'graph': 2,
    'sankey': 3
  };

  // Check if we have enough columns
  if (!validateColumns(chartType, selectedColumns)) {
    setPreviewError(`${chartType} chart requires at least ${requirements[chartType] || 2} columns`);
    return;
  }// For 3D charts, ensure all selected columns are numeric
  if (['surface3d', 'bar3d', 'line3d', 'scatter3d'].includes(chartType) && 
  !validateNumericColumns(chartType, selectedColumns, columns)) {
setPreviewError(`${chartType} chart requires all selected columns to be numeric`);
return;
}

onExport({
type: chartType,
columns: selectedColumns,
options,
title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
position
});
onClose();
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Create Chart</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[280px,1fr] gap-4">
          <div className="space-y-4">
            {/* Chart Type Selection */}
            <div className="bg-blue-50/50 p-3 rounded-lg">
              <Label className="text-sm font-medium text-blue-700">Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="mt-2 bg-white border-blue-200 hover:border-blue-300 transition-colors">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {/* Basic Charts */}
                  <SelectGroup>
                    <SelectLabel className="font-semibold text-blue-600">Basic Charts</SelectLabel>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="scatter">Scatter Plot</SelectItem>
                  </SelectGroup>

                  {/* Statistical Charts */}
                  <SelectGroup>
                    <SelectLabel className="font-semibold text-purple-600">Statistical Analysis</SelectLabel>
                    <SelectItem value="box">Box Plot</SelectItem>
                    <SelectItem value="histogram">Histogram</SelectItem>
                    <SelectItem value="segmented-bar">Segmented Bar</SelectItem>
                    <SelectItem value="radar">Radar Chart</SelectItem>
                    <SelectItem value="parallel">Parallel Coordinates</SelectItem>
                  </SelectGroup>

                  {/* Financial Charts */}
                  <SelectGroup>
                    <SelectLabel className="font-semibold text-green-600">Financial Charts</SelectLabel>
                    <SelectItem value="kline">K-Line Chart</SelectItem>
                    <SelectItem value="funnel">Funnel Chart</SelectItem>
                    <SelectItem value="gauge">Gauge Chart</SelectItem>
                  </SelectGroup>

                  {/* Advanced Visualizations */}
                  <SelectGroup>
                    <SelectLabel className="font-semibold text-orange-600">Advanced Visualizations</SelectLabel>
                    <SelectItem value="heatmap">Heat Map</SelectItem>
                    <SelectItem value="treemap">Tree Map</SelectItem>
                    <SelectItem value="sankey">Sankey Diagram</SelectItem>
                    <SelectItem value="sunburst">Sunburst Chart</SelectItem>
                    <SelectItem value="graph">Network Graph</SelectItem>
                    <SelectItem value="liquid">Liquid Fill</SelectItem>
                  </SelectGroup>

                  {/* 3D Charts */}
                  <SelectGroup>
                    <SelectLabel className="font-semibold text-red-600">3D Visualizations</SelectLabel>
                    <SelectItem value="bar3d">3D Bar Chart</SelectItem>
                    <SelectItem value="line3d">3D Line Chart</SelectItem>
                    <SelectItem value="scatter3d">3D Scatter Plot</SelectItem>
                    <SelectItem value="surface3d">3D Surface Chart</SelectItem>
                  </SelectGroup>

                  {/* Special Effects */}
                  <SelectGroup>
                    <SelectLabel className="font-semibold text-yellow-600">Special Effects</SelectLabel>
                    <SelectItem value="effect-scatter">Effect Scatter</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            {/* inside chart selection for 3d charts   */}
{['surface3d', 'bar3d', 'line3d', 'scatter3d'].includes(chartType) && (
  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
    <p>3D charts require exactly 3 numeric columns:</p>
    <ul className="list-disc pl-4 mt-1">
      <li>X-axis: First selected column</li>
      <li>Y-axis: Second selected column</li>
      <li>Z-axis: Third selected column</li>
    </ul>
  </div>
)}

{/* ///////////////////////////////////////// */}
              {/* Chart-specific Options */}
              {chartType === 'histogram' && (
                <div className="mt-3 bg-white p-2 rounded border border-blue-100">
                  <Label className="text-sm text-blue-700">Bin Size</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={options.binSize || 10}
                    onChange={(e) => setOptions({...options, binSize: Number(e.target.value)})}
                    className="mt-1 border-blue-200"
                  />
                </div>
              )}

              {chartType === 'box' && (
                <div className="mt-3 bg-white p-2 rounded border border-blue-100">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showOutliers"
                      checked={!!options.showOutliers}
                      onCheckedChange={(checked) => setOptions({...options, showOutliers: !!checked})}
                    />
                    <Label htmlFor="showOutliers" className="text-sm text-blue-700">Show Outliers</Label>
                  </div>
                </div>
              )}

              {chartType === 'segmented-bar' && (
                <div className="mt-3 bg-white p-2 rounded border border-blue-100">
                  <Label className="text-sm text-blue-700">Stack Type</Label>
                  <Select
                    value={options.stackType || 'stacked'}
                    onValueChange={(value: "stacked" | "grouped") => 
                      setOptions({...options, stackType: value})}
                  >
                    <SelectTrigger className="mt-1 border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stacked">Stacked</SelectItem>
                      <SelectItem value="grouped">Grouped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Column Selection */}
            <div className="space-y-3">
              {/* X-Axis */}
              <div className="bg-green-50/50 p-3 rounded-lg">
                <Label className="text-sm font-medium text-green-700">X-Axis</Label>
                <div className="mt-2 max-h-[120px] overflow-y-auto space-y-1 pr-2">
                  {columns.map((column) => (
                    <div 
                      key={column.accessorKey} 
                      className={`flex items-center gap-2 p-2 bg-white rounded border border-green-100 
                        ${selectedColumns[0] === column.accessorKey ? 'ring-1 ring-green-400' : 'hover:bg-green-50/50'}`}
                    >
                      <Checkbox
                        id={`x-${column.accessorKey}`}
                        checked={selectedColumns[0] === column.accessorKey}
                        onCheckedChange={() => {
                          setSelectedColumns([column.accessorKey, ...selectedColumns.slice(1)]);
                        }}
                      />
                      <Label 
                        htmlFor={`x-${column.accessorKey}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {column.header}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Y-Axis */}
              <div className="bg-purple-50/50 p-3 rounded-lg">
                <Label className="text-sm font-medium text-purple-700">Y-Axis</Label>
                <div className="mt-2 max-h-[120px] overflow-y-auto space-y-1 pr-2">
                  {columns.filter(column => column.isNumeric).map((column) => (
                    <div 
                      key={column.accessorKey} 
                      className={`flex items-center gap-2 p-2 bg-white rounded border border-purple-100 
                        ${selectedColumns.slice(1).includes(column.accessorKey) ? 'ring-1 ring-purple-400' : 'hover:bg-purple-50/50'}
                        ${selectedColumns[0] === column.accessorKey ? 'opacity-50' : ''}`}
                    >
                      <Checkbox
                        id={`y-${column.accessorKey}`}
                        checked={selectedColumns.slice(1).includes(column.accessorKey)}
                        onCheckedChange={() => handleColumnToggle(column.accessorKey)}
                        disabled={selectedColumns[0] === column.accessorKey}
                      />
                      <Label 
                        htmlFor={`y-${column.accessorKey}`}
                        className={`text-sm cursor-pointer flex-1 ${
                          selectedColumns[0] === column.accessorKey ? 'text-gray-400' : ''
                        }`}
                      >
                        {column.header}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Area */}
          <div className="space-y-3">
            <Card className="shadow-sm">
              <div ref={chartRef} className="w-full h-[350px]" />
            </Card>

            {previewError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">Add to Dashboard</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartModal;