"use client"
import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";
import { useUser } from '@clerk/nextjs';
import { Loader2, PlusCircle, Edit, Save, Trash2, FileIcon, BarChart, RefreshCw, Upload, FilePlus } from "lucide-react";
import axios from 'axios';
import { FileData } from "@/features/sqlite/api/file-content";
import useFilesList from "@/features/sqlite/api/file-list";
import { FileJson, FileText } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUpload from "./fileupload";
import FileDelete from "@/features/sqlite/components/file-delete";


import DataAnalysisModal from "./data-analysis-modal-component";
import EnhancedEditForm from "./EditForm";
import RenameFileDialog from "./renameFileDialog";
import { FileEdit } from "lucide-react";
import StatisticsCalculatorStandalone from "./Calulator";
import ColumnManagementDialog from "./columnManagementDialog";
import LoadingScreen from "./LoadingScreen";


// Update the dynamic import with proper typing
const DataTable = dynamic<React.ComponentProps<typeof import('@/components/data-table').DataTable>>(() =>
  import('@/components/data-table').then((mod) => mod.DataTable), {
  loading: () => <div className="flex justify-center items-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
  </div>,
  ssr: false,
});

interface ColumnOrder {
  [key: string]: number;
}

interface TableData {
  columns: string[];
  data: Record<string, any>[];
  pagination: {
    total_rows: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}
interface TableInfo {
  id: string;
  name: string;
  full_name: string;
}

interface FileContent {
  type: 'structured' | 'unstructured';
  file_type: string;
  tables?: TableInfo[];
  columns?: string[];
  data?: any[];
  content?: string;
  editable?: boolean;
  pagination?: {
    total_rows: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}
interface TableInfo {
  id: string;
  name: string;
  full_name: string;
}

// Add these interfaces
interface Sheet {
  name: string;
  key: string;
}

type DataItem = FileData;
interface PaginationInfo {
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const fetchTableData = async (
  userId: string,
  fileId: string,
  tableName: string,
  page: number = 1,
  pageSize: number = 50
): Promise<TableData> => {
  const response = await axios.get(
    `/api/get_table_data/${userId}/${fileId}/${tableName}`,
    {
      params: { page, page_size: pageSize }
    }
  );
  return response.data;
};
const DataTablePage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef<DataItem, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ file_id: string, filename: string } | null>(null);
  const dataRef = useRef<DataItem[]>([]);
  const { user, } = useUser();
  const { fileList, error: fileListError, loading: fileListLoading, refetch: refetchFileList } = useFilesList(user?.id);
  const [filterkey, setFilterkey] = useState<string>(Date.now().toString());
 
  const [selectedRows, setSelectedRows] = useState<Row<DataItem>[]>([]);

  const [tableKey, setTableKey] = useState(0);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);
  const [unstructuredContent, setUnstructuredContent] = useState<string>('');
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [tablesList, setTablesList] = useState<TableInfo[]>([]);

  const [columnOrder, setColumnOrder] = useState<ColumnOrder>({});
  const [focusedField, setFocusedField] = useState<string>('');
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const [fileChanged, setFileChanged] = useState<boolean>(false);
  const [isRenameFileDialogOpen, setIsRenameFileDialogOpen] = useState(false);
  const [isColumnManagementOpen, setIsColumnManagementOpen] = useState(false);
const [activeColumn, setActiveColumn] = useState<string>('');

const [initialLoading, setInitialLoading] = useState(true);
const isInitialRender = useRef(true);


  const [activeRow, setActiveRow] = useState<{
    data: any;
    index: number;
    field: string;
    value: any;
  } | null>(null);

  const updateData = useCallback((newData: DataItem[]) => {
    setData(newData);
    dataRef.current = newData;
  },[]);

  useEffect(() => {
    // Set initial loading state
    if (isInitialRender.current) {
      isInitialRender.current = false;
      setInitialLoading(true);
      
      // Set a timeout to ensure loading screen shows for at least 1.5 seconds
      // This provides a smoother transition even if data loads quickly
      const minLoadingTime = setTimeout(() => {
        setInitialLoading(false);
      }, 1500);
      
      return () => clearTimeout(minLoadingTime);
    }
  }, []);

  useEffect(() => {
    // When fileList is loaded and we have user data, turn off initial loading state
    if (user && fileList && !fileListLoading) {
      setInitialLoading(false);
    }
  }, [user, fileList, fileListLoading]);

  useEffect(() => {
    if (loading) {
      // If we're loading data after initial render, show loading state
      setInitialLoading(true);
    } else if (data.length > 0 || unstructuredContent) {
      // Data has loaded, hide loading screen
      setInitialLoading(false);
    }
  }, [loading, data, unstructuredContent]);

  useEffect(() => {
    if ( user && fileList && fileList.length > 0 && !selectedFile) {
      setSelectedFile({ file_id: fileList[0].file_id, filename: fileList[0].filename });
    }
  }, [user, fileList, selectedFile]);

  // Clear analysis modal state when file changes
  useEffect(() => {
    setIsAnalysisModalOpen(false);
    setFileChanged(true);
  }, [selectedFile]);


  const handleOpenAnalysisModal = () => {
    setFileChanged(false);
    setIsAnalysisModalOpen(true);
  };

  //rename
  const handleCloseRenameDialog = useCallback(() => {
    setIsRenameFileDialogOpen(false);
  }, []);
  
  const handleCloseColumnManagement = useCallback(() => {
    // Important: Set state in this specific order
    setActiveColumn('');
    setIsColumnManagementOpen(false);
  }, []);

  const handleCloseAnalysisModal = useCallback(() => {
    setIsAnalysisModalOpen(false);
  }, []);
    
  const resetState = () => {
    setData([]);
    setColumns([]);
    setUnstructuredContent('');
    setIsEditing(false);
    setPaginationInfo(null);
    setSelectedTable(null);
  };

  
  const handleColumnsChange = useCallback((newColumns: ColumnDef<DataItem, any>[]) => {
    setColumns(newColumns);
  }, []);
  
  const handleFileRenamed = useCallback((newFilename: string) => {
    if (selectedFile) {
      setSelectedFile({
        ...selectedFile,
        filename: newFilename
      });
      
      // Refresh the file list to reflect the renamed file
      refetchFileList();
    }
  }, [selectedFile, refetchFileList]);

  // Update your generateColumns function to restore the row editing functionality
  const generateColumns = useRef((columns: string[]): ColumnDef<DataItem, any>[] =>{
  // Create column order if it doesn't exist
  if (Object.keys(columnOrder).length === 0) {
    const order: ColumnOrder = {};
    columns.forEach((col, index) => {
      order[col] = index;
    });
    setColumnOrder(order);
  }

  return columns.map(column => ({
    accessorKey: column,
    header: () => {
      return (
        <div className="flex items-center justify-between">
          <span>{column}</span>
          {/* Column management button moved here */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setActiveColumn(column);
              setIsColumnManagementOpen(true);
            }}
            className="opacity-70 hover:opacity-100"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const value = row.getValue(column);
      return (
        <div className="flex items-center justify-between">
          <span>{formatCellValue(value)}</span>
          {/* Restore the original row editing functionality */}
          <div className="flex space-x-1">
          {/* Row editing button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row.index, column, formatCellValue(value));
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          
      
        </div>
        </div>
      );
    }
  }));
  });
  



  // Modify the fetchFileData function
// Modify the fetchFileData function to handle sheet_name
const fetchFileData = useCallback(async (fileId: string, filename: string, page: number = 1, sheetName?: string) => {
  if (!user?.id) {
    setError("User ID not available");
    return;
  }

  setLoading(true);
  setInitialLoading(true); // Show loading screen while fetching data
  setError(null);

  try {
    // Create request URL with sheet name as query parameter if provided


    let url = `http://localhost:5000/get-file/${user.id}/${fileId}`;
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: '50'
    });
    
    // Wait 5 seconds before fetching data to allow loading screen to appear
    setTimeout(async () => {
     }, 500);
    
    if (sheetName) {
      params.append('sheet_name', sheetName);
    }
    
    // Append parameters to URL
    url = `${url}?${params.toString()}`;
    
    console.log("Fetching file data from:", url);
    const response = await axios.get<FileContent>(url);

    if (!response.data) {
      throw new Error('No data received from server');
    }

    const fileData = response.data;
    const isJsonFile = filename.toLowerCase().endsWith('.json');

    if (fileData.type === 'structured') {
      if (fileData.tables && fileData.tables.length > 0) {
        // This is a parent file with multiple tables/sheets
        setTablesList(fileData.tables);
        
        // If a specific sheet name was requested, find its ID
        let targetTableId = fileData.tables[0].id;
        if (sheetName) {
          const matchingTable = fileData.tables.find(
            table => table.name === sheetName || table.full_name.endsWith(`:${sheetName}`)
          );
          if (matchingTable) {
            targetTableId = matchingTable.id;
          }
        }
        
        setSelectedTable(targetTableId);
        
        // Fetch data for the selected table/sheet
        const tableResponse = await axios.get<FileContent>(
          `http://localhost:5000/get-file/${user.id}/${targetTableId}`,
          { params: { page: 1, page_size: 50 } }
        );
        
        if (tableResponse.data.data && tableResponse.data.columns) {
          updateData(tableResponse.data.data);
          setColumns(generateColumns.current(tableResponse.data.columns));
          setPaginationInfo(tableResponse.data.pagination || null);
        }
      } else if (fileData.data && fileData.columns) {
        // This is a regular structured file or a single table/sheet
        console.log("Received structured data with", fileData.data.length, "rows");
        updateData(fileData.data);
        
        // For JSON files, apply special styling to the columns if needed
        const cols = generateColumns.current(fileData.columns);
        setColumns(cols);
        
        setPaginationInfo(fileData.pagination || null);
      }
      setUnstructuredContent('');
      setIsEditing(false);
    }
    else if (fileData.type === 'unstructured') {
      // Unstructured file handling
      updateData([]);
      setColumns([]);
      setPaginationInfo(null);
      
      if (isJsonFile) {
        console.log("Received unstructured JSON content");
        // JSON formatting is now handled by the backend
        setUnstructuredContent(fileData.content || '');
        setIsEditing(fileData.editable || false);
        
        // Add JSON/XML validation warnings
        if ('is_valid_json' in fileData && !fileData.is_valid_json) {
          toast({
            title: "Warning",
            description: "The JSON content appears to be invalid or malformed.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } else {
        // Other unstructured file types
        setUnstructuredContent(fileData.content || '');
        setIsEditing(fileData.editable || false);
      }
    } else {
      // Fallback for unexpected file types
      updateData([]);
      setColumns([]);
      setPaginationInfo(null);
      setUnstructuredContent(fileData.content || '');
      setIsEditing(fileData.editable || false);
    }
  } catch (err) {
    console.error("Error in fetchFileData:", err);
    setError(err instanceof Error ? err.message : "Failed to process file data");
    resetState();
  } finally {
    setLoading(false);
  }
}, [user?.id, updateData, toast]);

  useEffect(() => {
    const loadTableData = async () => {
      if (!selectedFile?.file_id || !currentTable || !user?.id) return;

      setLoading(true);
      try {
        const tableData = await fetchTableData(
          user.id,
          selectedFile.file_id,
          currentTable,
          currentPage
        );

        setData(tableData.data);
        setPaginationInfo(tableData.pagination);
        if (tableData.columns) {
          const columns = tableData.columns.map((column: string) => ({ accessorKey: column, header: column }));
          setColumns(columns);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load table data');
      } finally {
        setLoading(false);
      }
    };

    if (currentTable) {
      loadTableData();
    }
  }, [selectedFile, currentTable, currentPage, user?.id]);

  // Add this function to your page.tsx component
const handleColumnChange = useCallback((
  action: string, 
  oldColumn?: string, 
  newColumn?: string
) => {
  if (!selectedFile) return;
  
  // Handle different column operations
  if (action === 'rename' && oldColumn && newColumn) {
    // Update columns array when a column is renamed
    const updatedColumns = columns.map(col => {
      // For accessor-based column definitions
      if (typeof col === 'object' && 'accessorKey' in col && col.accessorKey === oldColumn) {
        return {
          ...col,
          accessorKey: newColumn,
          header: () => newColumn
        };
      }
      return col;
    });
    
    // Update the local state
    handleColumnsChange(updatedColumns);
    
    // Refresh data to reflect changes
    fetchFileData(selectedFile.file_id, selectedFile.filename, currentPage);
    
    // Update the UI
    toast({
      title: "Success",
      description: `Column "${oldColumn}" renamed to "${newColumn}"`,
    });
  } 
  else if (action === 'delete' && oldColumn) {
    // Remove the deleted column from the columns array
    const updatedColumns = columns.filter(col => {
      if (typeof col === 'object' && 'accessorKey' in col) {
        return col.accessorKey !== oldColumn;
      }
      return true;
    });
    
    // Update the local state
    handleColumnsChange(updatedColumns);
    
    // Refresh data to reflect changes
    fetchFileData(selectedFile.file_id, selectedFile.filename, currentPage);
    
    // Update the UI
    toast({
      title: "Success", 
      description: `Column "${oldColumn}" deleted successfully`,
    });
  }
  else if (action === 'add' && newColumn) {
    // For newly added columns, we need to refresh the data to get the updated structure
    fetchFileData(selectedFile.file_id, selectedFile.filename, currentPage);
    
    toast({
      title: "Success",
      description: `New column "${newColumn}" added successfully`,
    });
  }
}, [columns, selectedFile, fetchFileData, currentPage,toast]);

  useEffect(() => {
    if (user && selectedFile) {
      fetchFileData(selectedFile.file_id, selectedFile.filename);
    }
  }, [user, selectedFile, fetchFileData]);
  useEffect(() => {
    if (selectedFile) {
      // Reset states when file selection changes
      setData([]);
      setColumns([]);
      setUnstructuredContent('');
      setIsEditing(false);
      setError(null);

      fetchFileData(selectedFile.file_id, selectedFile.filename);
    }
  }, [selectedFile, fetchFileData]);

  const fetchTableNames = useCallback(async (filename: string) => {
    if (!user?.id) {
      console.error("User ID not available");
      toast({
        title: "Error",
        description: "User ID is not available. Please sign in.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5000/get_table_count/${user.id}/${filename}`);
      setTableNames(response.data.table_names || []);
      setSelectedTable(response.data.table_names[0] || null);
    } catch (error) {
      console.error("Error fetching table names:", error);
      toast({
        title: "Error",
        description: "Failed to fetch table names. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedFile && typeof selectedFile === 'string' && (selectedFile as string).endsWith('.db')) {
      fetchTableNames(selectedFile);
    }
  }, [selectedFile, fetchTableNames]);


  
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };
  // Add save function for unstructured content
  const handleSaveUnstructured = async () => {
    if (!user?.id || !selectedFile) {
      toast({
        title: "Error",
        description: "User not authenticated or no file selected",
        variant: "destructive",
      });
      return;
    }
    
    // Validate JSON content if it's a JSON file
    if (selectedFile.filename.toLowerCase().endsWith('.json')) {
      try {
        JSON.parse(unstructuredContent);
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "The content is not valid JSON. Please correct the syntax before saving.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `http://localhost:5000/save-unstructured/${user.id}/${selectedFile.file_id}`,
        { content: unstructuredContent }
      );
      
      if (response.data.success === false) {
        throw new Error(response.data.error || "Failed to save content");
      }
  
      toast({
        title: "Success",
        description: "File content updated successfully",
      });
      
      
    } catch (error) {
      console.error("Error saving unstructured content:", error);
      toast({
        title: "Error",
        description: "Failed to save content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  //JSON and xml formatting
  
  // Function to format XML data for display
  const formatXmlDisplay = (xmlContent: string): string => {
    try {
      // Basic indentation for XML - this is a simple approach
      // A more complete formatter would use a proper XML parser
      let formatted = '';
      let indent = 0;
      const lines = xmlContent.replace(/>\s*</g, '>\n<').split('\n');
      
      for (let line of lines) {
        line = line.trim();
        
        if (line.match(/<\/[^>]+>/)) {
          // Closing tag - decrease indent before printing
          indent--;
          formatted += ' '.repeat(indent * 2) + line + '\n';
        } else if (line.match(/<[^>]+\/>/)) {
          // Self-closing tag - no indent change
          formatted += ' '.repeat(indent * 2) + line + '\n';
        } else if (line.match(/<[^>]+>/)) {
          // Opening tag - print then increase indent
          formatted += ' '.repeat(indent * 2) + line + '\n';
          if (!line.match(/<[^>]+><\/[^>]+>/)) {
            indent++;
          }
        } else {
          // Content - just print with current indent
          formatted += ' '.repeat(indent * 2) + line + '\n';
        }
      }
      
      return formatted;
    } catch (error) {
      console.error("Error formatting XML:", error);
      return xmlContent; // Return original content if formatting fails
    }
  };

  // Update the UI to include table selection when needed

  // Add this JSX for rendering unstructured content editor
  const renderUnstructuredContent = () => {
    if (!unstructuredContent) return null;
  
    let contentClass = '';
    let contentTitle = 'Edit Content';
    let titleIcon = null;
    let formattedContent = unstructuredContent;
  
    // Determine content type for styling and formatting
    if (selectedFile?.filename.toLowerCase().endsWith('.json')) {
      contentClass = 'font-mono text-sm bg-gray-50';
      contentTitle = 'Edit JSON Content';
      titleIcon = <FileJson className="h-5 w-5 text-blue-500 mr-2" />;
      
      // The backend should already have formatted the JSON,
      // but we can try to format it again if it looks unformatted
      if (!unstructuredContent.includes('\n')) {
        try {
          const jsonObj = JSON.parse(unstructuredContent);
          formattedContent = JSON.stringify(jsonObj, null, 2);
        } catch (e) {
          console.warn("Failed to parse JSON for formatting:", e);
          formattedContent = unstructuredContent;
        }
      }
    } else if (selectedFile?.filename.toLowerCase().endsWith('.xml')) {
      contentClass = 'font-mono text-sm bg-gray-50';
      contentTitle = 'Edit XML Content';
      titleIcon = <FileText className="h-5 w-5 text-orange-500 mr-2" />;
      formattedContent = formatXmlDisplay(unstructuredContent);
    }
  
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            {titleIcon}
            {contentTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className={`w-full h-96 p-4 border rounded-md ${contentClass}`}
            value={formattedContent}
            onChange={(e) => setUnstructuredContent(e.target.value)}
            spellCheck={false}
            wrap="off" // Better for code/JSON viewing
          />
          <div className="mt-4 flex justify-end space-x-2">
            {selectedFile?.filename.toLowerCase().endsWith('.json') && (
              <Button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(unstructuredContent);
                    setUnstructuredContent(JSON.stringify(parsed, null, 2));
                    toast({
                      title: "Success",
                      description: "JSON formatted successfully",
                    });
                  } catch (e) {
                    toast({
                      title: "Error",
                      description: "Invalid JSON: Cannot format",
                      variant: "destructive",
                    });
                  }
                }}
                variant="outline"
                className="text-blue-600"
              >
                Format JSON
              </Button>
            )}
            <Button
              onClick={handleSaveUnstructured}
              disabled={loading}
              className="bg-blue-500 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Add pagination component
  const renderPagination = () => {
    if (!paginationInfo) return null;

    return (
      <div className="mt-4 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {paginationInfo.total_pages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === paginationInfo.total_pages}
          >
            Next
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Total rows: {paginationInfo.total_rows}
        </div>
      </div>
    );
  };


  // Add pagination handling function
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    if (selectedFile) {
      fetchFileData(selectedFile.file_id, selectedFile.filename, newPage);
    }
  }, [selectedFile, fetchFileData]);
  // Update these functions in your page.tsx

  useEffect(() => {
    console.log("Current data state:", data);
  }, [data]);

  // Modify the handleEdit function to better handle data validation
  const handleEdit = (index: number, field: string, value: any) => {
    console.log("Edit request:", { index, field, value });
    console.log("Current data state at edit time:", dataRef.current);

    if (!dataRef.current || dataRef.current.length === 0) {
      console.error("No data available in ref");
      toast({
        title: "Error",
        description: "Cannot edit: Data not yet loaded",
        variant: "destructive",
      });
      return;
    }

    if (index >= dataRef.current.length) {
      console.error(`Index ${index} is out of bounds for data length ${dataRef.current.length}`);
      toast({
        title: "Error",
        description: "Invalid row selection",
        variant: "destructive",
      });
      return;
    }

    const currentRow = dataRef.current[index];
    console.log("Found row data:", currentRow);

    setFocusedField(field);
    setActiveRow({
      data: { ...currentRow },
      index,
      field,
      value
    });

    setTimeout(() => {
      setEditSheetOpen(true);
    }, 0);
  };

  // Add this effect to track when data changes
  useEffect(() => {
    if (data.length === 0) {
      console.log("Data state is empty. Checking if we need to fetch data...");
      // You might want to trigger a data fetch here if appropriate
    }
  }, [data]);

  // Update your handleCreate function
  const handleCreate = () => {
    const newItem: Partial<DataItem> = {};
    columns.forEach(column => {
      if ('accessorKey' in column) {
        newItem[column.accessorKey as string] = "";
      }
    });

    setActiveRow({
      data: newItem,
      index: -1, // Use -1 to indicate new row
      field: '',
      value: ''
    });
    setEditSheetOpen(true);
  };

  // Add this cleanup function
  const handleSheetClose = () => {
    setEditSheetOpen(false);
    // Clean up after animation completes
    setTimeout(() => {
      setActiveRow(null);
    }, 300); // Match this with your sheet close animation duration
  };


  const handleSaveItem = async () => {
    // First, validate user authentication and file selection
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User authentication required",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile?.file_id) {
      toast({
        title: "Error",
        description: "No file selected",
        variant: "destructive",
      });
      return;
    }

    if (!activeRow) {
      toast({
        title: "Error",
        description: "No row data available for saving",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Process the row data before sending
      const processedData = Object.entries(activeRow.data).reduce((acc, [key, value]) => {
        // Convert empty strings to null
        if (value === '') {
          acc[key] = null;
        }
        // Convert undefined to null
        else if (value === undefined) {
          acc[key] = null;
        }
        // Handle empty arrays
        else if (Array.isArray(value) && value.length === 0) {
          acc[key] = null;
        }
        // Keep other values as is
        else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Prepare the request payload
      const payload = {
        editItem: processedData,
        editIndex: activeRow.index
      };

      console.log("Sending payload to backend:", payload);

      const response = await axios.post(
        `http://localhost:5000/update-row/${user.id}/${selectedFile.file_id}`,
        payload
      );

      console.log("Save response:", response.data);

      if (response.data.success) {
        // Update the data in both state and ref
        const updatedData = [...dataRef.current];
        if (activeRow.index >= 0 && activeRow.index < updatedData.length) {
          // Update existing item
          updatedData[activeRow.index] = response.data.data;
        } else {
          // Add new item
          updatedData.push(response.data.data);
        }
        updateData(updatedData);

        toast({
          title: "Success",
          description: activeRow.index >= 0 ? "Item updated successfully" : "Item created successfully",
        });

        // Close the sheet and reset edit states
        setEditSheetOpen(false);
        setActiveRow(null);
      }
    } catch (error: any) {
      console.error("Failed to save item:", error);
      const errorMessage = error.response?.data?.error || "Failed to save item. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.id || !selectedFile?.file_id || !selectedRows.length) {
      toast({
        title: "Error",
        description: "No rows selected for deletion",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Log selected rows for debugging
      console.log("Selected rows:", selectedRows);

      // Extract indices from selectedRows
      const indices = selectedRows.map(row => row.index);
      console.log("Indices to delete:", indices);

      // Make the API call with the indices in the correct format
      const response = await axios.post(
        `http://localhost:5000/delete-rows/${user.id}/${selectedFile.file_id}`,
        { indices: indices }  // Make sure to send as an object with 'indices' key
      );

      if (response.data.success) {
        // Remove the deleted rows from the local data
        const updatedData = data.filter((_, index) =>
          !indices.includes(index)
        );
        setData(updatedData);
        dataRef.current = updatedData;
        setSelectedRows([]);

        toast({
          title: "Success",
          description: `Successfully deleted ${indices.length} row(s)`,
        });

        // Refresh the data to ensure synchronization
        await fetchFileData(selectedFile.file_id, selectedFile.filename, currentPage);
      }
    } catch (error: any) {
      console.error("Failed to delete rows:", error);
      const errorMessage = error.response?.data?.error || "Failed to delete rows. Please try again.";

      // Log detailed error information
      if (error.response) {
        console.log("Error response:", error.response);
        console.log("Request payload:", { indices: selectedRows.map(row => row.index) });
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this utility function to help with data validation


  const handleReset = () => {
    setTableKey(prevKey => prevKey + 1);
    setFilterkey(Date.now().toString())
    if (selectedFile) {
      fetchFileData(selectedFile.file_id, selectedFile.filename);
    }
    toast({
      title: "Reset",
      description: "All filters and sorting have been reset.",
    });
  };

  const handleUploadSuccess = useCallback(() => {
    refetchFileList();
    toast({
      title: "Success",
      description: "File uploaded successfully. The file list has been updated.",
      duration: 3000,
    });
  }, [refetchFileList]);

  const handleDeleteSuccess = useCallback(() => {
    refetchFileList();
    if (selectedFile) {
      setSelectedFile(null);
    }
  }, [refetchFileList, selectedFile]);


  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="mb-4 text-lg">Please sign in to access this page.</p>
        <Button onClick={() => window.location.href = "/sign-in"}>
          Sign In
        </Button>
      </div>
    );
  }

  if (initialLoading) {
    return <LoadingScreen message="Loading your data dashboard..." />;
  }
  return (
    // Main container - Adding a subtle background and better spacing
    <div className="max-w-screen-2xl mx-auto w-full pb-10 min-h-screen p-6 bg-gray-50">
      {/* Header - More prominent with better contrast */}
      <div className="mb-8 flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Data Hub</h1>
      </div>

      {/* File Selection Card - Refined shadows and borders */}
      <Card className="mb-6 border border-gray-200 shadow-md rounded-lg overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 bg-white p-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center text-gray-900">
              <FileIcon className="mr-2 h-5 w-5 text-gray-700" />
              File Selection
            </CardTitle>
            <p className="text-sm text-gray-600">
              Upload, select, or manage your data files
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              triggerButton={
                <Button
                  className="flex items-center bg-black text-white hover:bg-gray-800 
                         transition-colors duration-200 shadow-sm px-4 py-2
                         focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              }
            />
            <FileDelete
              fileList={fileList || []}
              onDeleteSuccess={handleDeleteSuccess}
            />
            
          </div>
          
        </CardHeader>

        <CardContent className="p-6 bg-white">
          {fileListLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-700">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading files...</span>
            </div>
          ) : fileListError ? (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <span className="text-sm text-red-600">{fileListError}</span>
            </div>
          ) : fileList && fileList.length > 0 ? (
            <div className="space-y-4">
              <div className="relative">
                <Select
                  onValueChange={(value) => {
                    const selectedFileData = fileList?.find(file => file.file_id === value);
                    if (selectedFileData) {
                      setSelectedFile({
                        file_id: selectedFileData.file_id,
                        filename: selectedFileData.filename
                      });
                    }
                  }}
                  value={selectedFile?.file_id}
                >
                  <SelectTrigger
                    className="w-full border-gray-300 rounded-lg h-11 
                           focus:ring-2 focus:ring-gray-500 focus:border-gray-500
                           hover:border-gray-400 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select a file to view or edit" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {fileList?.map(file => (
                      <SelectItem
                        key={file.file_id}
                        value={file.file_id}
                        className="py-2.5 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <FileIcon className="h-4 w-4 mr-2 text-gray-700" />
                          <span className="text-gray-900">{file.filename}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFile && (
                <div className="pt-2 flex items-center justify-between text-sm text-gray-600">
                  <span>Selected: {selectedFile.filename}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  >
                    Clear selection
                  </Button>
                </div>
              )}
            </div>
          ) :(
            
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileIcon className="h-12 w-12 mb-4 text-gray-400" />
              <p className="text-sm font-medium mb-2">No files available</p>
              <p className="text-xs text-gray-400">
                Upload a file to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Content Card - Enhanced visual hierarchy */}
      <Card className="border border-gray-200 shadow-md rounded-lg overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b border-gray-200 p-6">
          <CardTitle className="text-2xl text-gray-900">File Content</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} className="bg-black text-white hover:bg-gray-800">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New
            </Button>

           
            {/* Action Buttons - Consistent black theme */}
            {/* {columns.length > 0 && (
              <SplitDialog
                columns={columns.map(col => col.id).filter((col): col is string => col !== undefined)}
                fileId={selectedFile?.file_id || ''}
                userId={user.id}
                onSplitComplete={(newData) => {
                  setData(newData);
                  setColumns(generateColumns(newData[0]));
                  toast({
                    title: "Success",
                    description: "Column split successfully",
                  });
                }}
              />
            )} */}
 <StatisticsCalculatorStandalone 
  fileId={selectedFile?.file_id || ''}
  userId={user?.id || ''}
  onColumnAdded={() => {
    // Refresh data when a column is added
    if (selectedFile) {
      fetchFileData(selectedFile.file_id, selectedFile.filename, currentPage);
    }
  }}
  buttonVariant="default"
  buttonClassName="bg-gray-700 text-white hover:bg-gray-600"
/>
           {selectedRows.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="bg-gray-900 hover:bg-gray-800"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.length})
              </Button>
            )}

            {/* <Button
              onClick={handleSave}
              className="bg-black text-white hover:bg-gray-800"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Data
            </Button> */}
<Button
  className="bg-gray-100 text-gray-800 hover:bg-gray-200"
  onClick={() => setIsRenameFileDialogOpen(true)}
  disabled={!selectedFile}
>
  <FileEdit className="mr-2 h-4 w-4" />
  Rename File
</Button>

            <Button
              onClick={handleReset}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset All
            </Button>
            <Button
              className="bg-black text-white hover:bg-gray-800"
              onClick={handleOpenAnalysisModal}
            >
              <BarChart className="mr-2 h-4 w-4" />
              Analyze Data
            </Button>
            <DataAnalysisModal
              fileId={selectedFile?.file_id || ''}
              userId={user?.id || ''}
              isOpen={isAnalysisModalOpen}
              onClose={handleCloseAnalysisModal}
              fileChanged={fileChanged}
            />
          </div>
        </CardHeader>

        {/* Content Area - Better spacing and loading states */}
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
            </div>
          ) : error ? (
            <p className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</p>
          ) : isEditing && unstructuredContent ? (
            renderUnstructuredContent()
          ) : data.length > 0 ? (
            <>
              <DataTable
  key={tableKey}
  columns={columns}
  data={data}
  userId={user?.id || ''}
  fileId={selectedFile?.file_id || ''}
  onRowSelectionChange={setSelectedRows}
  filterkey={filterkey}
  onReset={handleReset}
  onColumnsChange={handleColumnsChange}
/>
              {renderPagination()}
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No data available. Please select a file or upload a new one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet - Refined styling */}
      <Sheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleSheetClose();
            setFocusedField('');
          } else if (!activeRow) {
            toast({
              title: "Error",
              description: "Missing row data for editing",
              variant: "destructive",
            });
            return;
          }
          setEditSheetOpen(open);
        }}
      >
        <SheetContent className="sm:max-w-[425px] border-l border-gray-200">
          {/* {renderEditForm()} */}
          <SheetHeader>
            <SheetTitle className="text-gray-900">
              {activeRow ? "Edit Item" : "Create New Item"}
            </SheetTitle>

            <SheetDescription className="text-gray-600">
              {activeRow ? "Make changes to the item below." : "Fill in the details for the new item."}
            </SheetDescription>
          </SheetHeader>
          <EnhancedEditForm
            data={data}
            activeRow={activeRow}
            setActiveRow={setActiveRow}
            columnOrder={columnOrder}
            loading={loading}
          />
          {/* {activeRow ? (
            <div className="grid gap-4 py-4">
              {Object.entries(activeRow.data)
                .filter(([key]) => key !== 'id' && key !== 'rowId')
                .map(([key, value]) => (
                  <div key={key} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={key} className="text-right text-gray-700">
                      {key}
                    </Label>
                    <Input
                      id={key}
                      value={(value as string) ?? ''}
                      onChange={(e) => {
                        setActiveRow(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            data: {
                              ...prev.data,
                              [key]: e.target.value
                            }
                          };
                        });
                      }}
                      className="col-span-3 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                      disabled={loading}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500">
              Loading row data...
            </div>
          )} */}

          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleSheetClose}
              disabled={loading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!activeRow) return;
                handleSaveItem();
              }}
              disabled={loading || !activeRow}
              className="bg-black text-white hover:bg-gray-800"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      {selectedFile && (
  <RenameFileDialog
    isOpen={isRenameFileDialogOpen}
    onClose={handleCloseRenameDialog}
    fileId={selectedFile.file_id}
    userId={user?.id || ''}
    currentFilename={selectedFile.filename}
    onFileRenamed={handleFileRenamed}
  />
)}
{isColumnManagementOpen && (
  <ColumnManagementDialog
    isOpen={isColumnManagementOpen}
    onClose={handleCloseColumnManagement}
    column={activeColumn}
    fileId={selectedFile?.file_id || ''}
    userId={user?.id || ''}
    onColumnChange={handleColumnChange}
    allColumns={columns.map(col =>
      typeof col === 'object' && 'accessorKey' in col
        ? (col.accessorKey as string)
        : ''
    ).filter(Boolean)}
  />
)}

    </div>
  );
};

export default DataTablePage;