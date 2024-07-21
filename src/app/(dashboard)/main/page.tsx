"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Plus } from "lucide-react";
import React, { useState, useEffect } from "react";
import { DataTable } from "@/components/data-table";
import UploadButton from "./Upload-Button";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";

type DataItem = {
  [x: string]: any;
  id: string | number;
  name: string;
  age: number;
  email: string;
};

const sampleData: DataItem[] = [
  { id: 1, name: "John Doe", age: 28, email: "john@example.com" },
  { id: 2, name: "Jane Smith", age: 34, email: "jane@example.com" },
  { id: 3, name: "Sam Johnson", age: 45, email: "sam@example.com" },
];

const sampleColumns: ColumnDef<DataItem>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
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
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age" },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
];

const MainPage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>(sampleData);
  const [columns, setColumns] = useState<ColumnDef<DataItem>[]>(sampleColumns);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/get-csv-data");
      if (!response.ok) {
        throw new Error("Failed to fetch CSV data");
      }
      const fetchedData = await response.json();
      if (fetchedData.length > 0) {
        const generatedColumns: ColumnDef<DataItem>[] = Object.keys(fetchedData[0]).map((key) => ({
          accessorKey: key,
          header: key,
        }));
        setColumns([
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={
                  table.getIsAllPageRowsSelected() ||
                  (table.getIsSomePageRowsSelected() && "indeterminate")
                }
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
        setData(fetchedData);
      }
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

  const onUpload = async (results: DataItem[]) => {
    if (results.length > 0) {
      const generatedColumns: ColumnDef<DataItem>[] = Object.keys(results[0]).map((key) => ({
        accessorKey: key,
        header: key,
      }));
      setColumns([
        {
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
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
      setData(results);

      // Send data to API route
      try {
        const response = await fetch("/api/upload-csv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(results),
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
            <DataTable
              columns={columns}
              filterkey=""
              disabled={false}
              onDelete={handleDelete}
              data={data}
            />
          ) : (
            <p>No data to display. Please upload a CSV file.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MainPage;
