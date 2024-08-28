"use client";

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { useModalSheet } from '@/features/board/Chart-Modal/useChartModal-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, File, BarChart, Loader } from 'lucide-react';
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ChartModal = dynamic(() => import('@/features/board/Chart-Modal/Chart-Modal'), { 
  loading: () => <p>Loading Chart Creator...</p>,
  ssr: false 
});
const SavedChartModal = dynamic(() => import('@/features/board/Chart-Modal/SavedChartModal'), { 
  loading: () => <p>Loading Saved Chart...</p>,
  ssr: false 
});
// Define types for props and state variables
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

// interface DashboardChart extends ChartData {
//   id: string;
//   position: { x: number; y: number };
// }

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
    const { showModal, chartType, openModal, closeModal, setChartType } = useModalSheet();

    
    const fetchFiles = useCallback(async () => {
        console.log("Fetching files for user:", userId);
        setLoadingMessage('Fetching file list...');
        setFetchError(null);
        try {
            const response = await axios.get(`http://localhost:5000/list_files/${userId}`);
            console.log("Raw response from server:", response.data);
            
            if (response.data && response.data.files && Array.isArray(response.data.files)) {
                setUploadedFiles(response.data.files);
                console.log("Uploaded files state updated:", response.data.files);
            } else {
                console.error("Unexpected response format:", response.data);
                setFetchError('Unexpected response format from server');
            }
        } catch (err) {
            console.error('Error fetching files:', err);
            setFetchError('Failed to fetch file list. Please try again.');
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    }, [userId]);

    useEffect(() => {
        console.log("Component mounted, fetching files");
        fetchFiles();
    }, [fetchFiles]);

     const fetchData = useCallback(async (filename: string) => {
        setLoading(true);
        setError(null);
        setLoadingMessage(`Loading data from ${filename}...`);
        try {
            const response = await axios.get(`http://localhost:5000/get_file/${userId}/${filename}`);
            const csvData = response.data;
            if (typeof csvData !== 'string' || csvData.trim() === '') {
                throw new Error('Received empty or invalid data');
            }
            const rows = csvData.trim().split('\n');
            if (rows.length < 2) {
                throw new Error('File contains insufficient data');
            }
            const headers = rows[0].split(',');
            const parsedData = rows.slice(1).map((row: string) => {
                const values = row.split(',');
                return headers.reduce((acc: { [x: string]: any; }, header: string, index: string | number |any) => {
                    acc[header.trim()] = values[index]?.trim() || '';
                    return acc;
                }, {} as Record<string, string>);
            });
            setData(parsedData);
            setColumns(headers.map((header: string) => ({ header, accessor: header })));
            setSelectedFile(filename);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(`Failed to load data: ${err.message}`);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    }, [userId]);

    const filteredData = useMemo(() => {
        const lowercasedFilter = filter.toLowerCase();
        return data.filter(row =>
            Object.values(row).some(value =>
                String(value).toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [data, filter]);

    const sortedData = useMemo(() => {
        if (!sortConfig.column) return filteredData;
        return [...filteredData].sort((a, b) => {
            if (a[sortConfig.column] < b[sortConfig.column]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.column] > b[sortConfig.column]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [filteredData, sortConfig]);

    const handleSort = useCallback((column: string) => {
        setSortConfig(prevConfig => ({
            column,
            direction: prevConfig.column === column && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);

    const addCalculatedColumn = useCallback(() => {
        if (calculatedColumn.name && calculatedColumn.formula) {
            const newHeader = calculatedColumn.name;
            const formula = new Function('row', `return ${calculatedColumn.formula}`);
            setData(prevData => prevData.map(row => ({
                ...row,
                [newHeader]: formula(row)
            })));
            setColumns(prevColumns => [...prevColumns, { header: newHeader, accessor: newHeader }]);
            setCalculatedColumn({ name: '', formula: '' });
        }
    }, [calculatedColumn]);

    const calculateStats = useCallback((column: string) => {
        const values = data.map(row => Number(row[column])).filter(val => !isNaN(val));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { sum, avg, min, max };
    }, [data]);

    const handleExport = useCallback((chartData: Omit<ChartData, 'data'>) => {
    const completeChartData: ChartData = {
        ...chartData,
        data: sortedData
    };
    setSavedCharts(prevCharts => [...prevCharts, completeChartData]);
}, [sortedData]);

    const FileSelectionDialog: React.FC = () => {
        console.log("Rendering FileSelectionDialog, uploadedFiles:", uploadedFiles);
        return (
            <Dialog>
                <DialogTrigger asChild>
                    <Button className="mb-4" disabled={loading}>Select File</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Select a File</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {uploadedFiles.length === 0 ? (
                            <p>No files available. Please upload some files first.</p>
                        ) : (
                            uploadedFiles.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => {
                                        console.log("File selected:", file);
                                        fetchData(file);
                                        closeModal();
                                    }}
                                >
                                    <File size={20} />
                                    <span>{file}</span>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        );
    };

    const ChartSelectionDialog: React.FC = () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="mb-4 ml-4">Select Chart</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Select a Saved Chart</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {savedCharts.map((chart, index) => (
                        <div
                            key={index}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                                setShowSavedChart(chart);
                                closeModal();
                            }}
                        >
                            <BarChart size={20} />
                            <span>{chart.type} Chart - {chart.columns.join(', ')}</span>
                        </div>
                    ))}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );

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
                <Button className="mt-4" onClick={() => fetchFiles()}>Retry</Button>
            </div>
        );
    }
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Data Analysis Workspace</h1>
            <div className="flex space-x-4 mb-4">
                <FileSelectionDialog />
                <ChartSelectionDialog />
            </div>
            {selectedFile && (
                <>
                         {/* <div className="text-center py-10">
                    <p className="text-xl mb-4">No file selected</p>
                    <p>Please select a file to begin analysis</p>
                    <p className="mt-4">Available files: {uploadedFiles.join(", ")}</p>
                </div> */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Input
                            placeholder="Filter data"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <div>
                            <Input
                                placeholder="Column Name"
                                value={calculatedColumn.name}
                                onChange={(e) =>
                                    setCalculatedColumn((prev) => ({ ...prev, name: e.target.value }))
                                }
                            />
                            <Input
                                placeholder="Formula (e.g., row.B + row.C)"
                                value={calculatedColumn.formula}
                                onChange={(e) =>
                                    setCalculatedColumn((prev) => ({ ...prev, formula: e.target.value }))
                                }
                            />
                            <Button onClick={addCalculatedColumn}>Add Calculated Column</Button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="show-stats"
                                checked={showStats}
                                onCheckedChange={setShowStats}
                            />
                            <Label htmlFor="show-stats">Show Statistics</Label>
                        </div>
                    </div>
                    <div className="mb-4">
                        <Suspense fallback={<div>Loading Chart Creator...</div>}>
                            <ChartModal
                                data={sortedData}
                                columns={columns}
                                selectedColumns={selectedColumns}
                                setSelectedColumns={setSelectedColumns}
                                onExport={handleExport}
                            />
                        </Suspense>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead>
                                <tr>
                                    {columns.map((column) => (
                                        <th
                                            key={column.header}
                                            className="px-4 py-2 text-left bg-gray-100 cursor-pointer"
                                            onClick={() => handleSort(column.accessor)}
                                        >
                                            {column.header}
                                            {sortConfig.column === column.accessor &&
                                                (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {columns.map((column) => (
                                            <td key={column.accessor} className="border px-4 py-2">
                                                {row[column.accessor]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {showStats && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                            {columns.slice(1).map((column) => {
                                const stats = calculateStats(column.accessor);
                                return (
                                    <Card key={column.accessor}>
                                        <CardHeader>{column.header} Stats</CardHeader>
                                        <CardContent>
                                            <p>Sum: {stats.sum.toFixed(2)}</p>
                                            <p>Avg: {stats.avg.toFixed(2)}</p>
                                            <p>Min: {stats.min.toFixed(2)}</p>
                                            <p>Max: {stats.max.toFixed(2)}</p>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
            {showSavedChart && (
                <Suspense fallback={<div>Loading Saved Chart...</div>}>
                    <SavedChartModal
                        chart={showSavedChart}
                        onClose={() => setShowSavedChart(null)}
                    />
                </Suspense>
            )}
        </div>
    );
};
    export default DataAnalysisWorkspace;
