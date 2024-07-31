'use client'
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import FileList from '../../../features/sqlite/components/filelist';
import FileViewer from '../../../features/sqlite/components/fileviewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import axios from 'axios';

const HomePage = () => {
  const { user } = useUser();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const userId = user ? user.id : '';

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (userId) {
      setSelectedFile(null);
    } else {
      alert('User ID not available');
    }
  };

  const addIdToData = (data: any[]): any[] => {
    return data.map((row, index) => ({
      id: row.id || `${index + 1}`,
      ...row
    }));
  };

  const processFetchedData = (fetchedData: any[]) => {
    if (fetchedData.length > 0) {
      const dataWithId = addIdToData(fetchedData);
      const generatedColumns: any[] = Object.keys(dataWithId[0]).map((key) => ({
        accessorKey: key,
        header: ({ column }: any) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {key}
          </Button>
        ),
      }));
      setColumns([
        {
          id: "select",
          header: ({ table }: any) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value: boolean) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }: any) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
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

  const onUpload = async (dataToUpload: any[]) => {
    if (dataToUpload.length > 0) {
      const dataWithId = addIdToData(dataToUpload);
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

  const fetchCSVData = async (filename: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/get_file/${userId}/${filename}`, {
        responseType: 'blob'
      });
      const blob = response.data;
      const file = new File([blob], filename);

      handleUpload(file); // Call handleUpload with the fetched file
    } catch (error) {
      console.error("Error fetching CSV data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch CSV data",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async (uploadedFile: File) => {
    const fileType = uploadedFile.name.split('.').pop()?.toLowerCase();

    if (fileType === 'csv') {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const csvData = fileReader.result as string;
        Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processFetchedData(results.data);
            onUpload(results.data);
          },
        });
      };
      fileReader.readAsText(uploadedFile);
    } else if (fileType === 'xlsx') {
      const fileReader = new FileReader();

      fileReader.onload = (e) => {
        const binaryStr = e.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (data.length > 0) {
          const headers = data[0] as string[];
          const rows = data.slice(1);

          const processedData = rows.map((row: unknown[]) => {
            const obj: { [key: string]: unknown } = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

          processFetchedData(processedData);
          onUpload(processedData);
        } else {
          console.error('No data found in the Excel file');
        }
      };
      fileReader.readAsBinaryString(uploadedFile);
    } else {
      console.error('Unsupported file type');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">CSV File Viewer</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-4">
              <label htmlFor="userId" className="font-medium text-gray-700">User ID:</label>
              <Input
                type="text"
                id="userId"
                value={userId}
                readOnly
                className="flex-grow bg-gray-100"
              />
            </div>
            <Button type="submit" className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Load Files</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {userId && !selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle>Available Files</CardTitle>
          </CardHeader>
          <CardContent>
            <FileList userId={userId} onSelectFile={handleFileSelect} />
          </CardContent>
        </Card>
      )}

      {selectedFile && userId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>File Viewer: {selectedFile}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="mt-4" onClick={() => fetchCSVData(selectedFile)}>
              Use CSV
            </Button>
            <FileViewer userId={userId} filename={selectedFile} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomePage;
