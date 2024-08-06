"use client"
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

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
  const [filterColumn, setFilterColumn] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState<string>("");
  const [numericFilters, setNumericFilters] = useState<Record<string, { min: number, max: number }>>({});

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
      console.log("Fetching file data for:", filename);
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
    console.log("Received data:", fetchedData);
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
      console.log("Generated columns:", generatedColumns);
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

  const handleSaveItem = () => {
    if (editItem) {
      setData(prevData => {
        if (editIndex !== null && editField) {
          // Update existing item
          return prevData.map((item, index) =>
            index === editIndex ? { ...item, [editField]: editItem[editField] } : item
          );
        } else {
          // Add new item
          return [...prevData, editItem as DataItem];
        }
      });
    }
    setIsSheetOpen(false);
    setEditItem(null);
    setEditIndex(null);
    setEditField(null);
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

  const getColumnStats = (columnKey: string) => {
    const values = data.map(item => item[columnKey]);
    const numericValues = values.filter(value => !isNaN(Number(value))).map(Number);

    return {
      uniqueCount: new Set(values).size,
      nonNullCount: values.filter(v => v !== null && v !== undefined && v !== "").length,
      dataType: getDataType(values),
      numericStats: numericValues.length > 0 ? {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      } : null,
      topValues: getTopValues(values),
    };
  };

  const getDataType = (values: any[]): string => {
    const types = new Set(values.map(v => typeof v));
    if (types.size === 1) return Array.from(types)[0];
    if (types.has("number") && types.has("string")) return "mixed (number/string)";
    return "mixed";
  };

const getTopValues = (values: any[]): { value: any, count: number }[] => {
  const counts = values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (Object.entries(counts) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count }));
};



  const getDataInfo = () => {
    return {
      rowCount: data.length,
      columnCount: columns.length,
      nullCount: data.reduce((acc, row) => {
        Object.values(row).forEach(value => {
          if (value === null || value === undefined || value === "") acc++;
        });
        return acc;
      }, 0),
    };
  };

  const handleFilterChange = (column: string) => {
    setFilterColumn(column);
    setFilterValue("");
  };

  const filteredData = useMemo(() => {
    let filtered = data;
    if (filterColumn && filterValue) {
      filtered = filtered.filter(item =>
        String(item[filterColumn]).toLowerCase().includes(filterValue.toLowerCase())
      );
    }
    Object.entries(numericFilters).forEach(([key, { min, max }]) => {
      filtered = filtered.filter(item => {
        const value = Number(item[key]);
        return value >= min && value <= max;
      });
    });
    return filtered;
  }, [data, filterColumn, filterValue, numericFilters]);

  const handleNumericFilterChange = (columnKey: string, min: number, max: number) => {
    setNumericFilters(prev => ({
      ...prev,
      [columnKey]: { min, max },
    }));
  };

  const resetFilters = () => {
    setFilterColumn(null);
    setFilterValue("");
    setNumericFilters({});
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center bg-white text-teal-600 border-teal-300 hover:bg-teal-50"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filter Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Select a column and enter a value to filter the data.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Select onValueChange={handleFilterChange} value={filterColumn || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(column =>
                          hasAccessorKey(column) ? (
                            <SelectItem key={column.accessorKey} value={column.accessorKey}>
                              {column.header as string}
                            </SelectItem>
                          ) : null
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Enter filter value"
                      value={filterValue}
                      onChange={e => setFilterValue(e.target.value)}
                    />
                  </div>
                  <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value="numeric-filters">
                      <AccordionTrigger>Numeric Filters</AccordionTrigger>
                      <AccordionContent>
                        {columns.map(column => {
                          if (hasAccessorKey(column) && getDataType(data.map(item => item[column.accessorKey])) === "number") {
                            const values = data.map(item => Number(item[column.accessorKey]));
                            const min = Math.min(...values);
                            const max = Math.max(...values);
                            return (
                              <div key={column.accessorKey} className="mb-4">
                                <Label>{column.header as string}</Label>
                                <Slider
                                  min={min}
                                  max={max}
                                  step={(max - min) / 100}
                                  value={[
                                    numericFilters[column.accessorKey]?.min || min,
                                    numericFilters[column.accessorKey]?.max || max,
                                  ]}
                                  onValueChange={([min, max]) => handleNumericFilterChange(column.accessorKey, min, max)}
                                />
                                <div className="flex justify-between text-sm mt-1">
                                  <span>{numericFilters[column.accessorKey]?.min || min}</span>
                                  <span>{numericFilters[column.accessorKey]?.max || max}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <Button className="w-full mt-4" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
                <SheetHeader>
                  <SheetTitle>Data Analysis</SheetTitle>
                  <SheetDescription>
                    Explore detailed information about your data.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="columns">Columns</TabsTrigger>
                      <TabsTrigger value="values">Top Values</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Data Information</h3>
                        {(() => {
                          const info = getDataInfo();
                          return (
                            <div className="grid grid-cols-2 gap-2">
                              <p>Rows: {info.rowCount}</p>
                              <p>Columns: {info.columnCount}</p>
                              <p>Null Values: {info.nullCount}</p>
                              <p>Non-Null Values: {info.rowCount * info.columnCount - info.nullCount}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </TabsContent>
                    <TabsContent value="columns">
                      <Accordion type="single" collapsible className="w-full">
                        {columns.map(column => {
                          if (hasAccessorKey(column)) {
                            const stats = getColumnStats(column.accessorKey);
                            return (
                              <AccordionItem key={column.accessorKey} value={column.accessorKey}>
                                <AccordionTrigger>{column.header as string}</AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2">
                                    <p>Data Type: {stats.dataType}</p>
                                    <p>Unique Values: {stats.uniqueCount}</p>
                                    <p>Non-Null Count: {stats.nonNullCount}</p>
                                    {stats.numericStats && (
                                      <>
                                        <p>Min: {stats.numericStats.min.toFixed(2)}</p>
                                        <p>Max: {stats.numericStats.max.toFixed(2)}</p>
                                        <p>Average: {stats.numericStats.avg.toFixed(2)}</p>
                                      </>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          }
                          return null;
                        })}
                      </Accordion>
                    </TabsContent>
                    <TabsContent value="values">
                      {columns.map(column => {
                        if (hasAccessorKey(column)) {
                          const topValues = getColumnStats(column.accessorKey).topValues;
                          return (
                            <div key={column.accessorKey} className="mb-4">
                              <h3 className="font-semibold">{column.header as string}</h3>
                              <ul className="list-disc pl-5">
                                {topValues.map(({ value, count }, index) => (
                                  <li key={index}>
                                    {String(value)} ({count} occurrences)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </TabsContent>
                  </Tabs>
                </div>
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
          ) : filteredData.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredData}
              filterkey={filterColumn || ""}
              onRowSelectionChange={setSelectedRows}
            />
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
