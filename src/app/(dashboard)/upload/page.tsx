//page.tsx

"use client"
import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";
import { useUser } from '@clerk/nextjs';
import { Loader2, PlusCircle, Edit, Save, Trash2, FileIcon, BarChart, RefreshCw, Upload } from "lucide-react";
import axios from 'axios';
import { FileData } from "@/features/sqlite/api/file-content";
import useFilesList from "@/features/sqlite/api/file-list";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FileUpload from "./fileupload";
import FileDelete from "@/features/sqlite/components/file-delete";
import { SplitDialog } from "./split-dialog";

import DataAnalysisModal from "./data-analysis-modal-component";


const DataTable = dynamic<DataTableProps<FileData>>(() =>
  import('@/components/data-table').then((mod) => mod.DataTable), {
  loading: () => <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>,
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
interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  filterkey: string
  onRowSelectionChange: (rows: Row<TData>[]) => void
  onReset: () => void
}
interface TableInfo {
  id: string;
  name: string;
  full_name: string;
}


///////
// Add these interfaces
interface Sheet {
  name: string;
  key: string;
}

///////
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
  const { user, isLoaded: isUserLoaded } = useUser();
  const { fileList, error: fileListError, loading: fileListLoading, refetch: refetchFileList } = useFilesList(user?.id);
  
  const [editItem, setEditItem] = useState<Partial<DataItem> | null>(null);
 
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
  const [activeRow, setActiveRow] = useState<{
    data: any;
    index: number;
    field: string;
    value: any;
  } | null>(null);

  useEffect(() => {
    if (isUserLoaded && user && fileList && fileList.length > 0 && !selectedFile) {
      setSelectedFile({ file_id: fileList[0].file_id, filename: fileList[0].filename });
    }
  }, [isUserLoaded, user, fileList, selectedFile]);

  /////////////////////////////////////////////////////

// Reset state helper function
const resetState = () => {
  setData([]);
  setColumns([]);
    setUnstructuredContent('');
    setIsEditing(false);
    setPaginationInfo(null);
    setSelectedTable(null);
  };

  // Modify the fetchFileData function
  const fetchFileData = useCallback(async (fileId: string, filename: string, page: number = 1) => {
    if (!user?.id) {
      setError("User ID not available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<FileContent>(
        `http://localhost:5000/get-file/${user.id}/${fileId}`,
        {
          params: {
            page: page,
            page_size: 50
          }
        }
      );

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const fileData = response.data;

      if (fileData.type === 'structured') {
        if (fileData.tables && fileData.tables.length > 0) {
          setTablesList(fileData.tables);
          if (!selectedTable) {
            setSelectedTable(fileData.tables[0].id);
            const tableResponse = await axios.get<FileContent>(
              `http://localhost:5000/get-file/${user.id}/${fileData.tables[0].id}`,
              { params: { page: 1, page_size: 50 } }
            );
            if (tableResponse.data.data && tableResponse.data.columns) {
              updateData(tableResponse.data.data); // Use updateData instead of setData
              setColumns(generateColumns(tableResponse.data.columns));
              setPaginationInfo(tableResponse.data.pagination || null);
            }
          }
        } else if (fileData.data && fileData.columns) {
          updateData(fileData.data); // Use updateData instead of setData
          setColumns(generateColumns(fileData.columns));
          setPaginationInfo(fileData.pagination || null);
        }
        setUnstructuredContent('');
        setIsEditing(false);
      } else {
        updateData([]); // Use updateData instead of setData
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
  }, [user?.id, selectedTable]);

  // Helper function to parse CSV content



  // Helper function to parse text content
  ///////////////////////////////////////////////////////////////////////////////////
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

  useEffect(() => {
    if (isUserLoaded && user && selectedFile) {
      fetchFileData(selectedFile.file_id, selectedFile.filename);
    }
  }, [isUserLoaded, user, selectedFile, fetchFileData]);
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




  // Update the generateColumns function to include the cell update functionality
  // Helper function to generate columns with consistent formatting
  const generateColumns = (columns: string[]): ColumnDef<DataItem, any>[] => {
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
      header: column,
      cell: ({ row }) => {
        const value = row.getValue(column);
        return (
          <div className="flex items-center justify-between">
            <span>{formatCellValue(value)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.index, column, formatCellValue(value))}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }));
  };

  const updateData = (newData: DataItem[]) => {
    setData(newData);
    dataRef.current = newData;
  };

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
    } setLoading(true);
    try {
      await axios.post(
        `http://localhost:5000/save-unstructured/${user.id}/${selectedFile.file_id}`,
        { content: unstructuredContent }
      );

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

  // Update the UI to include table selection when needed

  // Add this JSX for rendering unstructured content editor
  const renderUnstructuredContent = () => {
    if (!isEditing) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Edit Content</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full h-96 p-4 border rounded-md"
            value={unstructuredContent}
            onChange={(e) => setUnstructuredContent(e.target.value)}
          />
          <div className="mt-4 flex justify-end">
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
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (selectedFile) {
      fetchFileData(selectedFile.file_id, selectedFile.filename, newPage);
    }
  };
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
    // First, let's add comprehensive validation
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
      console.log("Saving item:", {
        editItem: activeRow.data,
        editIndex: activeRow.index
      });

      const response = await axios.post(
        `http://localhost:5000/update-row/${user.id}/${selectedFile.file_id}`,
        {
          editItem: activeRow.data,
          editIndex: activeRow.index
        }
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

// In page.tsx

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

  if (!isUserLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Please sign in to access this page.</p>
      </div>
    );
  }
  const renderEditForm = () => {
    if (!activeRow) return null;

    // Sort fields based on column order
    const sortedFields = Object.entries(activeRow.data)
      .filter(([key]) => key !== 'id' && key !== 'rowId')
      .sort(([keyA], [keyB]) => {
        const orderA = columnOrder[keyA] ?? Infinity;
        const orderB = columnOrder[keyB] ?? Infinity;
        return orderA - orderB;
      });

    return (
      <div className="grid gap-4 py-4">
        {sortedFields.map(([key, value]) => (
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
              className={`col-span-3 border-gray-300 focus:border-gray-500 focus:ring-gray-500 ${
                key === focusedField ? 'ring-2 ring-gray-500' : ''
              }`}
              autoFocus={key === focusedField}
              disabled={loading}
            />
          </div>
        ))}
      </div>
    );
  };

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
          ) : (
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
              onClick={handleReset}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset All
            </Button>
  
            <Button 
              className="bg-black text-white hover:bg-gray-800" 
              onClick={() => setIsAnalysisModalOpen(true)}
            >
              <BarChart className="mr-2 h-4 w-4" />
              Analyze Data
            </Button>
            <DataAnalysisModal
              fileId={selectedFile?.file_id || ''}
              userId={user?.id || ''}
              isOpen={isAnalysisModalOpen}
              onClose={() => setIsAnalysisModalOpen(false)}
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
                onRowSelectionChange={setSelectedRows}
                onReset={handleReset}
                filterkey=""
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
          {renderEditForm()}
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
    </div>
  );
};

export default DataTablePage;