import React, { useState } from 'react';
import { NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from './theme-provider';

interface DataTableNodeData {
  id: string;
  columns: string[];
  data: any[];
  title?: string;
  rowsPerPage?: number;
  onRemove: (id: string) => void;
}

const DataTableNode: React.FC<NodeProps<DataTableNodeData>> = ({ data }) => {
  const { boardTheme:theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = data.rowsPerPage || 10;
  const totalPages = Math.ceil(data.data.length / rowsPerPage);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  const currentData = data.data.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  return (
    <Card className="w-[800px] shadow-lg" style={{ 
      backgroundColor: theme.nodeBackground,
      color: theme.text,
      borderColor: theme.border 
    }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{data.title || "Data Table"}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-opacity-10"
          onClick={() => data.onRemove(data.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="w-full">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: theme.border }}>
                  {data.columns.map((column, index) => (
                    <th
                      key={index}
                      className="p-2 text-left text-sm font-medium"
                      style={{ color: theme.secondary }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b hover:bg-opacity-5"
                    style={{ borderColor: theme.border }}
                  >
                    {data.columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className="p-2 text-sm"
                      >
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
        
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm" style={{ color: theme.secondary }}>
            Showing {currentPage * rowsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * rowsPerPage, data.data.length)} of{' '}
            {data.data.length} entries
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataTableNode;