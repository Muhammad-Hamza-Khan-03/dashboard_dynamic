import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { BarChart, LineChart, PieChart, BoxplotChart, CustomChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScatterChart } from 'echarts/charts';

// Register necessary ECharts components
echarts.use([
  TitleComponent, 
  TooltipComponent, 
  LegendComponent, 
  GridComponent, 
  BarChart, 
  LineChart, 
  PieChart, 
  BoxplotChart, 
  CustomChart,
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
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  const calculateHistogramData = (values: number[], binCount: number) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / binCount;
    const bins = new Array(binCount).fill(0);
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
      bins[binIndex]++;
    });

    return {
      bins,
      binRanges: Array.from({ length: binCount }, (_, i) => min + i * binSize)
    };
  };

  const prepareBoxplotData = (data: any[], columns: string[]) => {
    return columns.slice(1).map(column => {
      const values = data.map(row => Number(row[column])).filter(val => !isNaN(val));
      values.sort((a, b) => a - b);
      
      const q1 = values[Math.floor(values.length * 0.25)];
      const median = values[Math.floor(values.length * 0.5)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const whiskerBottom = Math.max(...values.filter(v => v >= q1 - 1.5 * iqr));
      const whiskerTop = Math.min(...values.filter(v => v <= q3 + 1.5 * iqr));
      
      const outliers = options.showOutliers ? 
        values.filter(v => v < whiskerBottom || v > whiskerTop) : 
        [];

      return {
        name: column,
        boxData: [whiskerBottom, q1, median, q3, whiskerTop],
        outliers: outliers.map(value => [column, value])
      };
    });
  };

  useEffect(() => {
    if (!chartRef.current || selectedColumns.length < 2) return;

    try {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      let option: echarts.EChartsCoreOption = {
        title: { text: 'Preview', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: { bottom: 10 },
        grid: { left: '5%', right: '5%', top: '15%', bottom: '15%' }
      };

      if (chartType === 'histogram') {
        const values = data.map(row => Number(row[selectedColumns[0]])).filter(val => !isNaN(val));
        const { bins, binRanges } = calculateHistogramData(values, options.binSize || 10);

        option = {
          ...option,
          xAxis: {
            type: 'value',
            name: selectedColumns[0],
            data: binRanges
          },
          yAxis: {
            type: 'value',
            name: 'Frequency'
          },
          series: [{
            type: 'bar',
            barWidth: '99%',
            data: bins.map((count, i) => [binRanges[i], count])
          }]
        };
      } else if (chartType === 'box') {
        const boxData = prepareBoxplotData(data, selectedColumns);

        option = {
          ...option,
          xAxis: {
            type: 'category',
            data: boxData.map(item => item.name)
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              type: 'boxplot',
              data: boxData.map(item => item.boxData),
              itemStyle: {
                borderWidth: 2
              }
            },
           
            ...(options.showOutliers ? [{
              type: 'scatter',
              data: boxData.flatMap(item => item.outliers),
              symbolSize: 6
            }] : [])
          ]
        };
      } else if (chartType === 'segmented-bar') {
        const categories = [...new Set(data.map(row => row[selectedColumns[0]]))];
        const series = selectedColumns.slice(1).map(col => ({
          name: col,
          type: 'bar',
          stack: options.stackType === 'stacked' ? 'total' : undefined,
          data: categories.map(cat => 
            data.filter(row => row[selectedColumns[0]] === cat)
              .reduce((sum, row) => sum + Number(row[col]), 0)
          )
        }));

        option = {
          ...option,
          xAxis: {
            type: 'category',
            data: categories
          },
          yAxis: {
            type: 'value'
          },
          series
        };
      } else {
        // Handle other chart types (line, bar, pie)
        const xAxisData = data.map(row => row[selectedColumns[0]]);
        const series = selectedColumns.slice(1).map(col => ({
          name: col,
          type: chartType,
          data: data.map(row => Number(row[col]))
        }));

        option = {
          ...option,
          xAxis: { type: 'category', data: xAxisData },
          yAxis: { type: 'value' },
          series
        };
      }

      chartInstance.current.setOption(option);
      setPreviewError(null);
    } catch (error) {
      setPreviewError('Error generating chart preview');
      console.error(error);
    }
  }, [chartType, selectedColumns, data, options]);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => 
      prev.includes(columnKey) 
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleExport = () => {
    if (selectedColumns.length < 2) {
      setPreviewError('Select at least two columns');
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
                <SelectContent>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="box">Box Plot</SelectItem>
                  <SelectItem value="histogram">Histogram</SelectItem>
                  <SelectItem value="segmented-bar">Segmented Bar</SelectItem>
                </SelectContent>
              </Select>

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