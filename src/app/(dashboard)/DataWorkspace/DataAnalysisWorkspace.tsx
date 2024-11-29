"use client"
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  LineChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, 
  Line, Bar, AreaChart, Area, PieChart, Pie, ScatterChart, Scatter,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { PlusCircle, Settings, Filter, Database, Cog, Maximize2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { ChartModal } from './chartmodal';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface DataAnalysisWorkspaceProps {
  userId: string;
}

interface FileItem {
  file_id: string;
  filename: string;
  file_type: string;
  is_structured: boolean;
  unique_key: string;
}

interface ChartConfig {
  id: number;
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'composed' | 'radar';
  data: Record<string, any>[];
  columns: {
    x: string;
    y: string;
  };
}

interface FileResponse {
  type: string;
  data: Record<string, any>[];
  columns: string[];
}

const DataAnalysisWorkspace: React.FC<DataAnalysisWorkspaceProps> = ({ userId }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileData, setFileData] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<{ x: string; y: string }>({ x: '', y: '' });
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [filterValue, setFilterValue] = useState('');
  const [usePlotly, setUsePlotly] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartConfig | null>(null);
  const [chartType, setChartType] = useState<ChartConfig['type']>('line');

  useEffect(() => {
    fetchFiles();
  }, [userId]);

  const renderPlotlyChart = (chart: ChartConfig): JSX.Element => {
    let plotlyType = 'scatter';
    let mode = 'lines+markers';

    switch (chart.type) {
      case 'bar':
        plotlyType = 'bar';
        break;
      case 'area':
        plotlyType = 'scatter';
        mode = 'lines';
        break;
      case 'pie':
        plotlyType = 'pie';
        break;
      case 'scatter':
        plotlyType = 'scatter';
        mode = 'markers';
        break;
      case 'radar':
        plotlyType = 'scatterpolar';
        mode = 'lines+markers';
        break;
    }

    const data = [{
      x: chart.data.map(item => item[chart.columns.x]),
      y: chart.data.map(item => item[chart.columns.y]),
      type: plotlyType,
      mode: mode,
      marker: { color: '#8884d8' },
      fill: chart.type === 'area' ? 'tozeroy' : undefined
    } as Partial<Plotly.PlotData>];

    const layout = {
      title: `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`,
      xaxis: { title: chart.columns.x },
      yaxis: { title: chart.columns.y },
      autosize: true,
      margin: { l: 50, r: 50, t: 50, b: 50 }
    };

    return (
      <Plot
        data={data}
        layout={layout}
        useResizeHandler={true}
        style={{ width: '100%', height: '400px' }}
      />
    );
  };

  const renderRechartsChart = (chart: ChartConfig): JSX.Element => {
    const commonProps = {
      width: 600,
      height: 400,
      data: filterData(chart.data),
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chart.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.columns.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={chart.columns.y} stroke="#8884d8" />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.columns.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={chart.columns.y} fill="#8884d8" />
          </BarChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.columns.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={chart.columns.y} fill="#8884d8" stroke="#8884d8" />
          </AreaChart>
        );
      case 'pie':
        return (
          <PieChart width={600} height={400}>
            <Pie
              data={filterData(chart.data)}
              dataKey={chart.columns.y}
              nameKey={chart.columns.x}
              cx="50%"
              cy="50%"
              fill="#8884d8"
            />
            <Tooltip />
            <Legend />
          </PieChart>
        );
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.columns.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Scatter name={chart.columns.y} data={filterData(chart.data)} fill="#8884d8" />
          </ScatterChart>
        );
      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={chart.columns.x} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={chart.columns.y} fill="#8884d8" />
            <Line type="monotone" dataKey={chart.columns.y} stroke="#82ca9d" />
          </ComposedChart>
        );
      case 'radar':
        return (
          <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid />
            <PolarAngleAxis dataKey={chart.columns.x} />
            <PolarRadiusAxis />
            <Radar dataKey={chart.columns.y} stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </RadarChart>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const fetchFiles = async (): Promise<void> => {
    try {
      const response = await axios.get<{ files: FileItem[] }>(`http://localhost:5000/list_files/${userId}`);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleFileSelect = async (fileId: string): Promise<void> => {
    try {
      const response = await axios.get<FileResponse>(`http://localhost:5000/get-file/${userId}/${fileId}`);
      if (response.data.type === 'structured') {
        setFileData(response.data.data);
        setColumns(response.data.columns);
        setSelectedFile(fileId);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  const createChart = (): void => {
    if (!selectedColumns.x || !selectedColumns.y) return;

    const newChart: ChartConfig = {
      id: Date.now(),
      type: chartType,
      data: fileData,
      columns: selectedColumns,
    };

    setCharts([...charts, newChart]);
    setShowChartModal(false);
  };

  const filterData = (data: Record<string, any>[]): Record<string, any>[] => {
    if (!filterValue) return data;
    return data.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(filterValue.toLowerCase())
      )
    );
  };

  const renderChart = (chart: ChartConfig): JSX.Element => {
    return (
      <Card className="p-4 m-4" key={chart.id}>
        <div className="flex justify-between mb-2">
          <h3 className="text-lg font-semibold">
            {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSelectedChart(chart);
              setShowChartModal(true);
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        {usePlotly ? renderPlotlyChart(chart) : renderRechartsChart(chart)}
      </Card>
    );
  };
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-20 bg-white shadow-md flex flex-col items-center py-8 space-y-8">
        <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
          <DialogTrigger asChild>
            <div className="cursor-pointer">
              <Database className="w-6 h-6 text-gray-500 hover:text-teal-500" />
              <span className="text-xs mt-1">Data</span>
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Data File</DialogTitle>
            </DialogHeader>
            <Select onValueChange={handleFileSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a file" />
              </SelectTrigger>
              <SelectContent>
                {files.map(file => (
                  <SelectItem key={file.file_id} value={file.file_id}>
                    {file.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogContent>
        </Dialog>

        <div className="cursor-pointer" onClick={() => setShowChartModal(true)}>
          <PlusCircle className="w-6 h-6 text-gray-500 hover:text-teal-500" />
          <span className="text-xs mt-1">Chart</span>
        </div>

        <div className="cursor-pointer">
          <Filter className="w-6 h-6 text-gray-500 hover:text-teal-500" />
          <span className="text-xs mt-1">Filter</span>
        </div>
      </div>

      <div className="flex-1 p-6">
        <Input 
          placeholder="Filter data..." 
          value={filterValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterValue(e.target.value)}
          className="mb-4"
        />
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-sm">Use Plotly</span>
          <Switch
            checked={usePlotly}
            onCheckedChange={setUsePlotly}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {charts.map(renderChart)}
        </div>
      </div>

      <ChartModal 
        open={showChartModal}
        onOpenChange={setShowChartModal}
        selectedChart={selectedChart}
        chartType={chartType}
        setChartType={setChartType}
        columns={columns}
        selectedColumns={selectedColumns}
        setSelectedColumns={setSelectedColumns}
        createChart={createChart}
        usePlotly={usePlotly}
        renderPlotlyChart={renderPlotlyChart}
        renderRechartsChart={renderRechartsChart}
      />
    </div>
  );
};

export default DataAnalysisWorkspace;