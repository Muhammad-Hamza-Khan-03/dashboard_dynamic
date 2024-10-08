"use client"
import React, { useState, useEffect, useCallback } from "react";
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

const DataTable = dynamic<DataTableProps<FileData>>(() =>
  import('@/components/data-table').then((mod) => mod.DataTable), {
  loading: () => <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>,
  ssr: false,
});

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  filterkey: string
  onRowSelectionChange: (rows: Row<TData>[]) => void
  onReset: () => void
}

type DataItem = FileData;

const DataTablePage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef<DataItem, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
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

  useEffect(() => {
    if (isUserLoaded && user && fileList && fileList.length > 0 && !selectedFile) {
      setSelectedFile(fileList[0]);
    }
  }, [isUserLoaded, user, fileList, selectedFile]);

  const fetchFileData = useCallback(async (filename: string) => {
    if (!user?.id) {
      console.error("User ID not available");
      setError("User ID not available");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:5000/get_file/${user.id}/${filename}`, {
        params: { table: selectedTable },
        responseType: 'text',
      });

      const fileData = response.data;
      console.log("Fetched file data:", fileData);

      const parsedData = parseFileData(fileData, filename);
      console.log("Parsed file data:", parsedData);

      setData(parsedData);
      if (parsedData.length > 0) {
        setColumns(generateColumns(parsedData[0]));
      } else {
        setColumns([]);
      }
    } catch (err) {
      console.error("Error in fetchFileData:", err);
      setError(err instanceof Error ? err.message : "Failed to process file data");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process file data",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedTable]);

  useEffect(() => {
    if (isUserLoaded && user && selectedFile) {
      fetchFileData(selectedFile);
    }
  }, [isUserLoaded, user, selectedFile, selectedTable, fetchFileData]);

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
    if (selectedFile && selectedFile.endsWith('.db')) {
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

  const generateColumns = (firstRow: FileData): ColumnDef<DataItem, any>[] => {
    if (!firstRow) {
      console.error("Empty or undefined data row");
      return [];
    }

    return Object.keys(firstRow).map((key) => ({
      accessorKey: key,
      header: key,
      cell: ({ row }) => {
        const value = row.getValue(key);
        return (
          <div className="flex items-center justify-between">
            <span>{formatCellValue(value)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.index, key, formatCellValue(value))}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }));
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

  const handleEdit = (index: number, field: string, value: string) => {
    setEditItem({ [field]: value });
    setEditIndex(index);
    setEditField(field);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    const newItem: Partial<DataItem> = {};
    columns.forEach(column => {
      if ('accessorKey' in column) {
        newItem[column.accessorKey as string] = "";
      }
    });
    setEditItem(newItem);
    setEditIndex(null);
    setEditField(null);
    setIsSheetOpen(true);
  };

  const handleSaveItem = async () => {
    if (editItem) {
      let updatedData = [...data];
      if (editIndex !== null && editField) {
        // Update existing item
        updatedData[editIndex] = { ...updatedData[editIndex], [editField]: editItem[editField] };
      } else {
        // Add new item
        updatedData.push(editItem as DataItem);
      }

      try {
        await saveDataToBlob(updatedData);
        setData(updatedData);
        toast({
          title: "Success",
          description: "Item saved successfully",
        });
      } catch (error) {
        console.error("Failed to save item:", error);
        toast({
          title: "Error",
          description: "Failed to save item. Please try again.",
          variant: "destructive",
        });
      }
    }
    setIsSheetOpen(false);
    setEditItem(null);
    setEditIndex(null);
    setEditField(null);
  };

  const saveDataToBlob = async (dataToSave: DataItem[]) => {
    if (!user || !selectedFile) {
      throw new Error("User not authenticated or no file selected");
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:5000/update_blob/${user.id}/${selectedFile}`, {
        newContent: dataToSave,
      });
      if (response.status !== 200) {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating blob content:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    const selectedIndices = selectedRows.map(row => row.index);
    setData(prevData => prevData.filter((_, index) => !selectedIndices.includes(index)));
    setSelectedRows([]);
  };

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

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 min-h-screen p-6">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Hub</h1>
      </div>

      <Card className="mb-6 shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl flex items-center">
            <FileIcon className="mr-2" />
            File Selection
          </CardTitle>
          <div className="flex items-center space-x-2">
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              triggerButton={
                <Button className="flex items-center bg-blue-500 text-white hover:bg-blue-600">
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
        <CardContent className="p-4">
          {fileListLoading ? (
            <div className="flex items-center text-blue-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Loading files...</span>
            </div>
          ) : fileListError ? (
            <span className="text-red-500">{fileListError}</span>
          ) : fileList && fileList.length > 0 ? (
            <div className="space-y-4">
              <Select onValueChange={setSelectedFile} value={selectedFile || undefined}>
                    <SelectTrigger className="w-full border-gray-300 focus:ring-blue-500">
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  {fileList.map(file => (
                    <SelectItem key={file} value={file}>
                      {file}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFile && selectedFile.endsWith('.db') && (
                <Select onValueChange={setSelectedTable} value={selectedTable || undefined}>
                  <SelectTrigger className="w-full border-gray-300 focus:ring-blue-500">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableNames.map((name, index) => (
                      <SelectItem key={index} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <span className="text-blue-500">No files available</span>
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
            <Sheet open={isAnalysisDrawerOpen} onOpenChange={setIsAnalysisDrawerOpen}>
              <SheetTrigger asChild>
                <Button className="bg-purple-500 text-white hover:bg-purple-600">
                  <BarChart className="mr-2 h-4 w-4" />
                  Analyze Data
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                {/* Analysis content */}
              </SheetContent>
            </Sheet>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : data.length > 0 ? (
            <DataTable
              key={tableKey}
              columns={columns}
              data={data}
              onRowSelectionChange={setSelectedRows}
              onReset={handleReset}
              filterkey={""} 
            />
          ) : (
            <p className="text-blue-500">No data available. Please select a file or upload a new one.</p>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editIndex !== null ? "Edit Item" : "Create New Item"}</SheetTitle>
            <SheetDescription>
              {editIndex !== null
                ? "Edit the value for this field."
                : "Fill in the values for the new item."}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            {editItem &&
              (editField ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={editField} className="text-right">
                    {editField}
                  </Label>
                  <Input
                    id={editField}
                    value={editItem[editField] as string}
                    onChange={(e) => setEditItem({ ...editItem, [editField]: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              ) : (
                Object.entries(editItem).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={key} className="text-right">
                      {key}
                    </Label>
                    <Input
                      id={key}
                      value={value as string}
                      onChange={(e) => setEditItem({ ...editItem, [key]: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                ))
              ))}
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button onClick={() => setIsSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveItem}>Save changes</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DataTablePage;