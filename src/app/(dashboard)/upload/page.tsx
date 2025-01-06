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
import AnalysisModal from "./data-analysis-modal-component";
import DataAnalysisModal from "./data-analysis-modal-component";


const DataTable = dynamic<DataTableProps<FileData>>(() =>
  import('@/components/data-table').then((mod) => mod.DataTable), {
  loading: () => <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>,
  ssr: false,
});

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

interface FileGroup {
  baseFile: FileData;
  tables: TableInfo[];
}

interface GroupedFiles {
  [key: string]: FileGroup;
}
///////
// Add these interfaces
interface Sheet {
  name: string;
  key: string;
}

interface FileMetadata {
  file_id: string;
  filename: string;
  file_type: string;
}
///////
type DataItem = FileData;
interface PaginationInfo {
  total_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface FileResponse {
  type: 'structured' | 'unstructured';
  file_type: string;
  columns?: string[];
  data?: any[];
  content?: string;
  editable?: boolean;
  pagination?: PaginationInfo;
}
interface RowOperation {
  type: 'create' | 'update' | 'delete';
  data: any;
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<DataItem> | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Row<DataItem>[]>([]);
  const [isAnalysisDrawerOpen, setIsAnalysisDrawerOpen] = useState(false);
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
  const [groupedFiles, setGroupedFiles] = useState<GroupedFiles>({});
  const [selectedBaseName, setSelectedBaseName] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
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
    updateData([]); // Use updateData instead of setData
    setColumns([]);
    setUnstructuredContent('');
    setIsEditing(false);
    setPaginationInfo(null);
    setTablesList([]);
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
  const parseCSVContent = (content: string): DataItem[] => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim());

    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row: DataItem = {};

      headers.forEach((header, index) => {
        let value = values[index]?.trim() || '';

        // Try to parse numbers
        if (!isNaN(Number(value))) {
          row[header] = Number(value);
        } else {
          row[header] = value;
        }
      });

      return row;
    });
  };

  const handleDataLoad = useCallback((newData: any[], newColumns: any[]) => {
    setData(newData);
    const columnDefs = newColumns.map(col => ({
      accessorKey: col,
      header: col,
      cell: ({ row }: {
        row: {
          getValue: (col: any) => any;
          index: number;
        }
      }) => {
        const value = row.getValue(col);
        return (
          <div className="flex items-center justify-between">
            <span>{formatCellValue(value)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.index, col, formatCellValue(value))}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }));
    setColumns(columnDefs);
  }, []);

  const handleViewerError = useCallback((error: string) => {
    setError(error);
    toast({
      title: "Error",
      description: error,
      variant: "destructive",
    });
  }, []);

  // Helper function to parse text content
  const parseTextContent = (content: string): DataItem[] => {
    const lines = content.trim().split('\n');
    return lines.map((line, index) => ({
      line: index + 1,
      content: line.trim()
    }));
  };
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

  const handleTableChange = (tableName: string) => {
    setCurrentTable(tableName);
    setCurrentPage(1);
  };
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

  const parseFileData = (fileData: string, filename: string): FileData[] => {
    if (!fileData) {
      console.error("Received undefined or null fileData");
      return [];
    }

    const fileExtension = filename.split('.').pop()?.toLowerCase();

    switch (fileExtension) {
      case 'csv':
      case 'tsv':
      case 'txt':
      case 'xlsx':
      case 'xls':
      case 'db':
      case 'xml':
        return parseCSV(fileData);
      case 'pdf':
        return parsePDFData(fileData);
      default:
        console.error(`Unsupported file type: ${fileExtension}`);
        return [];
    }
  };

  const parseCSV = (csvString: string): FileData[] => {
    const lines = csvString.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj: FileData = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim();
      });
      return obj;
    });
  };

  const parsePDFData = (pdfData: string): FileData[] => {
    const lines = pdfData.trim().split('\n');
    return lines.slice(1).map(line => {
      const [page, content] = line.split(',', 2);
      return { page, content };
    });
  };

  // Update the generateColumns function to include the cell update functionality
  // Helper function to generate columns with consistent formatting
  const generateColumns = (columns: string[]): ColumnDef<DataItem, any>[] => {
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
  const renderTableSelector = () => {
    if (!tablesList || tablesList.length === 0) return null;

    return (
      <Select
        onValueChange={setSelectedTable}
        value={selectedTable || undefined}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a table" />
        </SelectTrigger>
        <SelectContent>
          {tablesList.map(table => (
            <SelectItem key={table.id} value={table.id}>
              {table.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

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

    // Check data from ref instead of state
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

    setActiveRow({
      data: { ...currentRow },
      index,
      field,
      value
    });

    // Force sheet to open in next tick to ensure state is updated
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
      field: ''
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

  const handleDelete = async () => {
    if (!user || !selectedFile || !selectedRows.length) {
      toast({
        title: "Error",
        description: "No rows selected for deletion",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get the indices of selected rows
      const indices = selectedRows.map(row => row.index);

      const response = await axios.post(
        `http://localhost:5000/delete-rows/${user.id}/${selectedFile.file_id}`,
        { indices }
      );

      if (response.data.success) {
        // Remove the deleted rows from the local data
        const selectedIndices = new Set(indices);
        setData(prevData => prevData.filter((_, index) => !selectedIndices.has(index)));
        setSelectedRows([]);

        toast({
          title: "Success",
          description: `Successfully deleted ${indices.length} row(s)`,
        });
      }
    } catch (error: any) {
      console.error("Failed to delete rows:", error);
      const errorMessage = error.response?.data?.error || "Failed to delete rows. Please try again.";
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
  const isValidData = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    // Add any additional validation as needed
    return true;
  };

  // Add this function to handle cell updates
  // const handleCellUpdate = async (rowIndex: number, field: string, value: any) => {
  //   if (!user || !selectedFile) return;

  //   const currentRow = data[rowIndex];
  //   const updatedData = {
  //     ...currentRow,
  //     [field]: value,
  //     row_id: rowIndex + 1
  //   };

  //   try {
  //     const response = await axios.put(
  //       `http://localhost:5000/row/${user.id}/${selectedFile.file_id}`,
  //       updatedData
  //     );

  //     if (response.data) {
  //       setData(prevData => 
  //         prevData.map((item, index) => 
  //           index === rowIndex ? response.data.data : item
  //         )
  //       );

  //       toast({
  //         title: "Success",
  //         description: "Cell updated successfully",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Failed to update cell:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to update cell. Please try again.",
  //       variant: "destructive",
  //     });
  //   }
  // };
  const handleSave = async () => {
    if (!user || !selectedFile) {
      toast({
        title: "Error",
        description: "User not authenticated or no file selected",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/update_blob/${user.id}/${selectedFile}`, {
        newContent: data,
      });

      toast({
        title: "Success",
        description: "File content updated successfully",
      });
    } catch (error) {
      console.error("Error updating file content:", error);
      toast({
        title: "Error",
        description: "Failed to update file content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
  const renderEditForm = () => (
    <div className="grid gap-4 py-4">
      {editItem && (
        Object.entries(editItem)
          .filter(([key]) => key !== 'id' && key !== 'rowId') // Exclude any internal fields
          .map(([key, value]) => (
            <div key={key} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={key} className="text-right">
                {key}
              </Label>
              <Input
                id={key}
                value={value as string}
                onChange={(e) => {
                  setEditItem(prev => ({
                    ...prev!,
                    [key]: e.target.value
                  }));
                }}
                className="col-span-3"
              />
            </div>
          ))
      )}
    </div>
  );

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 min-h-screen p-6">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Hub</h1>
      </div>
      <Card className="mb-6 border-0 shadow-xl rounded-xl overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-white p-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center text-gray-800">
              <FileIcon className="mr-2 h-5 w-5 text-blue-600" />
              File Selection
            </CardTitle>
            <p className="text-sm text-gray-500">
              Upload, select, or manage your data files
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              triggerButton={
                <Button
                  className="flex items-center bg-blue-600 text-white hover:bg-blue-700 
                         transition-colors duration-200 shadow-sm px-4 py-2
                         focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
            <div className="flex items-center justify-center py-8 text-blue-600">
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
                    className="w-full border-gray-200 rounded-lg h-11 
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           hover:border-blue-400 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select a file to view or edit" />
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[300px] overflow-y-auto"
                  >
                    {fileList?.map(file => (
                      <SelectItem
                        key={file.file_id}
                        value={file.file_id}
                        className="py-2.5 hover:bg-blue-50"
                      >
                        <div className="flex items-center">
                          <FileIcon className="h-4 w-4 mr-2 text-blue-600" />
                          <span>{file.filename}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedFile && (
                <div className="pt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>Selected: {selectedFile.filename}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-500 hover:text-gray-700"
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
      <Card className="shadow-lg rounded-lg overflow-hidden bg-white">
        <CardHeader className="flex flex-row items-center justify-between bg-gray-50">
          <CardTitle className="text-2xl">File Content</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} className="bg-green-500 text-white hover:bg-green-600">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New
            </Button>
            {columns.length > 0 && (
              <SplitDialog
                columns={columns.map(col => (col.accessorKey))}
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
            )}
            {selectedRows.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.length})
              </Button>
            )}
            <Button
              onClick={handleSave}
              className="bg-blue-500 text-white hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Data
            </Button>
            <Button
              onClick={handleReset}
              className="bg-yellow-500 text-white hover:bg-yellow-600"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset All
            </Button>

            {/* <Sheet open={isAnalysisDrawerOpen} onOpenChange={setIsAnalysisDrawerOpen}> */}
            {/* <SheetTrigger asChild> */}
            <Button className="bg-purple-500 text-white hover:bg-purple-600" onClick={() => setIsAnalysisModalOpen(true)}>
              <BarChart className="mr-2 h-4 w-4" />
              Analyze Data
            </Button>
            {/* </SheetTrigger> */}
            {/* <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto"> */}
            {/* Analysis content */}
            {/* </SheetContent> */}
            {/* </Sheet> */}
            <DataAnalysisModal
              fileId={selectedFile?.file_id || ''}
              userId={user?.id || ''}
              isOpen={isAnalysisModalOpen}
              onClose={() => setIsAnalysisModalOpen(false)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
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
            <p className="text-blue-500">
              No data available. Please select a file or upload a new one.
            </p>
          )}
        </CardContent>
      </Card>
      <Sheet
        open={editSheetOpen}
        onOpenChange={(open) => {
          console.log("Sheet open state changing to:", open);
          if (!open) {
            handleSheetClose();
          } else {
            // Verify we have active row data when opening
            if (!activeRow) {
              console.error("Attempting to open sheet without active row data");
              toast({
                title: "Error",
                description: "Missing row data for editing",
                variant: "destructive",
              });
              return;
            }
          }
          setEditSheetOpen(open);
        }}
      >
        <SheetContent className="sm:max-w-[425px]">
          <SheetHeader>
            <SheetTitle>
              {activeRow ? "Edit Item" : "Create New Item"}
            </SheetTitle>
            <SheetDescription>
              {activeRow ? "Make changes to the item below." : "Fill in the details for the new item."}
            </SheetDescription>
          </SheetHeader>

          {activeRow ? (
            <div className="grid gap-4 py-4">
              {Object.entries(activeRow.data)
                .filter(([key]) => key !== 'id' && key !== 'rowId')
                .map(([key, value]) => (
                  <div key={key} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={key} className="text-right">
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
                      className="col-span-3"
                      disabled={loading}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <div className="py-4 text-center text-gray-500">
              Loading row data...
            </div>
          )}

          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleSheetClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!activeRow) return;
                handleSaveItem();
              }}
              disabled={loading || !activeRow}
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