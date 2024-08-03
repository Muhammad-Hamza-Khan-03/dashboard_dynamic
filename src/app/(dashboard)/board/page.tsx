'use client'
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Loader, BarChart, BarChart2, BarChart3, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import ChartModal from '@/features/board/Chart-Modal/Chart-Modal';
import DragChartModal from '@/features/board/Dragboard/D-ChartModal';
import S_ChartModal from '@/features/board/Sidebar/S-ChartModal';
import useFilesList from '@/features/sqlite/api/file-list';
import { handleUseCSV } from '@/features/sqlite/api/file-content';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileData {
  [key: string]: unknown;
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

  const handleFileSelection = async (filename: string) => {
    setSelectedFilename(filename);
    await handleUseCSV(filename, userId!, setDataLoading, setDataError, (data) => {
      setFileData(data);
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setColumns(headers.map(header => ({ header, accessorKey: header, isNumeric: typeof data[0][header] === 'number' })));
      }
    });
  };

  if (!userLoaded || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  if (filesLoading) {
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
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-purple-600">
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium">Draggable Chart</span>
          </div>
          {/* <DragChartModal
            data={fileData}
            columns={columns}
            selectedColumns={selectedColumns}
            setSelectedColumns={setSelectedColumns}
          /> */}
        </div>
      </div>
      <div className='w-3/4 pl-6'>
        <h2 className='text-xl font-semibold mb-4 text-gray-800'>Select a File</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fileList?.map((filename) => (
            <Card
              key={filename}
              className="cursor-pointer transition-all duration-300 hover:shadow-md hover:bg-gray-50"
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
    </div>
  );
};

export default Board_Main;
