"use client"
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table";
import UploadButton from "./Upload-Button";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";

const MainPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<ColumnDef<any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState("");
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => { //get data from url()
    try {
      const response = await fetch("/api/get-csv-data");
      if (!response.ok) {
        throw new Error("Failed to fetch CSV data");
      }
      const fetchedData = await response.json();
      processFetchedData(fetchedData);
    } catch (error) {
      console.error("Error fetching CSV data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch CSV data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addIdToData = (data: any[]): any[] => { //id column to data
    return data.map((row, index) => ({
      id: row.id || `${index + 1}`,
      ...row
    }));
  };

  const processFetchedData = (fetchedData: any[]) => { //append id column
    if (fetchedData.length > 0) {
      const dataWithId = addIdToData(fetchedData);
      const generatedColumns: ColumnDef<any>[] = Object.keys(dataWithId[0]).map((key) => ({
        accessorKey: key,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {key}
            </Button>
          )
        },
      }));
      setColumns([
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          ),
          enableSorting: false,
          enableHiding: false,
        },
        ...generatedColumns,
      ]);
      setData(dataWithId);
    }
    
          
  };

  const onUpload = async (results: any[]) => {
    if (results.length > 0) {
      const dataWithId = addIdToData(results);
      processFetchedData(dataWithId);
      console.log(columns);
      try {
        const response = await fetch("/api/upload-csv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataWithId),
        });
        if (!response.ok) {
          throw new Error("Failed to upload CSV data");
        }
        const responseData = await response.json();
        toast({
          title: "Success",
          description: responseData.message,
        });
      } catch (error) {
        console.error("Error uploading CSV data:", error);
        toast({
          title: "Error",
          description: "Failed to upload CSV data",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = () => {
    setData((prevData) => prevData.filter((item) => !item.selected));
  };

  ///////////////////////////
  type ColumnDefWithPossibleAccessor = ColumnDef<any> & {
  accessorKey?: string;
  header?: string | ((props: any) => React.ReactNode);
};

const getColumnNames = (columns: ColumnDef<any, any>[]): string[] => {
  return columns.map((column) => {
    if ('accessorKey' in column) {
      return column.accessorKey as string;
    }
    if ('id' in column && typeof column.id === 'string') {
      return column.id;
    }
    if ('header' in column && typeof column.header === 'string') {
      return column.header;
    }
    // If none of the above, return undefined
    return undefined;
  }).filter((name): name is string => name !== undefined);
  };
  
  const columnNames = getColumnNames(columns);
  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">Data Table</CardTitle>
          <div className="flex items-center gap-x-2">
            <UploadButton onUpload={onUpload} />
            <Button variant="destructive" onClick={handleDelete}>Delete Selected</Button>
          </div>
        </CardHeader>
        <CardContent>

          {loading ? (
            <p>Loading...</p>
          ) : data.length > 0 ? (
              <>
                <select value={filterKey} onChange={(e) => setFilterKey(e.target.value)}>
                  {columnNames.map(name =>
                  (
                    <option key={name} value={name}>{name}</option>
                  )
                  )}
                </select>

                <DataTable
                  columns={columns}
                  data={data}
                  onDelete={() => { } }
                  filterkey={filterKey} /></>
              
          ): (
            <p>No data to display. Please upload a CSV file.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MainPage;