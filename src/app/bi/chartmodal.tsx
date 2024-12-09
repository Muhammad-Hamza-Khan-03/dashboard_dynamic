import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
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

echarts.use([TitleComponent, TooltipComponent, LegendComponent, GridComponent, BarChart, LineChart, PieChart, CanvasRenderer, UniversalTransition]);


interface Position {
  x: number;
  y: number;
}

interface Column {
  header: string;
  accessorKey: string;
  isNumeric: boolean;
}

interface ChartData {
  type: string;
  columns: string[];
  title?: string;
  position: Position;
}

interface PreviewData {
  xAxis: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}
interface ChartOptions {
  binSize?: number;
  showOutliers?: boolean;
  stackType?: 'stacked' | 'grouped';
}

interface ChartData {
  type: string;
  columns: string[];
  title?: string;
  position: Position;
  options?: ChartOptions;
}

interface Position {
  x: number;
  y: number;
}

interface Chart extends ChartData {
  id: string;
  graphUrl: string;
}

interface ChartCreationData {
  type: string;
  columns: string[];
  title?: string;
  options?: ChartOptions;
}

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (chartData: ChartCreationData & { position: Position; options?: ChartOptions; }) => void;
  position: { x: number; y: number };
  columns: Array<{ header: string; accessorKey: string; isNumeric: boolean }>;
  data: Array<Record<string, any>>;
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
      if (chartInstance.current) chartInstance.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || selectedColumns.length < 2) return;
    try {
      if (!chartInstance.current) chartInstance.current = echarts.init(chartRef.current);
      const xAxisColumn = selectedColumns[0];
      const yAxisColumns = selectedColumns.slice(1);
      const option = {
        title: { text: 'Preview', left: 'center', top: 10 },
        tooltip: { trigger: 'axis' },
        legend: { data: yAxisColumns, bottom: 10 },
        grid: { left: '5%', right: '5%', top: '15%', bottom: '15%' },
        xAxis: { type: 'category', data: data.map(row => String(row[xAxisColumn])) },
        yAxis: { type: 'value' },
        series: yAxisColumns.map(col => ({
          name: col,
          type: chartType,
          data: data.map(row => Number(row[col]))
        }))
      };
      chartInstance.current.setOption(option);
      setPreviewError(null);
    } catch (error) {
      setPreviewError('Invalid data format');
      console.error(error);
    }
  }, [chartType, selectedColumns, data]);

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
      <DialogContent className="max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Chart</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[250px,1fr] gap-6 py-4">
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-2 block">Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-full">
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
            </div>

            {chartType === 'histogram' && (
              <div>
                <Label>Bin Size</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={options.binSize || 10}
                  onChange={(e) => setOptions({...options, binSize: Number(e.target.value)})}
                  className="mt-1"
                />
              </div>
            )}

            {chartType === 'box' && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showOutliers"
                  checked={!!options.showOutliers}
                  onCheckedChange={(checked) => setOptions({...options, showOutliers: !!checked})}
                />
                <Label htmlFor="showOutliers">Show Outliers</Label>
              </div>
            )}

            {chartType === 'segmented-bar' && (
              <div>
                <Label>Stack Type</Label>
                <Select
                  value={options.stackType || 'stacked'}
                  onValueChange={(value: "stacked" | "grouped") => setOptions({...options, stackType: value})}
                >
                  <SelectContent>
                    <SelectItem value="stacked">Stacked</SelectItem>
                    <SelectItem value="grouped">Grouped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">X-Axis</Label>
                {columns.map((column) => (
                  <div key={column.accessorKey} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={`x-${column.accessorKey}`}
                      checked={selectedColumns[0] === column.accessorKey}
                      onCheckedChange={() => {
                        setSelectedColumns([column.accessorKey, ...selectedColumns.slice(1)]);
                      }}
                    />
                    <Label htmlFor={`x-${column.accessorKey}`}>{column.header}</Label>
                  </div>
                ))}
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Y-Axis</Label>
                {columns.filter(column => column.isNumeric).map((column) => (
                  <div key={column.accessorKey} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={`y-${column.accessorKey}`}
                      checked={selectedColumns.slice(1).includes(column.accessorKey)}
                      onCheckedChange={() => handleColumnToggle(column.accessorKey)}
                      disabled={selectedColumns[0] === column.accessorKey}
                    />
                    <Label htmlFor={`y-${column.accessorKey}`}>{column.header}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div ref={chartRef} className="w-full h-[300px]" />
            </Card>

            {previewError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport}>Add to Dashboard</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartModal;