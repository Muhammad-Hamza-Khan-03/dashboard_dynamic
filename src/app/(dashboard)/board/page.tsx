"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Loader, BarChart, BarChart2, FileText, ChevronRight, AlertCircle, Trash2, Search } from 'lucide-react';
import ChartModal from '@/features/board/Chart-Modal/Chart-Modal';
import S_ChartModal from '@/features/board/Sidebar/S-ChartModal';
import useFilesList from '@/features/sqlite/api/file-list';
import { handleUseCSV } from '@/features/sqlite/api/file-content';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import SavedChartModal from '@/features/board/Chart-Modal/SavedChartModal';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import axios from 'axios';

interface FileData {
  [key: string]: unknown;
}

interface SavedChart {
  id: string;
  type: string;
  data: any[];
  columns: string[];
  filename: string;
}

const Board_Main = () => {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id;
  const { fileList, error, loading: filesLoading } = useFilesList(userId);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [fileData, setFileData] = useState<FileData[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [selectedSavedChart, setSelectedSavedChart] = useState<SavedChart | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const storedCharts = localStorage.getItem('savedCharts');
    if (storedCharts) {
      setSavedCharts(JSON.parse(storedCharts));
    }
  }, []);

  const handleExport = (chartData: any) => {
    const newChart: SavedChart = {
      id: Date.now().toString(),
      ...chartData,
      filename: selectedFilename || 'Unknown File',
    };
    const updatedCharts = [...savedCharts, newChart];
    setSavedCharts(updatedCharts);
    localStorage.setItem('savedCharts', JSON.stringify(updatedCharts));
    toast({
      title: "Chart Saved",
      description: "Your chart has been successfully saved.",
      duration: 3000,
    });
  };

  const handleDeleteChart = (chartId: string) => {
    const updatedCharts = savedCharts.filter(chart => chart.id !== chartId);
    setSavedCharts(updatedCharts);
    localStorage.setItem('savedCharts', JSON.stringify(updatedCharts));
    toast({
      title: "Chart Deleted",
      description: "The chart has been successfully removed.",
      duration: 3000,
    });
  };

  const handleSavedChartClick = (chart: SavedChart) => {
    setSelectedSavedChart(chart);
  };

  const fetchSheetNames = useCallback(async (filename: string) => {
    if (!userId) return;
    try {
      const response = await axios.get(`http://localhost:5000/get_sheet_count/${userId}/${filename}`);
      setSheetNames(response.data.sheet_names || []);
    } catch (error) {
      console.error("Error fetching sheet names:", error);
      setDataError("Failed to fetch sheet names");
    }
  }, [userId]);

  const fetchTableNames = useCallback(async (filename: string) => {
    if (!userId) return;
    try {
      const response = await axios.get(`http://localhost:5000/get_table_count/${userId}/${filename}`);
      setTableNames(response.data.table_names || []);
    } catch (error) {
      console.error("Error fetching table names:", error);
      setDataError("Failed to fetch table names");
    }
  }, [userId]);

  const handleFileSelection = useCallback(async (filename: string) => {
    setSelectedFilename(filename);
    setSelectedColumns([]);
    setSearchTerm('');

    if (filename.endsWith('.xlsx')) {
      await fetchSheetNames(filename);
      setIsSelectModalOpen(true);
    } else if (filename.endsWith('.db')) {
      await fetchTableNames(filename);
      setIsSelectModalOpen(true);
    } else {
      await handleUseCSV(filename, userId!, setDataLoading, setDataError, (data) => {
        setFileData(data);
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          setColumns(headers.map(header => ({ header, accessorKey: header, isNumeric: typeof data[0][header] === 'number' })));
        }
      });
    }
  }, [userId, fetchSheetNames, fetchTableNames]);

  const handleSheetOrTableSelection = useCallback(async (sheetOrTable: string) => {
    setIsSelectModalOpen(false);
    if (!selectedFilename || !userId) return;

    await handleUseCSV(selectedFilename, userId, setDataLoading, setDataError, (data) => {
      setFileData(data);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setColumns(headers.map(header => ({ header, accessorKey: header, isNumeric: typeof data[0][header] === 'number' })));
      }
    }, selectedFilename.endsWith('.xlsx') ? sheetOrTable : undefined, selectedFilename.endsWith('.db') ? sheetOrTable : undefined);
  }, [selectedFilename, userId]);

  useEffect(() => {
    if (userLoaded && userId && fileList && fileList.length > 0 && !selectedFilename) {
      handleFileSelection(fileList[0]);
    }
  }, [userLoaded, userId, fileList, selectedFilename, handleFileSelection]);

  const groupedCharts = savedCharts.reduce((acc, chart) => {
    const filename = chart.filename || 'Unknown File';
    if (!acc[filename]) {
      acc[filename] = [];
    }
    acc[filename].push(chart);
    return acc;
  }, {} as { [key: string]: SavedChart[] });

  const filteredSheetOrTableNames = (selectedFilename?.endsWith('.xlsx') ? sheetNames : tableNames)
    .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (!userLoaded || !userId || filesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className='flex bg-white rounded-lg mx-4 p-6 shadow-lg'>
      <div className='w-1/4 flex flex-col gap-y-6 pr-6 border-r border-gray-200'>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-blue-600">
            <BarChart className="w-5 h-5" />
            <span className="text-sm font-medium">Simple Chart</span>
          </div>
          <ChartModal
            data={fileData}
            columns={columns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
            onExport={handleExport}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-green-600">
            <BarChart2 className="w-5 h-5" />
            <span className="text-sm font-medium">Horizontal Sidebar Chart</span>
          </div>
          <S_ChartModal
            data={fileData}
            columns={columns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
          />
        </div>
      </div>
      <div className='w-3/4 pl-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-800'>Select a File</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fileList?.map((filename) => (
            <Card
              key={filename}
              className={`cursor-pointer transition-all duration-300 hover:shadow-md ${selectedFilename === filename ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              onClick={() => handleFileSelection(filename)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">{filename}</CardTitle>
                <FileText className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full mt-2 group">
                  Select
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className='text-xl font-semibold my-4 text-gray-800'>Saved Charts</h2>
        <ScrollArea className="h-[400px] pr-4">
          {Object.entries(groupedCharts).map(([filename, charts]) => (
            <div key={filename} className="mb-6">
              <h3 className="text-lg font-medium mb-2 text-gray-700">{filename}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {charts.map((chart) => (
                  <Card
                    key={chart.id}
                    className="transition-all duration-300 hover:shadow-md hover:bg-gray-50"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-700">{chart.type} Chart</CardTitle>
                      <BarChart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 group"
                        onClick={() => handleSavedChartClick(chart)}
                      >
                        View
                        <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full mt-2 group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChart(chart.id);
                        }}
                      >
                        Delete
                        <Trash2 className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
        {dataLoading && (
          <div className="flex items-center justify-center mt-4 text-gray-600">
            <Loader className="animate-spin w-6 h-6 mr-2" />
            <span>Loading data...</span>
          </div>
        )}
        {dataError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>Error: {dataError}</p>
          </div>
        )}
      </div>
      {selectedSavedChart && (
        <SavedChartModal
          chart={{
            type: selectedSavedChart.type,
            data: selectedSavedChart.data,
            columns: selectedSavedChart.columns,
          }}
          onClose={() => setSelectedSavedChart(null)}
        />
      )}
      <Dialog open={isSelectModalOpen} onOpenChange={setIsSelectModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedFilename?.endsWith('.xlsx') ? 'Select a Sheet' : 'Select a Table'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="col-span-3"
              />
            </div>
            <ScrollArea className="h-[300px] pr-4">
              {filteredSheetOrTableNames.map((name) => (
                <Button
                  key={name}
                  variant="ghost"
                  className="w-full justify-start mb-2"
                  onClick={() => handleSheetOrTableSelection(name)}
                >
                  {name}
                </Button>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Board_Main;