"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import UploadButton from "./Upload-Button";
import { ColumnDef, Row } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";
import { useUser } from '@clerk/nextjs';
import { Trash, Loader2, Save } from "lucide-react";
import axios from 'axios';
import { handleUseCSV } from "@/features/sqlite/api/file-content";
import useFilesList from "@/features/sqlite/api/file-list";

interface DataItem {
  id: string;
  [key: string]: unknown;
}

const DataTablePage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef<DataItem, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Row<DataItem>[]>([]);
  const { user } = useUser();
  const { fileList, error: fileListError, loading: fileListLoading } = useFilesList(user?.id);

  useEffect(() => {
    if (fileList && fileList.length > 0 && !selectedFile) {
      setSelectedFile(fileList[0]);
    }
  }, [fileList, selectedFile]);

  useEffect(() => {
    if (selectedFile) {
      fetchFileData(selectedFile);
    }
  }, [selectedFile]);

  const fetchFileData = async (filename: string) => {
    await handleUseCSV(
      filename,
      user?.id,
      setLoading,
      setError,
      processFetchedData
    );
  };

  const processFetchedData = (fetchedData: any[]) => {
    if (fetchedData.length > 0) {
      const dataWithId = addIdToData(fetchedData);
      const generatedColumns: ColumnDef<DataItem, any>[] = Object.keys(dataWithId[0]).map((key) => ({
        accessorKey: key,
        header: key,
      }));
      setColumns(generatedColumns);
      setData(dataWithId);
      if (generatedColumns.length > 0 && 'accessorKey' in generatedColumns[0]) {
        setFilterKey(generatedColumns[0].accessorKey as string);
      }
    }
  };

  const addIdToData = (data: any[]): DataItem[] => {
    return data.map((row, index) => ({
      id: row.id || `${index + 1}`,
      ...row
    }));
  };

  const onUpload = async (results: any[]) => {
    if (results.length > 0) {
      const dataWithId = addIdToData(results);
      processFetchedData(dataWithId);
      toast({
        title: "Success",
        description: "File processed successfully",
      });
    }
  };

  const handleDelete = () => {
    const selectedIds = selectedRows.map(row => row.original.id);
    setData(prevData => prevData.filter(item => !selectedIds.includes(item.id)));
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
        newContent: data
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

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10">
      {/* Navigation bar for file selection */}
      <div className="bg-white shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-lg font-semibold mr-4">Select File:</span>
              {fileListLoading ? (
                <span>Loading files...</span>
              ) : fileListError ? (
                <span className="text-red-500">{fileListError}</span>
              ) : (
                <select
                  value={selectedFile || ''}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="form-select block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {fileList?.map((file) => (
                    <option key={file} value={file}>
                      {file}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <UploadButton onUpload={onUpload} />
          </div>
        </div>
      </div>

      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">Data Table</CardTitle>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                className="flex items-center"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                Delete Selected ({selectedRows.length})
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              className="flex items-center"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Data
            </Button>
          </div>
        </CardHeader>
  
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : data.length > 0 ? (
            <>
              <select 
                value={filterKey} 
                onChange={(e) => setFilterKey(e.target.value)}
                className="mb-4 form-select block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {columns.map(col => 'accessorKey' in col ? (
                  <option key={col.accessorKey as string} value={col.accessorKey as string}>
                    {col.accessorKey as string}
                  </option>
                ) : null)}
              </select>

              <DataTable
                columns={columns}
                data={data}
                filterkey={filterKey}
                onRowSelectionChange={setSelectedRows}
              />
            </>
          ) : (
            <p>No data to display. Please select a file or upload a new one.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataTablePage;
