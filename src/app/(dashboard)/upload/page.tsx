"use client"
import React, { useState, useEffect, useMemo, Suspense } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";
import { useUser } from '@clerk/nextjs';
import { Loader2, PlusCircle, Edit, Save, Trash, Filter, FileIcon, BarChart, RefreshCw } from "lucide-react";
import axios from 'axios';
import { handleUseCSV, FileData } from "@/features/sqlite/api/file-content";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from "@/components/ui/accordion";
// import { Slider } from "@/components/ui/slider";
// import { Progress } from "@/components/ui/progress";


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
}

type DataItem = FileData;

function hasAccessorKey(column: ColumnDef<DataItem, any>): column is ColumnDef<DataItem, any> & { accessorKey: string } {
  return 'accessorKey' in column;
}

const DataTablePage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef<DataItem, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { user, isLoaded: isUserLoaded } = useUser();
  const { fileList, error: fileListError, loading: fileListLoading } = useFilesList(user?.id);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<DataItem> | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Row<DataItem>[]>([]);
  const [isAnalysisDrawerOpen, setIsAnalysisDrawerOpen] = useState(false);

  useEffect(() => {
    if (isUserLoaded && user && fileList && fileList.length > 0 && !selectedFile) {
      setSelectedFile(fileList[0]);
    }
  }, [isUserLoaded, user, fileList, selectedFile]);

  useEffect(() => {
    if (isUserLoaded && user && selectedFile) {
      fetchFileData(selectedFile);
    }
  }, [isUserLoaded, user, selectedFile]);

 const fetchFileData = async (filename: string) => {
    if (!user?.id) {
      console.error("User ID not available");
      setError("User ID not available");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await handleUseCSV(
        filename,
        user.id,
        setLoading,
        setError,
        processFetchedData
      );
    } catch (err) {
      console.error("Error in fetchFileData:", err);
      setError("Failed to process file data");
      toast({
        title: "Error",
        description: "Failed to process file data",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const processFetchedData = (fetchedData: FileData[]) => {
    if (fetchedData && fetchedData.length > 0) {
      const generatedColumns: ColumnDef<DataItem, any>[] = Object.keys(fetchedData[0]).map((key) => ({
        accessorKey: key,
        header: key,
        cell: ({ row }) => (
          <div className="flex items-center justify-between">
            <span>{String(row.getValue(key))}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row.index, key, row.getValue(key) as string)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      }));
      setColumns(generatedColumns);
      setData(fetchedData);
    } else {
      console.warn("Received empty or invalid data");
      setColumns([]);
      setData([]);
      setError("No data found in the file");
    }
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
      if (hasAccessorKey(column)) {
        newItem[column.accessorKey] = "";
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
        description: "Data table content updated successfully",
      });
    } catch (error) {
      console.error("Error updating blob content:", error);
      toast({
        title: "Error",
        description: "Failed to update data table content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


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
    <div className="max-w-screen-2xl mx-auto w-full pb-10 bg-gradient-to-br from-indigo-50 to-teal-50 min-h-screen p-6">
      <Card className="mb-6 bg-white shadow-lg rounded-lg overflow-hidden border-t-4 border-indigo-500">
        <CardHeader className="bg-indigo-50">
          <CardTitle className="text-2xl flex items-center text-indigo-700">
            <FileIcon className="mr-2" />
            File Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {fileListLoading ? (
            <div className="flex items-center text-indigo-600">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Loading files...</span>
            </div>
          ) : fileListError ? (
            <span className="text-red-500">{fileListError}</span>
          ) : fileList && fileList.length > 0 ? (
            <Select onValueChange={setSelectedFile} value={selectedFile || undefined}>
              <SelectTrigger className="w-full border-indigo-300 focus:ring-indigo-500">
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
          ) : (
            <span className="text-indigo-600">No files available</span>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white shadow-lg rounded-lg overflow-hidden border-t-4 border-teal-500">
        <CardHeader className="bg-teal-50 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl text-teal-700">Data Table</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreate} className="flex items-center bg-teal-500 text-white hover:bg-teal-600">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New
            </Button>
            {selectedRows.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center bg-red-500 hover:bg-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Selected ({selectedRows.length})
              </Button>
            )}
            <Button
              onClick={handleSave}
              className="flex items-center bg-indigo-500 text-white hover:bg-indigo-600"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Data
            </Button>
            <Sheet open={isAnalysisDrawerOpen} onOpenChange={setIsAnalysisDrawerOpen}>
              <SheetTrigger asChild>
                <Button className="flex items-center bg-purple-500 text-white hover:bg-purple-600">
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
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : data.length > 0 ? (
            <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>}>
              <DataTable
                    columns={columns}
                    data={data}
                    onRowSelectionChange={setSelectedRows}
                    filterkey={""} />
            </Suspense>
          ) : (
            <p className="text-teal-600">No data available. Please select a file or upload a new one.</p>
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