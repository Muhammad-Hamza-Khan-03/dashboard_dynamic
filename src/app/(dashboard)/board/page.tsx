"use client"
import React, { useCallback, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Loader, AlertCircle } from 'lucide-react';
import useFilesList from '@/features/sqlite/api/file-list';
import DashboardComponent from './Dashboard-component';
import ChartModal from '@/features/board/Chart-Modal/Chart-Modal';
import S_ChartModal from '@/features/board/Sidebar/S-ChartModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { handleUseCSV } from '@/features/sqlite/api/file-content';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileData {
  [key: string]: unknown;
}


interface Column {
  header: string;
  accessorKey: string;
  isNumeric: boolean;
}

interface ChartData {
  type: string;
  columns: string[];
  fileId: string;
  data: any[];
}

interface ChartResult {
  id: string;
  title: string;
  type: string;
  graphUrl: string;
}

interface DashboardChart {
  id: string;
  type: string;
  title: string;
  graphUrl: string;
}
const Board_Main = () => {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id;
  const { fileList, error: fileListError, loading: filesLoading } = useFilesList(userId);
  
  // State for file and data management
  const [selectedFile, setSelectedFile] = useState<{ id: string; data: FileData[] } | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // State for dashboard charts
  const [dashboardCharts, setDashboardCharts] = useState<DashboardChart[]>([]);

  const handleFileSelection = useCallback(async (fileId: string) => {
    if (!userId) return;
    
    setDataLoading(true);
    setDataError(null);
    setSelectedColumns([]);

    try {
        await handleUseCSV(
            fileId,
            userId,
            setDataLoading,
            setDataError,
            (data: FileData[]) => {
                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    setColumns(headers.map(header => ({
                        header,
                        accessorKey: header,
                        isNumeric: typeof data[0][header] === 'number'
                    })));
                    setSelectedFile({ id: fileId, data });
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

const handleExport = useCallback(async (chartData: ChartData): Promise<ChartResult> => {
  if (!userId) throw new Error('User not authenticated');

  try {
    const response = await fetch(`http://localhost:5000/generate-graph/${userId}/${chartData.fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chartType: chartData.type,
        selectedColumns: chartData.columns,
      }),
    });

    console.log('Response:', await response.clone().text()); // Debug response

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate graph');
    }

    const { graph_id, url } = await response.json();
    const newChart = {
      id: graph_id,
      title: `${chartData.type.charAt(0).toUpperCase() + chartData.type.slice(1)} Chart`,
      type: chartData.type,
      graphUrl: `http://localhost:5000${url}`,
    };
    console.log('Chart data:', newChart); // Debug chart data
  setDashboardCharts(prev => [...prev, newChart]);
    return newChart;
  } catch (error) {
    console.error('Export error details:', error);
    throw error;
  }
  
}, [userId]);

const handleRemoveChart = useCallback((chartId: string) => {
setDashboardCharts(prev => prev.filter(chart => chart.id !== chartId));
}, []);

if (!userLoaded || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className='flex flex-col bg-white rounded-lg mx-4 p-6 shadow-lg h-screen'>
      {fileListError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading files: {fileListError}
          </AlertDescription>
        </Alert>
      )}

      <div className='flex flex-1 min-h-0'>
        <div className='w-1/4 flex flex-col gap-y-6 pr-6 border-r border-gray-200'>
          {/* File Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Files</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {filesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader className="animate-spin w-6 h-6 text-blue-500" />
                </div>
              ) : fileList?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No files available</p>
              ) : (
                fileList?.map((file) => (
                  <button
                    key={file.file_id}
                    onClick={() => handleFileSelection(file.file_id)}
                    className={`w-full text-left p-2 rounded transition-colors
                      ${selectedFile?.id === file.file_id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  >
                    {file.filename}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Chart Controls */}
          {selectedFile && (
            <Card>
              <CardHeader>
                <CardTitle>Chart Controls</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <ChartModal
                  data={selectedFile.data}
                  columns={columns}
                  selectedColumns={selectedColumns}
                  setSelectedColumns={setSelectedColumns}
                  fileId={selectedFile.id}
                  onExport={handleExport}
                />
                <S_ChartModal
                  data={selectedFile.data}
                  columns={columns}
                  selectedColumns={selectedColumns}
                  setSelectedColumns={setSelectedColumns}
                  fileId={selectedFile.id}
                  onExport={handleExport}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Dashboard Area */}
        <div className='w-3/4 pl-6 overflow-hidden'>
          {dataLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="animate-spin w-8 h-8 text-blue-500" />
            </div>
          ) : dataError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Error loading data: {dataError}
              </AlertDescription>
            </Alert>
          ) : dashboardCharts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p className="text-xl font-semibold">No Charts Yet</p>
              <p className="mt-2">Create a chart using the controls on the left</p>
            </div>
          ) : (
            <DashboardComponent
              charts={dashboardCharts}
              onRemoveChart={handleRemoveChart}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Board_Main;