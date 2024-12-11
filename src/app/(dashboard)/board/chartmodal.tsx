import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
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

// Register ECharts components
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer,
  UniversalTransition
]);

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

interface ChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (chartData: ChartData) => void;
  position: Position;
  columns: Column[];
  data: Record<string, any>[];
}

type ChartType = 'line' | 'bar' | 'pie';

const ChartModal: React.FC<ChartModalProps> = ({
  isOpen,
  onClose,
  onExport,
  position,
  columns,
  data
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Clean up chart instance on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, []);

  // Update preview when selections change
  useEffect(() => {
    if (!chartRef.current || selectedColumns.length < 2) return;

    try {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const xAxisColumn = selectedColumns[0];
      const yAxisColumns = selectedColumns.slice(1);

      const previewData: PreviewData = {
        xAxis: data.map(row => String(row[xAxisColumn])),
        series: yAxisColumns.map(column => ({
          name: column,
          data: data.map(row => Number(row[column]))
        }))
      };

      const option = {
        title: {
          text: 'Chart Preview',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: yAxisColumns,
          bottom: 0
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: previewData.xAxis
        },
        yAxis: {
          type: 'value'
        },
        series: previewData.series.map(series => ({
          name: series.name,
          type: chartType,
          data: series.data
        }))
      };

      chartInstance.current.setOption(option);
      setPreviewError(null);
    } catch (error) {
      setPreviewError('Error generating preview: Invalid data format');
      console.error('Preview error:', error);
    }
  }, [chartType, selectedColumns, data]);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      }
      return [...prev, columnKey];
    });
  };

  const handleExport = () => {
    if (selectedColumns.length < 2) {
      setPreviewError('Please select at least two columns (X-axis and Y-axis)');
      return;
    }

    onExport({
      type: chartType,
      columns: selectedColumns,
      title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      position
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Chart</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>X-Axis Column</Label>
              {columns.map((column) => (
                <div key={column.accessorKey} className="flex items-center space-x-2">
                  <Checkbox
                    id={`x-${column.accessorKey}`}
                    checked={selectedColumns[0] === column.accessorKey}
                    onCheckedChange={() => {
                      setSelectedColumns([column.accessorKey, ...selectedColumns.slice(1)]);
                    }}
                  />
                  <label
                    htmlFor={`x-${column.accessorKey}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.header}
                  </label>
                </div>
              ))}
            </div>

            <div>
              <Label>Y-Axis Columns</Label>
              {columns.filter(column => column.isNumeric).map((column) => (
                <div key={column.accessorKey} className="flex items-center space-x-2">
                  <Checkbox
                    id={`y-${column.accessorKey}`}
                    checked={selectedColumns.slice(1).includes(column.accessorKey)}
                    onCheckedChange={() => handleColumnToggle(column.accessorKey)}
                    disabled={selectedColumns[0] === column.accessorKey}
                  />
                  <label
                    htmlFor={`y-${column.accessorKey}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.header}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {previewError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}

          {/* Preview Area */}
          <Card className="p-4">
            <div 
              ref={chartRef} 
              className="w-full h-[300px]"
            />
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Add to Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChartModal;