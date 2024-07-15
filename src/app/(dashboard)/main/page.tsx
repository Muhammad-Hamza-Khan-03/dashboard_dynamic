"use client"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import React, { useState } from 'react';
import { DataTable } from "@/components/data-table";
import UploadButton from "./Upload-Button";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "@/components/ui/use-toast";

type DataItem = Record<string, string | number>;

const MainPage: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef<DataItem>[]>([]);

  const onUpload = async (results: DataItem[]) => {
    if (results.length > 0) {
      const generatedColumns: ColumnDef<DataItem>[] = Object.keys(results[0]).map((key) => ({
        accessorKey: key,
        header: key,
      }));
      setColumns(generatedColumns);
      setData(results);

      // Send data to API route
      try {
        const response = await fetch('/api/upload-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(results),
        });

        if (!response.ok) {
          throw new Error('Failed to upload CSV data');
        }

        const responseData = await response.json();
        toast({
          title: "Success",
          description: responseData.message,
        });
      } catch (error) {
        console.error('Error uploading CSV data:', error);
        toast({
          title: "Error",
          description: "Failed to upload CSV data",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">
            Accounts page
          </CardTitle>
          <div className="flex items-center gap-x-2">
            {/* <Button size="sm">
              <Plus className="size-4 mr-2" />
              Add New
            </Button> */}
            <UploadButton onUpload={onUpload} />
          </div>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <DataTable
              columns={columns}
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