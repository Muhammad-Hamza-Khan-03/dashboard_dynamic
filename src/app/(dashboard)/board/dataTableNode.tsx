import React, { useState, useCallback } from 'react';
import { NodeProps, XYPosition } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from './theme-provider';

interface DataTableNodeData {
  columns: string[];
  data: Record<string, any>[];
  title?: string;
  rowsPerPage?: number;
  onRemove: (id: string) => void;
  [key: string]: any; // Add index signature
}

// Define your full node type with the required properties:
interface DataTableNodeFull {
  id: string;
  position: XYPosition;
  data: DataTableNodeData;
  // add any additional properties if needed
}

const DataTableNode: React.FC<NodeProps<DataTableNodeFull>> = ({ id, data, selected}) => {
const { boardTheme: theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = data.rowsPerPage || 10;
  
  // Calculate total pages
  const totalPages = Math.ceil((data.data?.length || 0) / rowsPerPage);

  // Handle pagination
  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 0));
  }, []);

  // Handle remove button click
  const handleRemove = useCallback(() => {
    data.onRemove(id);
  }, [id, data]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    return (data.data || []).slice(
      currentPage * rowsPerPage,
      (currentPage + 1) * rowsPerPage
    );
  }, [data.data, currentPage, rowsPerPage]);

  // Format cell value for display
  const formatCellValue = useCallback((value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  }, []);

  // Get the current data to display
  const currentData = getCurrentPageData();

  return (
    <Card 
      className="shadow-lg"
      style={{ 
        backgroundColor: theme.nodeBackground,
        color: theme.text,
        borderColor: theme.border,
        width: '100%',
        height: '100%'
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b" style={{ borderColor: theme.border }}>
        <CardTitle className="text-lg font-semibold">
          {data.title || "Data Table"}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-opacity-20"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 h-[calc(100%-60px)] flex flex-col">
        <ScrollArea className="flex-1 w-full">
          <div className="w-full">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: theme.border }}>
                  {(data.columns || []).map((column, index) => (
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
                {currentData.length > 0 ? currentData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b hover:bg-opacity-5"
                    style={{ 
                      borderColor: theme.border,
                      backgroundColor: rowIndex % 2 ? 'rgba(0,0,0,0.02)' : 'transparent'
                    }}
                  >
                    {(data.columns || []).map((column, colIndex) => (
                      <td key={colIndex} className="p-2 text-sm">
                        {formatCellValue(row[column])}
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td 
                      colSpan={(data.columns?.length || 1)}
                      className="p-4 text-center text-sm italic"
                      style={{ color: theme.secondary }}
                    >
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
        
        {/* Pagination controls */}
        <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: theme.border }}>
          <span className="text-sm" style={{ color: theme.secondary }}>
            {data.data?.length ? (
              `Showing ${currentPage * rowsPerPage + 1} to ${Math.min((currentPage + 1) * rowsPerPage, data.data.length)} of ${data.data.length} entries`
            ) : 'No entries'}
          </span>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevPage}
              disabled={currentPage === 0 || totalPages === 0}
              style={{
                opacity: currentPage === 0 || totalPages === 0 ? 0.5 : 1,
                cursor: currentPage === 0 || totalPages === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1 || totalPages === 0}
              style={{
                opacity: currentPage === totalPages - 1 || totalPages === 0 ? 0.5 : 1,
                cursor: currentPage === totalPages - 1 || totalPages === 0 ? 'not-allowed' : 'pointer'
              }}
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