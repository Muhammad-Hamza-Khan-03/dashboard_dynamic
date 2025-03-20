"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import useFilesList from '@/features/sqlite/api/file-list';
import { handleUseCSV } from '@/features/sqlite/api/file-content';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, Loader, Plus, PlusCircle, Type } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DraggableChart from './drag-chart';
import ChartModal from './chartmodal';
import FlowBoard from './flow-board';
import { ThemeProvider, ThemeSelector } from './theme-provider';
import FileSelectionPopover from './FileSelectionPopover';
import { useNodesState, useEdgesState } from '@xyflow/react';
import { Table, Database } from 'lucide-react';
import StatCardModal from './stat-Card-Modal';
import DataTableModal from './dataTableSelection';
import SaveDashboardButton from './save-dashboard-button';
import { BrainCircuit } from 'lucide-react';
import AiDashboardModal, { AiDashboardConfig } from './ai-dashboard/aiDashboardModal'
import { toast } from '@/components/ui/use-toast';

// Interfaces
interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface Chart {
  id: string;
  type: string;
  title: string;
  description?: string;
  graphUrl: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
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
  description?: string; // Add the 'description' property
  options?: ChartOptions; // Add the 'options' property
}

interface TextBoxData {
  id: string;
  type: 'textbox';
  content: string;
  position: { x: number; y: number };
}
interface DataTable {
  id: string;
  columns: string[];
  data: any[];
  title: string;
  position: { x: number; y: number };
}

interface StatCard {
  id: string;
  column: string;
  statType: string;
  title: string;
  position: { x: number; y: number };
  data: any[];
}

// Custom Node Component for Charts

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

  const [showAiDashboardModal, setShowAiDashboardModal] = useState<boolean>(false);

  // const [nodes, setNodes] = useNodesState([]);
  // const [edges, setEdges] = useEdgesState([]);

  const [mode, setMode] = useState<'none' | 'chart' | 'textbox' | 'datatable' | 'statcard'>('none');
  const [textBoxes, setTextBoxes] = useState<TextBoxData[]>([]);


  const [showDataTableModal, setShowDataTableModal] = useState<boolean>(false);
  const [showStatCardModal, setShowStatCardModal] = useState<boolean>(false);
  const [dataTables, setDataTables] = useState<DataTable[]>([]);
  const [statCards, setStatCards] = useState<StatCard[]>([]);


  type ContentMode = 'none' | 'chart' | 'textbox' | 'datatable' | 'statcard';

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
  const handleAiDashboardCreate = async (config: AiDashboardConfig) => {
    if (!selectedDashboard) {
      toast({
        title: "No dashboard selected",
        description: "Please select or create a dashboard first.",
        variant: "destructive",
      });
      return;
    }
  
    // Process charts
    if (config.charts && config.charts.length > 0) {
      for (const chartConfig of config.charts) {
        handleChartCreate({
          type: chartConfig.type,
          columns: chartConfig.columns,
          title: chartConfig.title,
          description: chartConfig.description,
          position: chartConfig.position
        });
      }
    }
  
    // Process text boxes with unique IDs
    if (config.textBoxes && config.textBoxes.length > 0) {
      for (const textBox of config.textBoxes) {
        // Ensure each text box gets a unique ID with both timestamp and random component
        const newTextBox: TextBoxData = {
          id: `textbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'textbox',
          content: textBox.content,
          position: textBox.position
        };
        setTextBoxes(prev => [...prev, newTextBox]);
        
        // Small delay to ensure timestamp difference
        // This is a safety measure in case the loop processes very quickly
        if (config.textBoxes.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
    }
  
    // Process data tables with unique IDs
    if (config.dataTables && config.dataTables.length > 0) {
      for (const tableConfig of config.dataTables) {
        handleDataTableCreate({
          columns: tableConfig.columns,
          title: tableConfig.title,
          position: tableConfig.position
        });
        
        // Small delay to ensure timestamp difference
        if (config.dataTables.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
    }
  
    // Process stat cards with unique IDs
    if (config.statCards && config.statCards.length > 0) {
      for (const cardConfig of config.statCards) {
        handleStatCardCreate({
          column: cardConfig.column,
          statType: cardConfig.statType,
          title: cardConfig.title,
          position: cardConfig.position
        });
        
        // Small delay to ensure timestamp difference
        if (config.statCards.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
    }
  
    toast({
      title: "Dashboard created successfully",
      description: `Added ${config.charts?.length || 0} charts, ${config.textBoxes?.length || 0} text boxes, ${config.dataTables?.length || 0} data tables, and ${config.statCards?.length || 0} stat cards.`,
    });
  };
  const handleChartTitleChange = useCallback((chartId: string, title: string) => {
    setCharts(prev => prev.map(chart =>
      chart.id === chartId ? { ...chart, title } : chart
    ));
  }, []);


  const handleDataTableCreate = useCallback((config: {
    columns: string[];
    title: string;
    position: { x: number; y: number };
  }) => {
    if (!selectedFile) return;

    // Filter data to only include selected columns
    const filteredData = selectedFile.data.map(row => {
      const newRow: Record<string, any> = {};
      config.columns.forEach(col => {
        newRow[col] = row[col];
      });
      return newRow;
    }); const newTable: DataTable = {
      id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      columns: config.columns,
      data: filteredData,
      title: config.title,
      position: config.position
    };

    setDataTables(prev => [...prev, newTable]);
  }, [selectedFile]);

  const handleStatCardCreate = useCallback((config: {
    column: string;
    statType: string;
    title: string;
    position: { x: number; y: number };
  }) => {
    if (!selectedFile) return;

    const newCard: StatCard = {
      id: `card-${Date.now()}`,
      column: config.column,
      statType: config.statType,
      title: config.title,
      position: config.position,
      data: selectedFile.data
    };

    setStatCards(prev => [...prev, newCard]);
  }, [selectedFile]);

  const handleStatCardPositionChange = useCallback((id: string, position: Position) => {
    setStatCards(prev => prev.map(card =>
      card.id === id ? {
        ...card,
        position: {
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height
        }
      } : card
    ));
  }, []);

  const handleDataTableRemove = useCallback((id: string) => {
    setDataTables(prev => prev.filter(table => table.id !== id));
  }, []);

  const handleRemoveStatCard = useCallback((id: string) => {
    // Update the statCards state by filtering out the card with the matching id
    setStatCards(prevCards => prevCards.filter(card => card.id !== id));
  }, []);

  const handleDescriptionChange = useCallback((chartId: string, description: string) => {
    setCharts(prev => prev.map(chart =>
      chart.id === chartId
        ? { ...chart, description }
        : chart
    ));
  }, []);
  // Handle chart position change
  const handleChartPosition = useCallback((chartId: string, newPosition: Position) => {
    setCharts(prev => prev.map(chart =>
      chart.id === chartId ? {
        ...chart,
        position: {
          x: newPosition.x,
          y: newPosition.y,
          width: newPosition.width || chart.position.width,
          height: newPosition.height || chart.position.height
        }
      } : chart
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

  const handleGraphAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (maximizedChart || mode === 'none') return;

    const flowContainer = e.currentTarget.closest('.react-flow');
    if (!flowContainer) return;

    const rect = flowContainer.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (mode === 'chart') {
      setClickPosition(position);
      setShowChartModal(true);
    } else if (mode === 'textbox') {
      const newTextBox: TextBoxData = {
        id: `textbox-${Date.now()}`,
        type: 'textbox',
        content: 'Click to edit',
        position
      };
      setTextBoxes(prev => [...prev, newTextBox]);
    } else if (mode === 'datatable') {
      setClickPosition(position);
      setShowDataTableModal(true);
    }
    else if (mode === 'statcard') {
      setClickPosition(position);
      setShowStatCardModal(true);
    }
    setMode('none');
  }, [maximizedChart, mode]);

  // Update the text box handlers to use textBoxes state instead of nodes
  const handleTextBoxContentChange = useCallback((id: string, content: string) => {
    setTextBoxes(prev => prev.map(box =>
      box.id === id ? { ...box, content } : box
    ));
  }, []);

  const handleTextBoxRemove = useCallback((id: string) => {
    setTextBoxes(prev => prev.filter(box => box.id !== id));
  }, []);

  // Add textbox position change handler
  const handleTextBoxPositionChange = useCallback((id: string, position: Position) => {
    setTextBoxes(prev => prev.map(box =>
      box.id === id ? {
        ...box,
        position: {
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height
        }
      } : box
    ));
  }, []);
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


  const handleDataTablePositionChange = useCallback((id: string, position: Position) => {
    setDataTables(prev => prev.map(table =>
      table.id === id ? {
        ...table,
        position: {
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height
        }
      } : table
    ));
  }, []);


  const handleChartCreate = useCallback(async (chartData: ChartCreationData & { position: Position }) => {
    if (!userId || !selectedFile || !selectedDashboard) return;

    try {
      console.log('Sending chart creation request with data:', {
        chartType: chartData.type,
        selectedColumns: chartData.columns,
        options: chartData.options
      });

      // Add a check for 3D chart types and convert to appropriate format for backend
      const is3DChartType = ['surface3d', 'bar3d', 'line3d', 'scatter3d'].includes(chartData.type);

      // Convert chart type to backend-compatible format
      let backendChartType = chartData.type;

      // Map 3D chart types to what the backend expects
      const chartTypeMapping = {
        'scatter3d': 'scatter3D',
        'line3d': 'line3D',
        'bar3d': 'bar3D',
        'surface3d': 'surface3D'
      };

      if (is3DChartType) {
        console.log('Creating a 3D chart type:', chartData.type);
        backendChartType = chartTypeMapping[chartData.type as keyof typeof chartTypeMapping] || chartData.type;
        console.log('Mapped to backend chart type:', backendChartType);

        // For 3D charts, add extra validation
        if (chartData.columns.length < 3) {
          setDataError(`${chartData.type} requires at least 3 columns (x, y, z)`);
          return;
        }
      }

      const response = await fetch(`http://localhost:5000/generate-graph/${userId}/${selectedFile.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartType: backendChartType, // Use the mapped chart type for backend
          selectedColumns: chartData.columns,
          options: chartData.options
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server responded with error:', errorText);
        throw new Error(`Failed to generate chart: ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Response from generate-graph:', responseData);

      const { graph_id, url, title } = responseData;
      console.log('Extracted title:', title);

      // Use the title returned from the backend or fall back to other options
      const chartTitle = title || chartData.title || `${chartData.type.charAt(0).toUpperCase() + chartData.type.slice(1)} Chart`;
      console.log('Final chart title being used:', chartTitle);

      const newChart: Chart = {
        id: graph_id,
        type: chartData.type,
        title: chartTitle,
        description: chartData.description || '',
        graphUrl: `http://localhost:5000${url}`,
        position: {
          x: chartData.position.x,
          y: chartData.position.y,
          width: 800,
          height: 600
        }
      };

      console.log('New chart object:', newChart);
      setCharts(prev => [...prev, newChart]);
      setShowChartModal(false);
    } catch (error) {
      console.error('Error creating chart:', error);
      setDataError(error instanceof Error ? error.message : 'Failed to create chart');
    }
  }, [userId, selectedFile, selectedDashboard, setDataError]);

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
    <ThemeProvider defaultTheme="azure">
      <div className="h-screen flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b p-4 flex items-center justify-between shadow-sm">

          {/* <div className="flex items-center space-x-6">
          
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
          
           {selectedFile && (
            <div className="flex items-center px-3 py-1.5 bg-blue-50 rounded-md">
              <FileText className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">
                {fileList?.find(f => f.file_id === selectedFile.id)?.filename || 'Selected File'}
              </span>
            </div>
          )} 
           */}
          <div className="flex items-center space-x-6">
            <FileSelectionPopover
              files={fileList || []}
              loading={filesLoading}
              selectedFileId={selectedFile?.id || null}
              onSelect={handleFileSelection}
            />

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


            <div className='flex items-center space-x-2'>
            <SaveDashboardButton
    userId={userId}
    currentDashboardId={selectedDashboard}
    currentDashboardName={dashboards.find(d => d.id === selectedDashboard)?.name || 'Dashboard'}
    charts={charts}
    disabled={!selectedDashboard}
  />

{/* <EnhancedExportButton
    userId={userId}
    currentDashboardId={selectedDashboard}
    currentDashboardName={dashboards.find(d => d.id === selectedDashboard)?.name || 'Dashboard'}
    charts={charts}
    textBoxes={textBoxes}
    dataTables={dataTables}
    statCards={statCards}
    disabled={!selectedDashboard}
    usePreRendered={true} // Enable pre-rendered export by default
  />*/}
            </div> 
          </div>
        </div>

        {/* Graph Area with improved styling */}
           {/* <div className="flex-1 relative bg-gray-100 overflow-hidden p-6">
        <div
          className="absolute inset-0 p-6"
          onDoubleClick={handleGraphAreaClick}
        >
          {charts.map(chart => (
  <DraggableChart
    key={chart.id}
    id={chart.id}
    title={chart.title}
    description={chart.description}
    graphUrl={chart.graphUrl}
    position={chart.position}
    onPositionChange={handleChartPosition}
    onRemove={handleRemoveChart}
    isMaximized={maximizedChart === chart.id}
    onMaximizeToggle={handleMaximizeToggle}
    onDescriptionChange={handleDescriptionChange}
  />
))}
        </div>
      </div> */}
<div className="flex-1 relative bg-gray-100 overflow-hidden">
          <FlowBoard
            charts={charts}
            textBoxes={textBoxes}
            dataTables={dataTables}
            statCards={statCards}
            onChartPositionChange={handleChartPosition}
            onChartRemove={handleRemoveChart}
            onChartMaximize={handleMaximizeToggle}
            onChartDescriptionChange={handleDescriptionChange}
            onChartTitleChange={handleChartTitleChange}
            onTextBoxPositionChange={handleTextBoxPositionChange}
            onTextBoxContentChange={handleTextBoxContentChange}
            onTextBoxRemove={handleTextBoxRemove}
            onDataTablePositionChange={handleDataTablePositionChange}
            onDataTableRemove={handleDataTableRemove}
            onStatCardPositionChange={handleStatCardPositionChange}
            onStatCardRemove={handleRemoveStatCard}
            maximizedChart={maximizedChart}
            onAreaClick={handleGraphAreaClick}
          />
        </div>
        {/* Creation Controls */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col space-y-2">
          <Button
            variant={mode === 'chart' ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => setMode(prev => prev === 'chart' ? 'none' : 'chart')}
          >
            <PlusCircle className="h-5 w-5" />
          </Button>

          <Button
            variant={mode === 'textbox' ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => setMode(prev => prev === 'textbox' ? 'none' : 'textbox')}
          >
            <Type className="h-5 w-5" />
          </Button>
          <Button
            variant={mode === 'datatable' ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => setMode(prev => prev === 'datatable' ? 'none' : 'datatable')}
          >
            <Table className="h-5 w-5" />
          </Button>
          <Button
            variant={mode === 'statcard' ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={() => setMode(prev => prev === 'statcard' ? 'none' : 'statcard')}
          >
            <Database className="h-5 w-5" />
          </Button>
          <Button
    variant="outline"
    size="icon"
    className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
    onClick={() => setShowAiDashboardModal(true)}
  >
    <BrainCircuit className="h-5 w-5 text-purple-500" />
  </Button>
        </div>

        {showDataTableModal && selectedFile && (
          <DataTableModal
            isOpen={showDataTableModal}
            onClose={() => setShowDataTableModal(false)}
            onExport={handleDataTableCreate}
            position={clickPosition}
            columns={selectedFile.columns}
          />
        )}

        {showStatCardModal && selectedFile && (
          <StatCardModal
            isOpen={showStatCardModal}
            onClose={() => setShowStatCardModal(false)}
            onExport={handleStatCardCreate}
            position={clickPosition}
            columns={selectedFile.columns}
          />
        )}
        

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
        
        {/* AI Dashboard Modal */}
{showAiDashboardModal && selectedFile && (
  <AiDashboardModal
    isOpen={showAiDashboardModal}
    onClose={() => setShowAiDashboardModal(false)}
    onCreateDashboard={handleAiDashboardCreate}
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

      {/* </div> */}
{/* Add Theme Selector */}
<ThemeSelector />
    </ThemeProvider>
  );
};

export default BoardMain;