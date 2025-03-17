'use client'
import React, { useCallback,useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import axios from 'axios';
import { useInterval } from './use-interval';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import dynamic from 'next/dynamic'

const Plot = dynamic(
  () => import('react-plotly.js'),
  { ssr: false, loading: () => <div className="h-80 w-full flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div> }
);
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

interface ColumnStats {
  mean: number;
  median: number;
  mode: number;
  std: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  quartiles: [number, number];
  iqr: number;
  min: number;
  max: number;
  outliers: number[];
  values: number[];
  missing: number;
  total: number;
  dataType: string;
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

interface StatsStatus {
  column_stats_count: number;
  dataset_stats_exist: boolean;
  stats_complete: boolean;
}

// Modify the AnalysisModal component to use the pre-computed statistics
const AnalysisModal = ({ fileId, userId, isOpen, onClose ,fileChanged=false}: AnalysisModalProps) => {
  // Keep existing state variables
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileType, setFileType] = useState<string>('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  
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

// Function to check statistics status
const checkStatisticsStatus = async () => {
  if (!fileId || !userId) return;
  
  try {
    const response = await axios.get(`http://localhost:5000/get-stats-status/${userId}/${fileId}`);
    
    if (response.data.stats_complete) {
      // Statistics are ready, load them
      setStatsReady(true);
      setIsPolling(false);
      toast({
        title:"Statistics Ready",
        description:"Statistics are already calculated and ready to view",
      })
    } else {
      // Start calculation if not already in progress
      startStatisticsCalculation();
    }
  } catch (error) {
    console.error('Error checking statistics status:', error);
    setError('Failed to check statistics status');
  }
};

 // Function to start statistics calculation
 const startStatisticsCalculation = async () => {
  if (!fileId || !userId) return;
  
  try {
    const response = await axios.post(`http://localhost:5000/start-stats-calculation/${userId}/${fileId}`);
    
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
    setError('Failed to start statistics calculation');
  }
};


 // Polling function to check task status
 useInterval(
  async () => {
    if (!taskId) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/check-stats-task/${taskId}`);
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
        
        // Load statistics data
        fetchDatasetStatistics();
        if (columns.length > 0) {
          fetchColumnStatistics(columns);
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

  // Fetch file metadata and columns
  useEffect(() => {
    const fetchFileMetadata = async () => {
      if (!isOpen || !fileId || !userId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);

        if (response.data.type === 'structured') {
          setFileType(response.data.file_type);

          if (response.data.tables) {
            setTables(response.data.tables);
            if (response.data.tables.length > 0) {
              setSelectedTableId(response.data.tables[0].id);
              await fetchTableData(response.data.tables[0].id);
            }
          } else if (response.data.data) {
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
  }, [isOpen, fileId, userId, statsReady]);

  // Fetch dataset statistics
  const fetchDatasetStatistics = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/get-dataset-statistics/${userId}/${fileId}`);
      
      if (response.data.ready) {
        setDatasetStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching dataset statistics:', error);
    }
  };

  // Fetch column statistics
  const fetchColumnStatistics = async (columnList: string[]) => {
    try {
      const statsPromises = columnList.map(column => 
        axios.get(`http://localhost:5000/get-column-statistics/${userId}/${fileId}/${column}`)
      );
      
      const responses = await Promise.all(statsPromises);
      
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
  
  // Helper function to determine data type of a column
  const determineDataType = (values: any[]): string => {
    const cleanValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (cleanValues.length === 0) return 'empty';

    const types = cleanValues.map(v => {
      if (typeof v === 'number') return 'number';
      if (!isNaN(Date.parse(v))) return 'date';
      if (typeof v === 'boolean') return 'boolean';
      if (typeof v === 'string') {
        if (!isNaN(Number(v))) return 'number';
        if (/^(true|false)$/i.test(v)) return 'boolean';
        return 'string';
      }
      return 'unknown';
    });

    const primaryType = types.reduce((acc: { [key: string]: number }, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(primaryType)
      .sort(([, a], [, b]) => b - a)[0][0];
  };

  // Helper function to safely convert values to numbers
  const toNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  // Calculate comprehensive statistics

  // Fetch file data with proper error handling
  useEffect(() => {
    const fetchFileMetadata = async () => {
      if (!isOpen || !fileId || !userId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);

        if (response.data.type === 'structured') {
          setFileType(response.data.file_type);

          if (response.data.tables) {
            setTables(response.data.tables);
            if (response.data.tables.length > 0) {
              setSelectedTableId(response.data.tables[0].id);
              await fetchTableData(response.data.tables[0].id);
            }
          } else if (response.data.data) {
            setData(response.data.data);
            setColumns(response.data.columns || []);
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
  }, [isOpen, fileId, userId]);

  // Fetch table data
  const fetchTableData = async (tableId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/get-file/${userId}/${tableId}`);

      if (response.data.type === 'structured' && response.data.data) {
        setData(response.data.data);
        setColumns(response.data.columns || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch table data');
    } finally {
      setLoading(false);
    }
  };

  // Handle table selection
  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    fetchTableData(tableId);
  };

  // Render distribution analysis
  const renderDistributionAnalysis = () => {
    if (Object.keys(columnStats).length === 0) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading statistics...</p>
        </div>
      );
    }

    return Object.entries(columnStats).map(([column, stats]) => {
      if (stats.data_type !== 'numeric') return null;

      const distribution = stats.distribution;
      
      // Box plot trace using pre-computed stats
      const boxTrace: Partial<Plotly.BoxPlotData> = {
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
        marker: { color: 'rgb(107, 107, 255)' }
      };

      // Histogram trace using pre-computed stats
      const histTrace = {
        x: distribution.histogram?.bin_edges.slice(0, -1).map((edge, i) => 
          (edge + (distribution.histogram?.bin_edges?.[i + 1] ?? 0)) / 2
        ),
        y: distribution.histogram?.counts,
        type: 'bar' as const,
        name: 'Distribution',
        opacity: 0.75
      };

      // QQ plot trace using pre-computed stats
      const qqTrace = {
        x: distribution.qqplot?.x,
        y: distribution.qqplot?.y,
        mode: 'markers' as const,
        type: 'scatter' as const,
        name: 'Q-Q Plot'
      };

      return (
        <Card key={column} className="mb-6">
          <CardHeader>
            <CardTitle>{column} Distribution Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="w-full">
                <Plot
                  data={[boxTrace]}
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
                <Plot
                  data={[histTrace as Partial<Plotly.Data>]}
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
                <Plot
                  data={[qqTrace]}
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
          </CardContent>
        </Card>
      );
    });
  };

  // Render advanced analysis
  const renderAdvancedAnalysis = () => {
    if (!datasetStats) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading advanced statistics...</p>
        </div>
      );
    }

    // Prepare data for parallel coordinates plot using pre-computed stats
    const parallelData = {
      type: 'parcoords' as const,
      line: {
        color: 'blue'
      },
      dimensions: datasetStats.parallel_coords.columns.map(column => ({
        label: column,
        values: datasetStats.parallel_coords.data.map(row => row[datasetStats.parallel_coords.columns.indexOf(column)]),
        range: datasetStats.parallel_coords.ranges[column]
      }))
    };

    // Prepare data for violin plot using pre-computed stats
    const violinData = datasetStats.violin_data.columns.map(column => ({
      type: 'violin' as const,
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
            <Plot
              data={[parallelData]}
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
            <Plot
              data={violinData}
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
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render correlation analysis
  const renderCorrelationAnalysis = () => {
    if (!datasetStats) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <p>Loading correlation statistics...</p>
        </div>
      );
    }

    const heatmapData = datasetStats.heatmap_data;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Correlation Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <Plot
              data={[{
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
              }]}
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

        <Card>
          <CardHeader>
            <CardTitle>Scatter Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <Plot
              data={datasetStats.scatter_matrix.columns.map((column, index) => ({
                x: datasetStats.scatter_matrix.data.map(row => row[column]),
                y: datasetStats.scatter_matrix.data.map(row => 
                  row[datasetStats.scatter_matrix.columns[(index + 1) % datasetStats.scatter_matrix.columns.length]]
                ),
                type: 'scatter',
                mode: 'markers',
                name: column,
              }))}
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
      </div>
    );
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle>Data Analysis Dashboard</DialogTitle>
        <DialogDescription>
          Comprehensive statistical analysis and visualization
        </DialogDescription>
      </DialogHeader>

        {/* Table/Sheet Selector */}
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

{loading ? (
  <div className="flex justify-center items-center h-40">
    <Loader2 className="h-8 w-8 animate-spin" />
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
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisModal;