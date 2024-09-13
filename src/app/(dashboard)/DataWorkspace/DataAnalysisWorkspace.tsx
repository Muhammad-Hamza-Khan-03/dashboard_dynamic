"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useModalSheet } from '@/features/board/Chart-Modal/useChartModal-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Loader, Move } from 'lucide-react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { motion } from 'framer-motion';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface DataAnalysisWorkspaceProps {
  userId: string;
}

interface Column {
  header: string;
  accessor: string;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

interface CalculatedColumn {
  name: string;
  formula: string;
}

interface ChartData {
  type: string;
  data: any[];
  columns: string[];
}

interface DashboardChart extends ChartData {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

const DEFAULT_CHART_SIZE = { width: 400, height: 300 };

const DataAnalysisWorkspace: React.FC<DataAnalysisWorkspaceProps> = ({ userId }) => {
  const [data, setData] = useState<Record<string, string | number>[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: 'asc' });
  const [calculatedColumn, setCalculatedColumn] = useState<CalculatedColumn>({ name: '', formula: '' });
  const [showStats, setShowStats] = useState<boolean>(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [savedCharts, setSavedCharts] = useState<ChartData[]>([]);
  const [showSavedChart, setShowSavedChart] = useState<ChartData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);

  const { showModal, chartType, openModal, closeModal, setChartType } = useModalSheet();

  useEffect(() => {
    fetchFiles();
    loadChartsFromLocalStorage();
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoadingMessage('Fetching file list...');
    setFetchError(null);
    try {
      const response = await axios.get(`http://localhost:5000/list_files/${userId}`);
      if (response.data && response.data.files && Array.isArray(response.data.files)) {
        setUploadedFiles(response.data.files);
      } else {
        setFetchError('Unexpected response format from server');
      }
    } catch (err) {
      setFetchError('Failed to fetch file list. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  }, [userId]);

  const loadChartsFromLocalStorage = () => {
    const storedCharts = localStorage.getItem('savedCharts');
    if (storedCharts) {
      setSavedCharts(JSON.parse(storedCharts));
    }
    const storedDashboardCharts = localStorage.getItem('dashboardCharts');
    if (storedDashboardCharts) {
      setDashboardCharts(JSON.parse(storedDashboardCharts));
    }
  };

  const addChartToDashboard = (chart: ChartData) => {
    const newDashboardChart: DashboardChart = {
      ...chart,
      id: Date.now().toString(),
      position: { x: 0, y: 0 },
      size: DEFAULT_CHART_SIZE
    };
    const updatedDashboard = [...dashboardCharts, newDashboardChart];
    setDashboardCharts(updatedDashboard);
    localStorage.setItem('dashboardCharts', JSON.stringify(updatedDashboard));
  };

  const onDragStop = useCallback((e: DraggableEvent, data: DraggableData, chartId: string) => {
    const updatedCharts = dashboardCharts.map(chart =>
      chart.id === chartId ? { ...chart, position: { x: data.x, y: data.y } } : chart
    );
    setDashboardCharts(updatedCharts);
    localStorage.setItem('dashboardCharts', JSON.stringify(updatedCharts));
  }, [dashboardCharts]);

  const onResize = useCallback((chartId: string, newSize: { width: number; height: number }) => {
    const updatedCharts = dashboardCharts.map(chart =>
      chart.id === chartId ? { ...chart, size: newSize } : chart
    );
    setDashboardCharts(updatedCharts);
    localStorage.setItem('dashboardCharts', JSON.stringify(updatedCharts));
  }, [dashboardCharts]);

  const renderChart = (chart: DashboardChart) => {
    const layout = {
      autosize: true,
      title: `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`,
      margin: { l: 40, r: 10, t: 40, b: 30 },
    };
    switch (chart.type) {
      case 'line':
        return (
          <Plot
            data={[
              {
                x: chart.data.map(item => item[chart.columns[0]]),
                y: chart.data.map(item => item[chart.columns[1]]),
                type: 'scatter',
                mode: 'lines+markers',
                marker: { color: 'blue' },
              },
            ]}
            layout={layout}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      case 'bar':
        return (
          <Plot
            data={[
              {
                x: chart.data.map(item => item[chart.columns[0]]),
                y: chart.data.map(item => item[chart.columns[1]]),
                type: 'bar',
              },
            ]}
            layout={layout}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      case 'pie':
        return (
          <Plot
            data={[
              {
                values: chart.data.map(item => item[chart.columns[1]]),
                labels: chart.data.map(item => item[chart.columns[0]]),
                type: 'pie',
              },
            ]}
            layout={layout}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
          />
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader className="animate-spin h-10 w-10 mb-4" />
        <p>{loadingMessage || 'Loading...'}</p>
      </div>
    );
  }

  if (error || fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-500">
        <AlertCircle className="h-10 w-10 mb-4" />
        <p>Error: {error || fetchError}</p>
        <Button className="mt-4" onClick={fetchFiles}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="w-64 bg-gray-100 p-4 border-r overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Saved Charts</h2>
        {savedCharts.map((chart, index) => (
          <Card key={index} className="mb-4 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{chart.type} Chart</h3>
              <Button size="sm" onClick={() => addChartToDashboard(chart)}>
                Add to Dashboard
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Columns: {chart.columns.join(', ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex-grow p-6 overflow-hidden relative">
        {dashboardCharts.map((chart) => (
          <Draggable
            key={chart.id}
            defaultPosition={chart.position}
            onStop={(e, data) => onDragStop(e, data, chart.id)}
            bounds="parent"
          >
            <ResizablePanelGroup
              direction="horizontal"
              onLayout={(sizes) => {
                const newWidth = (sizes[0] * (chart.size?.width || DEFAULT_CHART_SIZE.width)) / 100;
                onResize(chart.id, {
                  width: newWidth || DEFAULT_CHART_SIZE.width,
                  height: chart.size?.height || DEFAULT_CHART_SIZE.height
                });
              }}
            >
              <ResizablePanel defaultSize={100}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={100}>
                    <div className="bg-white rounded-lg shadow-md p-4 cursor-move">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{chart.type} Chart</h3>
                        <Move size={20} />
                      </div>
                      {renderChart(chart)}
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                </ResizablePanelGroup>
              </ResizablePanel>
              <ResizableHandle />
            </ResizablePanelGroup>
          </Draggable>
        ))}
      </div>
    </div>
  );
};

export default DataAnalysisWorkspace;
