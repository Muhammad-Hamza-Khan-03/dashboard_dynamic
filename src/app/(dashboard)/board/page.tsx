"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import useFilesList from '@/features/sqlite/api/file-list';
import { handleUseCSV } from '@/features/sqlite/api/file-content';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Loader, Menu, Plus } from 'lucide-react';
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
interface ChartOptions {
  binSize?: number;
  showOutliers?: boolean;
  stackType?: 'stacked' | 'grouped';
}
interface ChartCreationData {
  type: string;
  columns: string[];
  title?: string;
  options?: ChartOptions; // Add the 'options' property
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
  // const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // const [dashboardToDelete, setDashboardToDelete] = useState<string | null>(null);
  useEffect(() => {
    if (userId) {
      const savedDashboards = localStorage.getItem(`dashboards_${userId}`);
      if (savedDashboards) {
        setDashboards(JSON.parse(savedDashboards));
      }
    }
  }, [userId]);

  // Save dashboards to localStorage
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`dashboards_${userId}`, JSON.stringify(dashboards));
    }
  }, [dashboards, userId]);

  // Update charts when dashboard changes
  useEffect(() => {
    if (selectedDashboard) {
      const dashboard = dashboards.find(d => d.id === selectedDashboard);
      setCharts(dashboard?.charts || []);
    } else {
      setCharts([]);
    }
  }, [selectedDashboard, dashboards]);

  // Save current dashboard state
  const saveDashboardState = useCallback(() => {
    if (selectedDashboard) {
      setDashboards(prev => prev.map(dashboard => 
        dashboard.id === selectedDashboard
          ? { ...dashboard, charts }
          : dashboard
      ));
    }
  }, [selectedDashboard, charts]);

  // Auto-save when charts change
  useEffect(() => {
    if (!selectedDashboard) return;
    
    const timeoutId = setTimeout(() => {
      setDashboards(prev => prev.map(dashboard => 
        dashboard.id === selectedDashboard
          ? { ...dashboard, charts }
          : dashboard
      ));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [charts, selectedDashboard]);

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

  // Handle dashboard deletion
  // const handleDeleteDashboard = useCallback(() => {
  //   if (dashboardToDelete) {
  //     setDashboards(prev => prev.filter(d => d.id !== dashboardToDelete));
  //     if (selectedDashboard === dashboardToDelete) {
  //       setSelectedDashboard(null);
  //       setCharts([]);
  //     }
  //     setDeleteDialogOpen(false);
  //     setDashboardToDelete(null);
  //   }
  // }, [dashboardToDelete, selectedDashboard]);

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
  const handleChartCreate = useCallback(async (chartData: ChartCreationData & { position: Position,options?:ChartOptions }) => {
    if (!userId || !selectedFile || !selectedDashboard) return;

    try {
      const response = await fetch(`http://localhost:5000/generate-graph/${userId}/${selectedFile.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartType: chartData.type,
          selectedColumns: chartData.columns,
          options: chartData.options // New options for additional chart types
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chart');
      }

      const { graph_id, url } = await response.json();
      
      const newChart = {
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
  }, [userId, selectedFile, selectedDashboard, clickPosition]);
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
       <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6">
          {/* File Selection */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="hover:bg-gray-100">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px]">
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
                      className="w-full justify-start mb-1 hover:bg-blue-50"
                      onClick={() => handleFileSelection(file.file_id)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {file.filename}
                    </Button>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
           {/* Selected File Name Display */}
           {selectedFile && (
            <div className="flex items-center px-3 py-1.5 bg-blue-50 rounded-md">
              <FileText className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">
                {fileList?.find(f => f.file_id === selectedFile.id)?.filename || 'Selected File'}
              </span>
            </div>
          )}


          {/* Dashboard Selection with Delete Option */}
          <div className="flex items-center space-x-2">
            <Select value={selectedDashboard || ''} onValueChange={setSelectedDashboard}>
              <SelectTrigger className="w-[220px]">
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
            {/* {selectedDashboard && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => {
                  setDashboardToDelete(selectedDashboard);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )} */}
          </div>

          {/* New Dashboard Creation */}
          <div className="flex items-center space-x-2">
            <Input
              placeholder="New Dashboard Name"
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              className="w-[220px]"
            />
            <Button
              variant="outline"
              onClick={handleCreateDashboard}
              disabled={!newDashboardName.trim()}
              className="hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </div>

      {/* Graph Area with improved styling */}
      <div className="flex-1 relative bg-gray-100 overflow-hidden p-6">
        <div
          className="absolute inset-0 p-6"
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

      {/* Delete Dashboard Dialog */}
      {/* <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dashboard</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dashboard? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDashboard}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}

      {/* Enhanced Chart Modal */}
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
        <Alert variant="destructive" className="fixed bottom-4 right-4 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {fileListError || dataError}
          </AlertDescription>
        </Alert>
      )}

       {/* Loading Overlay */}
       {dataLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <Loader className="animate-spin w-6 h-6 text-blue-500" />
            <span className="text-sm font-medium">Loading data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardMain;