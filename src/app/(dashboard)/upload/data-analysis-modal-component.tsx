'use client'
import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, Info, Bug } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import axios from 'axios';
import { useInterval } from './use-interval';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import dynamic from 'next/dynamic'

// Add a loading wrapper with debug info
const PlotWithDebug: React.FC<{
  isLoading: boolean;
  plotData: any[];
  error: Error | null;
  layout: Partial<Plotly.Layout>;
  config: Partial<Plotly.Config>;
  style?: React.CSSProperties;
}> = ({ isLoading, plotData, error, layout, config, style }) => {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  if (isLoading) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="h-80 w-full flex flex-col items-center justify-center bg-red-50 rounded-md p-4">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <h3 className="text-sm font-medium text-red-800">Error rendering chart</h3>
        <p className="text-xs text-red-600 text-center mt-1">{error.message || String(error)}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
        >
          {showDebugInfo ? "Hide Details" : "Show Details"}
        </Button>
        
        {showDebugInfo && (
          <div className="mt-3 w-full max-h-40 overflow-auto bg-white p-2 rounded border text-xs">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify({plotData, error: String(error), stack: error.stack}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }
  
  // Ensure we have real data before trying to render
  const hasValidData = Array.isArray(plotData) && 
                      plotData.length > 0 && 
                      plotData.every(item => item !== undefined && item !== null);
  
  if (!hasValidData) {
    return (
      <div className="h-80 w-full flex flex-col items-center justify-center bg-yellow-50 rounded-md p-4">
        <Info className="h-8 w-8 text-yellow-500 mb-2" />
        <h3 className="text-sm font-medium">No valid data to display</h3>
        <p className="text-xs text-center mt-1">The chart data may be empty or invalid</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
        >
          {showDebugInfo ? "Hide Data" : "Inspect Data"}
        </Button>
        
        {showDebugInfo && (
          <div className="mt-3 w-full max-h-40 overflow-auto bg-white p-2 rounded border text-xs">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(plotData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }
  
  // Now we know we have valid data, try to render the Plot
  try {
    const Plot = dynamic(
      () => import('react-plotly.js'),
      { 
        ssr: false, 
        loading: () => (
          <div className="h-80 w-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading Plotly...</span>
          </div>
        )
      }
    );
    
    return (
      <div className="relative">
        {showDebugInfo && (
          <div className="absolute top-0 right-0 z-10">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDebugInfo(false)}
              className="h-8 w-8 p-0 rounded-full"
            >
              <span className="sr-only">Close debug</span>
              ✕
            </Button>
          </div>
        )}
        
        <Plot
          data={plotData}
          layout={layout}
          config={config}
          style={style}
        />
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="absolute bottom-1 right-1 h-6 opacity-50 hover:opacity-100"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
        >
          <Bug className="h-3 w-3 mr-1" />
          <span className="text-[10px]">Debug</span>
        </Button>
        
        {showDebugInfo && (
          <div className="mt-2 w-full max-h-40 overflow-auto bg-gray-50 p-2 rounded border text-xs">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify({plotData, layout}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  } catch (err) {
    return (
      <div className="h-80 w-full flex flex-col items-center justify-center bg-red-50 rounded-md p-4">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <h3 className="text-sm font-medium text-red-800">Error rendering Plot component</h3>
        <p className="text-xs text-red-600 text-center mt-1">{(err as Error).message}</p>
      </div>
    );
  }
};

// Type definitions for better type safety
interface AnalysisModalProps {
  fileId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  fileChanged?: boolean;
}

interface TableInfo {
  id: string;
  name: string;
  full_name: string;
}

interface ColumnStatistics {
  ready: boolean;
  data_type: string;
  basic_stats: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    mode?: number;
    missing_count: number;
    missing_percentage: number;
    unique_count?: number;
    top?: string;
    top_count?: number;
  };
  distribution: {
    histogram?: {
      counts: number[];
      bin_edges: number[];
    };
    boxplot?: {
      q1: number;
      q3: number;
      median: number;
      whislo: number;
      whishi: number;
    };
    qqplot?: {
      x: number[];
      y: number[];
    };
    value_counts?: {
      [key: string]: number;
    };
  };
  shape_stats: {
    skewness?: number;
    kurtosis?: number;
    range?: number;
    entropy?: number;
  };
  outlier_stats: {
    count?: number;
    percentage?: number;
    lower_bound?: number;
    upper_bound?: number;
    outlier_values?: number[];
  };
}

interface DatasetStatistics {
  ready: boolean;
  correlation_matrix: { [key: string]: { [key: string]: number } };
  parallel_coords: {
    columns: string[];
    data: number[][];
    ranges: { [key: string]: [number, number] };
  };
  violin_data: {
    columns: string[];
    data: { [key: string]: number[] };
    stats: {
      [key: string]: {
        min: number;
        max: number;
        mean: number;
        median: number;
        q1: number;
        q3: number;
      };
    };
  };
  heatmap_data: {
    z: number[][];
    x: string[];
    y: string[];
    p_values: { [key: string]: { [key: string]: number } };
  };
  scatter_matrix: {
    columns: string[];
    data: { [key: string]: number }[];
  };
}

// Modify the AnalysisModal component to use the pre-computed statistics
const AnalysisModal = ({ fileId, userId, isOpen, onClose, fileChanged=false}: AnalysisModalProps) => {
  // Keep existing state variables
  const [loading, setLoading] = useState(false);
  const [chartErrors, setChartErrors] = useState<{[key: string]: Error | null}>({});
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileType, setFileType] = useState<string>('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [debugMode, setDebugMode] = useState(false);
  
  // Add new state variables for statistics
  const [columnStats, setColumnStats] = useState<{ [key: string]: ColumnStatistics }>({});
  const [datasetStats, setDatasetStats] = useState<DatasetStatistics | null>(null);
  const [statsReady, setStatsReady] = useState(false);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [taskMessage, setTaskMessage] = useState<string>('');
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen) {
      // Reset chart errors when modal opens
      setChartErrors({});
    }
  }, [isOpen]);
  
  // Check if statistics are ready when the modal opens
  useEffect(() => {
    if (isOpen && fileId && userId) {
      checkStatisticsStatus();
    }
    
    return () => {
      // Clean up polling when component unmounts or modal closes
      setIsPolling(false);
    };
  }, [isOpen, fileId, userId]);

  // Add a useEffect to reset state when file changes
  useEffect(() => {
    if (fileChanged) {
      // Reset all statistics state
      setColumnStats({});
      setDatasetStats(null);
      setStatsReady(false);
      setTaskId(null);
      setTaskStatus(null);
      setTaskProgress(0);
      setTaskMessage('');
    }
  }, [fileChanged]);

  // Function to check statistics status - now with better error handling for parent/child files
  const checkStatisticsStatus = async () => {
    if (!fileId || !userId) return;
    
    try {
      setLoading(true);
      
      // First, check if this is a parent file with child tables/sheets
      const fileResponse = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);
      console.log("File response:", fileResponse.data);
      
      // If this is a parent file (like Excel workbook or DB), it will have 'tables' field
      if (fileResponse.data.tables && fileResponse.data.tables.length > 0) {
        // Store tables and select the first one
        setTables(fileResponse.data.tables);
        setSelectedTableId(fileResponse.data.tables[0].id);
        setFileType(fileResponse.data.file_type);
        
        // Check statistics status for the first child table/sheet
        const response = await axios.get(`http://localhost:5000/get-stats-status/${userId}/${fileResponse.data.tables[0].id}`);
        console.log("Stats status for first table:", response.data);
        
        if (response.data.stats_complete) {
          // Statistics are ready for the first table/sheet
          setStatsReady(true);
          setIsPolling(false);
          toast({
            title: "Statistics Ready",
            description: "Statistics for the first sheet/table are already calculated",
          });
        } else {
          // Start calculation for the first table/sheet if not already in progress
          startStatisticsCalculation(fileResponse.data.tables[0].id);
        }
      } else {
        // This is a regular file, proceed with normal stats check
        const response = await axios.get(`http://localhost:5000/get-stats-status/${userId}/${fileId}`);
        console.log("Stats status for file:", response.data);
        
        if (response.data.stats_complete) {
          // Statistics are ready
          setStatsReady(true);
          setIsPolling(false);
          toast({
            title: "Statistics Ready",
            description: "Statistics are already calculated and ready to view",
          });
        } else {
          // Start calculation if not already in progress
          startStatisticsCalculation(fileId);
        }
      }
    } catch (error) {
      console.error('Error checking statistics status:', error);
      setError('Failed to check statistics status. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  // Function to start statistics calculation - now supports child tables/sheets
  const startStatisticsCalculation = async (targetFileId: string = fileId) => {
    if (!userId) return;
    
    try {
      console.log("Starting stats calculation for:", targetFileId);
      const response = await axios.post(`http://localhost:5000/start-stats-calculation/${userId}/${targetFileId}`);
      console.log("Start stats response:", response.data);
      
      if (response.data.task_id) {
        setTaskId(response.data.task_id);
        setTaskStatus('pending');
        setTaskMessage(response.data.message);
        setIsPolling(true);
        
        toast({
          title: "Statistics Calculation",
          description: "Statistics calculation has started in the background",
        });
      }
    } catch (error) {
      console.error('Error starting statistics calculation:', error);
      setError('Failed to start statistics calculation. Please try again later.');
    }
  };

  // Polling function to check task status
  useInterval(
    async () => {
      if (!taskId) return;
      
      try {
        const response = await axios.get(`http://localhost:5000/check-stats-task/${taskId}`);
        console.log("Task status update:", response.data);
        const { status, progress, message } = response.data;
        
        setTaskStatus(status);
        if (progress !== undefined) setTaskProgress(progress);
        if (message) setTaskMessage(message);
        
        if (status === 'completed') {
          setIsPolling(false);
          setStatsReady(true);
          
          // Show success toast
          toast({
            title: "Statistics Ready",
            description: "Statistics calculation completed successfully",
            variant: "default",
          });
          
          // Load statistics data for current selection
          const currentId = selectedTableId || fileId;
          
          fetchDatasetStatistics(currentId);
          const cols = columns.length > 0 ? columns : await fetchColumnsForFile(currentId);
          if (cols && cols.length > 0) {
            fetchColumnStatistics(cols, currentId);
          }
        } else if (status === 'failed') {
          setIsPolling(false);
          
          // Show error toast
          toast({
            title: "Calculation Failed",
            description: message || "Statistics calculation failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error checking task status:', error);
      }
    },
    isPolling ? 2000 : null  // Poll every 2 seconds if polling is enabled
  );

  // Helper function to fetch columns for a file
  const fetchColumnsForFile = async (targetFileId: string): Promise<string[]> => {
    try {
      const response = await axios.get(`http://localhost:5000/get-file/${userId}/${targetFileId}`);
      if (response.data.columns) {
        return response.data.columns;
      }
      return [];
    } catch (error) {
      console.error('Error fetching columns:', error);
      return [];
    }
  };

  // Handle table/sheet selection
  const handleTableChange = async (tableId: string) => {
    console.log("Selected table:", tableId);
    setSelectedTableId(tableId);
    setColumnStats({});
    setDatasetStats(null);
    setChartErrors({});  // Reset chart errors
    
    try {
      // Check stats status for this table
      const response = await axios.get(`http://localhost:5000/get-stats-status/${userId}/${tableId}`);
      console.log("Stats status for selected table:", response.data);
      
      if (response.data.stats_complete) {
        setStatsReady(true);
        // Load statistics for this table
        fetchDatasetStatistics(tableId);
        const tableResponse = await axios.get(`http://localhost:5000/get-file/${userId}/${tableId}`);
        if (tableResponse.data.columns) {
          setColumns(tableResponse.data.columns);
          fetchColumnStatistics(tableResponse.data.columns, tableId);
        }
      } else {
        setStatsReady(false);
        // Start calculation for this table
        startStatisticsCalculation(tableId);
      }
    } catch (error) {
      console.error('Error handling table change:', error);
      setError('Failed to load statistics for this table/sheet');
    }
  };

  // Render progress indicator
  const renderProgress = () => {
    if (!taskId || taskStatus === 'completed') return null;
    
    return (
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            {taskStatus === 'processing' ? 'Processing statistics...' : 'Waiting to start...'}
          </span>
          <span className="text-sm text-gray-500">{Math.round(taskProgress * 100)}%</span>
        </div>
        <Progress value={taskProgress * 100} className="h-2" />
        <p className="text-xs text-gray-500">{taskMessage}</p>
      </div>
    );
  };

  // Fetch file metadata and basic file structure
  useEffect(() => {
    const fetchFileMetadata = async () => {
      if (!isOpen || !fileId || !userId) return;

      setLoading(true);
      setError(null);

      try {
        console.log("Fetching file metadata for:", fileId);
        const response = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);
        console.log("File metadata response:", response.data);

        if (response.data.type === 'structured') {
          setFileType(response.data.file_type);

          if (response.data.tables && response.data.tables.length > 0) {
            // This is a parent file (Excel workbook or DB)
            setTables(response.data.tables);
            setSelectedTableId(response.data.tables[0].id);
            
            // Fetch data for the first table
            const tableResponse = await axios.get(`http://localhost:5000/get-file/${userId}/${response.data.tables[0].id}`);
            console.log("First table data:", tableResponse.data);
            
            if (tableResponse.data.data && tableResponse.data.columns) {
              setData(tableResponse.data.data);
              setColumns(tableResponse.data.columns);
              
              // Fetch statistics if they're ready
              if (statsReady) {
                fetchDatasetStatistics(response.data.tables[0].id);
                fetchColumnStatistics(tableResponse.data.columns, response.data.tables[0].id);
              }
            }
          } else if (response.data.data) {
            // This is a regular structured file
            setData(response.data.data);
            setColumns(response.data.columns || []);
            
            // Fetch statistics if they're ready
            if (statsReady) {
              fetchDatasetStatistics();
              fetchColumnStatistics(response.data.columns);
            }
          }
        }
      } catch (err: any) {
        console.error('Error fetching file metadata:', err);
        setError(err.response?.data?.error || 'Failed to fetch file data');
      } finally {
        setLoading(false);
      }
    };

    fetchFileMetadata();
  }, [isOpen, fileId, userId, statsReady, selectedTableId]);

  // Fetch dataset statistics with enhanced error handling
  const fetchDatasetStatistics = async (targetFileId: string = fileId) => {
    try {
      console.log("Fetching dataset statistics for:", targetFileId);
      const response = await axios.get(`http://localhost:5000/get-dataset-statistics/${userId}/${targetFileId}`);
      console.log("Dataset statistics response:", response.data);
      
      if (response.data.ready) {
        setDatasetStats(response.data);
      } else {
        console.log("Dataset statistics not ready for file:", targetFileId);
      }
    } catch (error) {
      console.error('Error fetching dataset statistics:', error);
    }
  };

  // Fetch column statistics with enhanced error handling
  const fetchColumnStatistics = async (columnList: string[], targetFileId: string = fileId) => {
    try {
      console.log("Fetching column statistics for:", targetFileId, "columns:", columnList);
      
      const statsPromises = columnList.map(column => 
        axios.get(`http://localhost:5000/get-column-statistics/${userId}/${targetFileId}/${column}`)
      );
      
      const responses = await Promise.all(statsPromises);
      console.log("Column statistics responses:", responses.map(r => r.data));
      
      const newColumnStats: { [key: string]: ColumnStatistics } = {};
      responses.forEach((response, index) => {
        if (response.data.ready) {
          newColumnStats[columnList[index]] = response.data;
        }
      });
      
      setColumnStats(newColumnStats);
    } catch (error) {
      console.error('Error fetching column statistics:', error);
    }
  };

  // Render distribution analysis with error handling
  const renderDistributionAnalysis = () => {
    if (Object.keys(columnStats).length === 0) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading statistics...</p>
        </div>
      );
    }

    // Add a fallback if no numeric columns found
    const numericColumns = Object.entries(columnStats)
      .filter(([_, stats]) => stats.data_type === 'numeric');
      
    if (numericColumns.length === 0) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No numeric columns found to analyze. Distribution analysis requires numeric data.
          </AlertDescription>
        </Alert>
      );
    }

    return Object.entries(columnStats).map(([column, stats]) => {
      if (stats.data_type !== 'numeric') return null;

      const distribution = stats.distribution;
      
      if (!distribution || !distribution.boxplot) {
        return (
          <Card key={column} className="mb-6">
            <CardHeader>
              <CardTitle>{column} Distribution Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Distribution data is missing or incomplete for this column.
                </AlertDescription>
              </Alert>
              
              {/* {debugMode && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-semibold mb-2">Debug Information</h4>
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-white border rounded">
                    {JSON.stringify(stats, null, 2)}
                  </pre>
                </div>
              )} */}
            </CardContent>
          </Card>
        );
      }
      
      try {
        // Box plot trace using pre-computed stats
        const boxData = [
          {
            type: 'box',
            name: 'Box Plot',
            y: [
              distribution.boxplot?.q1,
              distribution.boxplot?.median,
              distribution.boxplot?.q3,
              distribution.boxplot?.whislo,
              distribution.boxplot?.whishi
            ].filter(val => val !== undefined),
            boxpoints: 'outliers',
            marker: { color: 'rgb(107, 107, 255)' },
          }
        ];

        // Histogram trace using pre-computed stats
        const histData = [
          {
            x: distribution.histogram?.bin_edges.slice(0, -1).map((edge, i) => 
              (edge + (distribution.histogram?.bin_edges?.[i + 1] ?? 0)) / 2
            ),
            y: distribution.histogram?.counts,
            type: 'bar',
            name: 'Distribution',
            opacity: 0.75
          }
        ];

        // QQ plot trace using pre-computed stats
        const qqData = [
          {
            x: distribution.qqplot?.x,
            y: distribution.qqplot?.y,
            mode: 'markers',
            type: 'scatter',
            name: 'Q-Q Plot'
          }
        ];

        return (
          <Card key={column} className="mb-6">
            <CardHeader>
              <CardTitle>{column} Distribution Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="w-full">
                  <PlotWithDebug
                    isLoading={false}
                    plotData={boxData}
                    error={chartErrors[`box_${column}`] || null}
                    layout={{
                      title: 'Box Plot',
                      height: 300,
                      margin: { t: 30, r: 10, l: 40, b: 30 },
                      showlegend: false
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="w-full">
                  <PlotWithDebug
                    isLoading={false}
                    plotData={histData}
                    error={chartErrors[`hist_${column}`] || null}
                    layout={{
                      title: 'Histogram',
                      height: 300,
                      margin: { t: 30, r: 10, l: 40, b: 30 },
                      showlegend: false
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="w-full">
                  <PlotWithDebug
                    isLoading={false}
                    plotData={qqData}
                    error={chartErrors[`qq_${column}`] || null}
                    layout={{
                      title: 'Q-Q Plot',
                      height: 300,
                      margin: { t: 30, r: 10, l: 40, b: 30 },
                      showlegend: false
                    }}
                    config={{ responsive: true }}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Basic Stats</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Mean:</dt>
                      <dd className="font-mono">{stats.basic_stats.mean?.toFixed(3) || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Median:</dt>
                      <dd className="font-mono">{stats.basic_stats.median?.toFixed(3) || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Mode:</dt>
                      <dd className="font-mono">{stats.basic_stats.mode?.toFixed(3) || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Spread</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Std Dev:</dt>
                      <dd className="font-mono">{Math.sqrt(stats.shape_stats.skewness || 0).toFixed(3)}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">IQR:</dt>
                      <dd className="font-mono">{((distribution.boxplot?.q3 || 0) - (distribution.boxplot?.q1 || 0)).toFixed(3)}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Range:</dt>
                      <dd className="font-mono">{stats.shape_stats.range?.toFixed(3) || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Shape</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Skewness:</dt>
                      <dd className="font-mono">{stats.shape_stats.skewness?.toFixed(3) || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Kurtosis:</dt>
                      <dd className="font-mono">{stats.shape_stats.kurtosis?.toFixed(3) || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Missing:</dt>
                      <dd className="font-mono">{stats.basic_stats.missing_count} ({stats.basic_stats.missing_percentage.toFixed(1)}%)</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Outliers</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Count:</dt>
                      <dd className="font-mono">{stats.outlier_stats.count || 0}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Lower:</dt>
                      <dd className="font-mono">{stats.outlier_stats.lower_bound?.toFixed(3) || 'N/A'}</dd>
                    </div>
                    <div className="grid grid-cols-2">
                      <dt className="text-gray-600">Upper:</dt>
                      <dd className="font-mono">{stats.outlier_stats.upper_bound?.toFixed(3) || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
              {/* {debugMode && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-semibold mb-2">Debug Information</h4>
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-white border rounded">
                    {JSON.stringify({column, stats}, null, 2)}
                  </pre>
                </div>
              )} */}
            </CardContent>
          </Card>
        );
      } catch (error) {
        console.error(`Error rendering distribution for ${column}:`, error);
        setChartErrors(prev => ({...prev, [`dist_${column}`]: error as Error}));
        
        return (
          <Card key={column} className="mb-6">
            <CardHeader>
              <CardTitle>{column} Distribution Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error rendering distribution charts: {(error as Error).message}
                </AlertDescription>
              </Alert>
              
              {/* {debugMode && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-semibold mb-2">Error Details</h4>
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-white border rounded">
                    {JSON.stringify({error: (error as Error).message, stack: (error as Error).stack}, null, 2)}
                  </pre>
                </div>
              )} */}
            </CardContent>
          </Card>
        );
      }
    }).filter(Boolean);
  };

  // Render advanced analysis with error handling
  const renderAdvancedAnalysis = () => {
    if (!datasetStats) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading advanced statistics...</p>
        </div>
      );
    }

    // Check if we have enough data
    if (!datasetStats.parallel_coords?.columns?.length || !datasetStats.violin_data?.columns?.length) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Not enough data available for advanced analysis. This may happen if there are insufficient numeric columns or data points.
          </AlertDescription>
        </Alert>
      );
    }

    try {
      // Prepare data for parallel coordinates plot using pre-computed stats
      const parallelData = [{
        type: 'parcoords',
        line: {
          color: 'blue'
        },
        dimensions: datasetStats.parallel_coords.columns.map(column => ({
          label: column,
          values: datasetStats.parallel_coords.data.map(row => row[datasetStats.parallel_coords.columns.indexOf(column)]),
          range: datasetStats.parallel_coords.ranges[column]
        }))
      }];

      // Prepare data for violin plot using pre-computed stats
      const violinData = datasetStats.violin_data.columns.map(column => ({
        type: 'violin',
        y: datasetStats.violin_data.data[column],
        name: column,
        box: {
          visible: true
        },
        meanline: {
          visible: true
        }
      }));

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parallel Coordinates Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <PlotWithDebug
                isLoading={false}
                plotData={parallelData}
                error={chartErrors['parallel_coords'] || null}
                layout={{
                  height: 400,
                  margin: { t: 30, r: 20, l: 40, b: 30 },
                  showlegend: false
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Violin Plots</CardTitle>
            </CardHeader>
            <CardContent>
              <PlotWithDebug
                isLoading={false}
                plotData={violinData}
                error={chartErrors['violin_plot'] || null}
                layout={{
                  height: 500,
                  margin: { t: 30, r: 20, l: 60, b: 50 },
                  showlegend: true
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistical Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {datasetStats.violin_data.columns.map(column => {
                  const colStats = columnStats[column];
                  
                  if (!colStats || colStats.data_type !== 'numeric') return null;
                  
                  return (
                    <div key={column} className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-3">{column}</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="space-y-1">
                          <p><span className="text-gray-600">Type:</span> {colStats.data_type}</p>
                          <p><span className="text-gray-600">Count:</span> {colStats.basic_stats.missing_count}</p>
                          <p><span className="text-gray-600">Missing:</span> {colStats.basic_stats.missing_count}</p>
                          <p><span className="text-gray-600">Unique:</span> {colStats.basic_stats.unique_count || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p><span className="text-gray-600">Distribution:</span> {
                            Math.abs(colStats.shape_stats.skewness || 0) < 0.5 ? 'Symmetric' :
                              (colStats.shape_stats.skewness || 0) > 0 ? 'Right-skewed' : 'Left-skewed'
                          }</p>
                          <p><span className="text-gray-600">Peaked:</span> {
                            Math.abs(colStats.shape_stats.kurtosis || 0) < 0.5 ? 'Normal' :
                              (colStats.shape_stats.kurtosis || 0) > 0 ? 'Yes' : 'No'
                          }</p>
                          <p><span className="text-gray-600">Outliers:</span> {
                            (colStats.outlier_stats.count || 0) === 0 ? 'None' :
                              (colStats.outlier_stats.count || 0) <= 5 ? 'Few' : 'Many'
                          }</p>
                        </div>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
              
              {/* {debugMode && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 className="text-sm font-semibold mb-2">Debug Information</h4>
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-white border rounded">
                    {JSON.stringify({
                      parallel_coords: datasetStats.parallel_coords,
                      violin_data: datasetStats.violin_data
                    }, null, 2)}
                  </pre>
                </div>
              )} */}
            </CardContent>
          </Card>
        </div>
      );
    } catch (error) {
      console.error("Error rendering advanced analysis:", error);
      
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error rendering advanced analysis: {(error as Error).message}
            {debugMode && (
              <div className="mt-2 p-2 bg-white rounded border overflow-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {(error as Error).stack}
                </pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }
  };

  // Render correlation analysis with error handling
  const renderCorrelationAnalysis = () => {
    if (!datasetStats) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading correlation statistics...</p>
        </div>
      );
    }

    // Check if we have enough data for heatmap
    if (!datasetStats.heatmap_data?.z?.length || !datasetStats.heatmap_data?.x?.length) {
      return (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Not enough data available for correlation analysis. This analysis requires at least two numeric columns.
          </AlertDescription>
        </Alert>
      );
    }

    try {
      const heatmapData = datasetStats.heatmap_data;

      // Prepare heatmap data
      const heatmapTrace = [{
        z: heatmapData.z,
        x: heatmapData.x,
        y: heatmapData.y,
        type: 'heatmap',
        colorscale: 'RdBu',
        zmin: -1,
        zmax: 1,
        text: heatmapData.z.flatMap((row, i) =>
          row.map((val, j) => `r = ${val.toFixed(3)}<br>p = ${heatmapData.p_values[heatmapData.x[i]][heatmapData.y[j]].toFixed(3)}`)
        ),
        hoverongaps: false
      }];

      // Check if we have scatter matrix data
      const hasScatterData = datasetStats.scatter_matrix?.columns?.length > 0 && 
                            datasetStats.scatter_matrix?.data?.length > 0;

      // Prepare scatter data
      const scatterData = hasScatterData ? 
        datasetStats.scatter_matrix.columns.map((column, index) => ({
          x: datasetStats.scatter_matrix.data.map(row => row[column]),
          y: datasetStats.scatter_matrix.data.map(row => 
            row[datasetStats.scatter_matrix.columns[(index + 1) % datasetStats.scatter_matrix.columns.length]]
          ),
          type: 'scatter',
          mode: 'markers',
          name: column,
        })) : [];

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Correlation Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <PlotWithDebug
                isLoading={false}
                plotData={heatmapTrace}
                error={chartErrors['heatmap'] || null}
                layout={{
                  height: 600,
                  margin: { t: 30, r: 20, l: 100, b: 100 },
                  annotations: heatmapData.z.map((row, i) =>
                    row.map((val, j) => ({
                      x: j,
                      y: i,
                      text: val.toFixed(2),
                      font: { color: Math.abs(val) > 0.5 ? 'white' : 'black' },
                      showarrow: false
                    }))
                  ).flat()
                }}
                config={{ responsive: true }}
                style={{ width: '100%' }}
              />
            </CardContent>
          </Card>

          {hasScatterData && (
            <Card>
              <CardHeader>
                <CardTitle>Scatter Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <PlotWithDebug
                  isLoading={false}
                  plotData={scatterData}
                  error={chartErrors['scatter_matrix'] || null}
                  layout={{
                    height: 600,
                    dragmode: 'select',
                    margin: { t: 30, r: 20, l: 60, b: 60 },
                  }}
                  config={{ responsive: true }}
                  style={{ width: '100%' }}
                />
              </CardContent>
            </Card>
          )}
          
          {debugMode && (
            <Card>
              <CardHeader>
                <CardTitle>Correlation Data Debug</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto max-h-80 p-3 bg-gray-50 rounded border">
                  {JSON.stringify({
                    heatmap_data: datasetStats.heatmap_data,
                    scatter_matrix: datasetStats.scatter_matrix
                  }, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      );
    } catch (error) {
      console.error("Error rendering correlation analysis:", error);
      
      return (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error rendering correlation analysis: {(error as Error).message}
            {/* {debugMode && (
              <div className="mt-2 p-2 bg-white rounded border overflow-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {(error as Error).stack}
                </pre>
              </div>
            )} */}
          </AlertDescription>
        </Alert>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Data Analysis Dashboard</span>
            {/* <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setDebugMode(!debugMode)}
              className="ml-auto h-8 px-2"
            >
              <Bug className="h-4 w-4 mr-1" /> */}
              {/* {debugMode ? "Hide Debug" : "Debug Mode"} */}
            {/* </Button> */}
          </DialogTitle>
          <DialogDescription>
            Comprehensive statistical analysis and visualization
          </DialogDescription>
        </DialogHeader>

        {/* Table/Sheet Selector for multi-sheet files */}
        {tables.length > 0 && (
          <div className="mb-4">
            <Select value={selectedTableId} onValueChange={handleTableChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select table/sheet" />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Render progress indicator for statistics calculation */}
        {renderProgress()}

        {/* Debug panel when debug mode is on */}
        {debugMode && (
          <div className="mb-4 p-4 border border-amber-200 bg-amber-50 rounded-md">
            <h3 className="text-sm font-medium mb-2 flex items-center">
              <Bug className="h-4 w-4 mr-1" />
              Debug Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p><span className="font-semibold">File ID:</span> {fileId}</p>
                <p><span className="font-semibold">Table ID:</span> {selectedTableId || 'None'}</p>
                <p><span className="font-semibold">File Type:</span> {fileType}</p>
                <p><span className="font-semibold">Columns:</span> {columns.length}</p>
              </div>
              <div>
                <p><span className="font-semibold">Stats Task:</span> {taskId || 'None'}</p>
                <p><span className="font-semibold">Task Status:</span> {taskStatus || 'None'}</p>
                <p><span className="font-semibold">Stats Ready:</span> {statsReady ? 'Yes' : 'No'}</p>
                <p>
                  <span className="font-semibold">Column Stats:</span> {Object.keys(columnStats).length} columns,&nbsp;
                  <span className="font-semibold">Dataset Stats:</span> {datasetStats ? 'Available' : 'None'}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p className="font-semibold text-xs">Error Count: {Object.keys(chartErrors).length}</p>
              {Object.keys(chartErrors).length > 0 && (
                <div className="mt-1 p-2 bg-white rounded border max-h-20 overflow-auto">
                  <pre className="text-xs">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(chartErrors).map(([k, v]) => [k, v?.message])
                      ),
                      null, 2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && !taskId ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
          </div>
        ) : (
          <Tabs defaultValue="distribution" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="distribution">Distribution Analysis</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Analysis</TabsTrigger>
              <TabsTrigger value="correlation">Correlation Analysis</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(80vh-12rem)] mt-4 rounded-md border p-4">
              <TabsContent value="distribution" className="space-y-4">
                {renderDistributionAnalysis()}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {renderAdvancedAnalysis()}
              </TabsContent>

              <TabsContent value="correlation" className="space-y-4">
                {renderCorrelationAnalysis()}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full text-xs text-gray-500">
            <div>
              {statsReady ? 
                <Badge variant="outline" className="bg-green-50">Statistics Ready</Badge> : 
                <Badge variant="outline" className="bg-yellow-50">Calculating...</Badge>
              }
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisModal;