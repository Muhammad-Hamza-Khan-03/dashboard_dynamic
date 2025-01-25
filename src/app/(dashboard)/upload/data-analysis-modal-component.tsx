import React, { useState, useEffect, useMemo } from 'react';
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
import Plot from 'react-plotly.js';
import axios from 'axios';

// Type definitions for better type safety
interface AnalysisModalProps {
  fileId: string;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
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

type DataStats = {
  [key: string]: ColumnStats;
};

const AnalysisModal = ({ fileId, userId, isOpen, onClose }: AnalysisModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileType, setFileType] = useState<string>('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');

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
  const calculateStats = useMemo(() => {
    if (!data.length || !columns.length) return null;

    const stats: { [key: string]: ColumnStats } = {};

    columns.forEach(column => {
      // Get all values and determine data type
      const columnValues = data.map(row => row[column]);
      const dataType = determineDataType(columnValues);

      // Initialize stats object for the column
      stats[column] = {
        mean: 0,
        median: 0,
        mode: 0,
        std: 0,
        variance: 0,
        skewness: 0,
        kurtosis: 0,
        quartiles: [0, 0],
        iqr: 0,
        min: 0,
        max: 0,
        outliers: [],
        values: [],
        missing: columnValues.filter(v => v === null || v === undefined || v === '').length,
        total: columnValues.length,
        dataType
      };

      // For numeric columns, calculate detailed statistics
      if (dataType === 'number') {
        const numericValues = columnValues
          .map(toNumber)
          .filter((v): v is number => v !== null);

        if (numericValues.length > 0) {
          const sorted = [...numericValues].sort((a, b) => a - b);
          const n = numericValues.length;
          const mean = numericValues.reduce((a, b) => a + b, 0) / n;

          // Calculate variance and higher moments
          const variance = numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
          const std = Math.sqrt(variance);
          const skewness = numericValues.reduce((a, b) =>
            a + Math.pow((b - mean) / std, 3), 0) / n;
          const kurtosis = numericValues.reduce((a, b) =>
            a + Math.pow((b - mean) / std, 4), 0) / n - 3;

          // Calculate quartiles
          const q1 = sorted[Math.floor(n * 0.25)];
          const q3 = sorted[Math.floor(n * 0.75)];
          const iqr = q3 - q1;

          // Identify outliers
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;
          const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);

          // Find mode
          const frequency: { [key: number]: number } = {};
          numericValues.forEach(v => { frequency[v] = (frequency[v] || 0) + 1; });
          const mode = Number(Object.entries(frequency)
            .sort(([, a], [, b]) => b - a)[0][0]);

          // Update stats object
          stats[column] = {
            ...stats[column],
            mean,
            median: sorted[Math.floor(n / 2)],
            mode,
            std,
            variance,
            skewness,
            kurtosis,
            quartiles: [q1, q3],
            iqr,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            outliers,
            values: numericValues
          };
        }
      }
    });

    return stats;
  }, [data, columns]);

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
    if (!calculateStats) return null;

    return Object.entries(calculateStats).map(([column, stats]) => {
      if (stats.dataType !== 'number') return null;

      // Box plot trace
      const boxTrace: Partial<Plotly.BoxPlotData> = {
        y: stats.values,
        type: 'box',
        name: 'Box Plot',
        boxpoints: 'outliers',
        marker: { color: 'rgb(107, 107, 255)' }
      };

      // Histogram trace
      const histTrace = {
        x: stats.values,
        type: 'histogram',
        name: 'Distribution',
        opacity: 0.75
      };

      // QQ plot trace
      const sortedValues = [...stats.values].sort((a, b) => a - b);
      const n = sortedValues.length;
      const qqTrace = {
        x: sortedValues,
        y: Array.from({ length: n }, (_, i) =>
          stats.mean + stats.std * Math.sqrt(2) *
          Math.log((i + 0.5) / (n + 0.5))),
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
                    <dd className="font-mono">{stats.mean.toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Median:</dt>
                    <dd className="font-mono">{stats.median.toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Mode:</dt>
                    <dd className="font-mono">{stats.mode.toFixed(3)}</dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Spread</h4>
                <dl className="space-y-1 text-sm">
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Std Dev:</dt>
                    <dd className="font-mono">{stats.std.toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">IQR:</dt>
                    <dd className="font-mono">{stats.iqr.toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Range:</dt>
                    <dd className="font-mono">{(stats.max - stats.min).toFixed(3)}</dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Shape</h4>
                <dl className="space-y-1 text-sm">
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Skewness:</dt>
                    <dd className="font-mono">{stats.skewness.toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Kurtosis:</dt>
                    <dd className="font-mono">{stats.kurtosis.toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Missing:</dt>
                    <dd className="font-mono">{stats.missing} ({((stats.missing / stats.total) * 100).toFixed(1)}%)</dd>
                  </div>
                </dl>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Outliers</h4>
                <dl className="space-y-1 text-sm">
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Count:</dt>
                    <dd className="font-mono">{stats.outliers.length}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Lower:</dt>
                    <dd className="font-mono">{(stats.quartiles[0] - 1.5 * stats.iqr).toFixed(3)}</dd>
                  </div>
                  <div className="grid grid-cols-2">
                    <dt className="text-gray-600">Upper:</dt>
                    <dd className="font-mono">{(stats.quartiles[1] + 1.5 * stats.iqr).toFixed(3)}</dd>
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
    if (!calculateStats) return null;

    const numericColumns = Object.entries(calculateStats)
      .filter(([_, stats]) => stats.dataType === 'number');

    // Prepare data for parallel coordinates plot
    const parallelData = {
      type: 'parcoords' as const,
      line: {
        color: 'blue'
      },
      dimensions: numericColumns.map(([column, stats]) => ({
        label: column,
        values: stats.values,
        range: [stats.min, stats.max]
      }))
    };

    const violinData = numericColumns.map(([column, stats]) => ({
      type: 'violin' as const,
      y: stats.values,
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
              {numericColumns.map(([column, stats]) => (
                <div key={column} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">{column}</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="space-y-1">
                      <p><span className="text-gray-600">Type:</span> {stats.dataType}</p>
                      <p><span className="text-gray-600">Count:</span> {stats.total - stats.missing}</p>
                      <p><span className="text-gray-600">Missing:</span> {stats.missing}</p>
                      <p><span className="text-gray-600">Unique:</span> {new Set(stats.values).size}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="text-gray-600">Distribution:</span> {
                        Math.abs(stats.skewness) < 0.5 ? 'Symmetric' :
                          stats.skewness > 0 ? 'Right-skewed' : 'Left-skewed'
                      }</p>
                      <p><span className="text-gray-600">Peaked:</span> {
                        Math.abs(stats.kurtosis) < 0.5 ? 'Normal' :
                          stats.kurtosis > 0 ? 'Yes' : 'No'
                      }</p>
                      <p><span className="text-gray-600">Outliers:</span> {
                        stats.outliers.length === 0 ? 'None' :
                          stats.outliers.length <= 5 ? 'Few' : 'Many'
                      }</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render correlation analysis
  const renderCorrelationAnalysis = () => {
    if (!calculateStats) return null;

    const numericColumns = Object.entries(calculateStats)
      .filter(([_, stats]) => stats.dataType === 'number')
      .map(([column]) => column);

    // Calculate correlation matrix
    const correlationMatrix: number[][] = [];
    const significanceMatrix: number[][] = [];

    numericColumns.forEach((col1, i) => {
      correlationMatrix[i] = [];
      significanceMatrix[i] = [];
      const values1 = calculateStats[col1].values;

      numericColumns.forEach((col2, j) => {
        const values2 = calculateStats[col2].values;

        // Calculate Pearson correlation
        const mean1 = calculateStats[col1].mean;
        const mean2 = calculateStats[col2].mean;
        const std1 = calculateStats[col1].std;
        const std2 = calculateStats[col2].std;

        const correlation = values1.reduce((sum, x, idx) =>
          sum + ((x - mean1) / std1) * ((values2[idx] - mean2) / std2), 0) / (values1.length - 1);

        correlationMatrix[i][j] = correlation;

        // Calculate significance (t-test)
        const t = correlation * Math.sqrt((values1.length - 2) / (1 - correlation * correlation));
        const pValue = 2 * (1 - Math.abs(t) / Math.sqrt(values1.length));
        significanceMatrix[i][j] = pValue;
      });
    });

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Correlation Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <Plot
              data={[{
                z: correlationMatrix,
                x: numericColumns,
                y: numericColumns,
                type: 'heatmap',
                colorscale: 'RdBu',
                zmin: -1,
                zmax: 1,
                text: correlationMatrix.flatMap((row, i) =>
                  row.map((val, j) => `r = ${val.toFixed(3)}<br>p = ${significanceMatrix[i][j].toFixed(3)}`)
                ),
                hoverongaps: false
              }]}
              layout={{
                height: 600,
                margin: { t: 30, r: 20, l: 100, b: 100 },
                annotations: correlationMatrix.map((row, i) =>
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
              data={numericColumns.map((column, index) => ({
                x: calculateStats[column].values,
                y: calculateStats[numericColumns[(index + 1) % numericColumns.length]].values,
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