"use client";

import React, { useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import useFilesList from '@/features/sqlite/api/file-list';
import { handleUseCSV } from '@/features/sqlite/api/file-content';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader, Menu, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DraggableChart from './drag-chart';
import ChartModal from './chartmodal';

// Interfaces
interface Position {
  x: number;
  y: number;
}

interface Chart {
  id: string;
  type: string;
  title: string;
  graphUrl: string;
  position: Position;
}

interface Column {
  header: string;
  accessorKey: string;
  isNumeric: boolean;
}

interface FileData {
  id: string;
  data: Array<Record<string, unknown>>;
  columns: Column[];
}

interface Dashboard {
  id: string;
  name: string;
  charts: Chart[];
}

interface ChartCreationData {
  type: string;
  columns: string[];
  title?: string;
}

const BoardMain: React.FC = () => {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id;
  const { fileList, error: fileListError, loading: filesLoading } = useFilesList(userId);

  // State
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [clickPosition, setClickPosition] = useState<Position>({ x: 0, y: 0 });
  const [charts, setCharts] = useState<Chart[]>([]);
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [newDashboardName, setNewDashboardName] = useState<string>('');

  // Handle chart position change
  const handleChartPosition = useCallback((chartId: string, newPosition: Position) => {
    setCharts(prev => prev.map(chart => 
      chart.id === chartId ? { ...chart, position: newPosition } : chart
    ));
  }, []);

  // Handle chart remove
  const handleRemoveChart = useCallback((chartId: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
    if (maximizedChart === chartId) {
      setMaximizedChart(null);
    }
  }, [maximizedChart]);

  // Handle maximize toggle
  const handleMaximizeToggle = useCallback((chartId: string) => {
    setMaximizedChart(prev => prev === chartId ? null : chartId);
  }, []);

  // Graph area click handler
  const handleGraphAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFile || maximizedChart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setClickPosition(position);
    setShowChartModal(true);
  }, [selectedFile, maximizedChart]);

  // File selection handler
  const handleFileSelection = useCallback(async (fileId: string) => {
    if (!userId) return;
    
    setDataLoading(true);
    setDataError(null);

    try {
      await handleUseCSV(
        fileId,
        userId,
        setDataLoading,
        setDataError,
        (data: Record<string, unknown>[]) => {
          if (data.length > 0) {
            const headers = Object.keys(data[0]);
            const columns: Column[] = headers.map(header => ({
              header,
              accessorKey: header,
              isNumeric: typeof data[0][header] === 'number'
            }));
            setSelectedFile({
              id: fileId,
              data,
              columns
            });
          }
        }
      );
    } catch (error) {
      console.error('Error loading file:', error);
      setDataError(error instanceof Error ? error.message : 'Error loading file');
    } finally {
      setDataLoading(false);
    }
  }, [userId]);

  // Create chart handler
  const handleChartCreate = useCallback(async (chartData: ChartCreationData) => {
    if (!userId || !selectedFile) return;

    try {
      const response = await fetch(`http://localhost:5000/generate-graph/${userId}/${selectedFile.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartType: chartData.type,
          selectedColumns: chartData.columns,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chart');
      }

      const { graph_id, url } = await response.json() as { graph_id: string; url: string };
      
      const newChart: Chart = {
        id: graph_id,
        type: chartData.type,
        title: chartData.title || `${chartData.type.charAt(0).toUpperCase() + chartData.type.slice(1)} Chart`,
        graphUrl: `http://localhost:5000${url}`,
        position: clickPosition
      };

      setCharts(prev => [...prev, newChart]);
      setShowChartModal(false);
    } catch (error) {
      console.error('Error creating chart:', error);
      setDataError('Failed to create chart');
    }
  }, [userId, selectedFile, clickPosition]);

  // Create dashboard handler
  const handleCreateDashboard = useCallback(() => {
    if (!newDashboardName.trim()) return;

    const newDashboard: Dashboard = {
      id: Date.now().toString(),
      name: newDashboardName.trim(),
      charts: []
    };

    setDashboards(prev => [...prev, newDashboard]);
    setSelectedDashboard(newDashboard.id);
    setNewDashboardName('');
  }, [newDashboardName]);

  if (!userLoaded || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* File Selection */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Select File</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                {filesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader className="animate-spin w-6 h-6 text-blue-500" />
                  </div>
                ) : !fileList?.length ? (
                  <p className="text-gray-500 text-center py-4">No files available</p>
                ) : (
                  fileList.map((file) => (
                    <Button
                      key={file.file_id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleFileSelection(file.file_id)}
                    >
                      {file.filename}
                    </Button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Dashboard Selection */}
          <Select value={selectedDashboard || ''} onValueChange={setSelectedDashboard}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Dashboard" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map(dashboard => (
                <SelectItem key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New Dashboard Creation */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New Dashboard Name"
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              className="w-[200px]"
            />
            <Button
              variant="outline"
              onClick={handleCreateDashboard}
              disabled={!newDashboardName.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        <div
          className="absolute inset-0"
          onClick={handleGraphAreaClick}
        >
          {charts.map(chart => (
            <DraggableChart
              key={chart.id}
              id={chart.id}
              title={chart.title}
              graphUrl={chart.graphUrl}
              position={chart.position}
              onPositionChange={handleChartPosition}
              onRemove={handleRemoveChart}
              isMaximized={maximizedChart === chart.id}
              onMaximizeToggle={handleMaximizeToggle}
            />
          ))}
        </div>
      </div>

      {/* Chart Modal */}
      {showChartModal && selectedFile && (
        <ChartModal
          isOpen={showChartModal}
          onClose={() => setShowChartModal(false)}
          onExport={handleChartCreate}
          position={clickPosition}
          columns={selectedFile.columns}
          data={selectedFile.data}
        />
      )}

      {/* Error Messages */}
      {(fileListError || dataError) && (
        <Alert variant="destructive" className="fixed bottom-4 right-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {fileListError || dataError}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Overlay */}
      {dataLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <Loader className="animate-spin w-8 h-8 text-white" />
        </div>
      )}
    </div>
  );
};

export default BoardMain;