"use client"
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { Upload, FileText, Loader2, Trash, ArrowUpRight, FileSpreadsheet, Files, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileData {
  [key: string]: unknown;
}

const CSVUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUser();
  const { toast } = useToast();

    useEffect(() => {
    if (user) {
      fetchFileList();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (!user) {
      setError('User not authenticated.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      await axios.post(`http://localhost:5000/upload/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({
        title: 'Success',
        description: 'File uploaded successfully!',
        duration: 3000,
      });
      fetchFileList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchFileList = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<{ files: string[] }>(`http://localhost:5000/list_files/${user.id}`);
      setFileList(response.data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      await axios.delete(`http://localhost:5000/delete_file/${user.id}/${filename}`);
      toast({
        title: 'Success',
        description: 'File deleted successfully!',
        duration: 3000,
      });
      fetchFileList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCSV = async (filename: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`http://localhost:5000/get_file/${user?.id}/${filename}`, {
        responseType: 'blob'
      });

      const file = new File([response.data], filename);
      await processFile(file);

    } catch (err) {
      console.error("Error processing file:", err);
      setError('Failed to process CSV data');
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (uploadedFile: File) => {
    const fileType = uploadedFile.name.split('.').pop()?.toLowerCase();

    if (fileType === 'csv') {
      const fileReader = new FileReader();

      fileReader.onload = (e: ProgressEvent<FileReader>) => {
        const csvData = e.target?.result as string;
        Papa.parse<FileData>(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            onUpload(results.data);
          },
        });
      };
      fileReader.readAsText(uploadedFile);
    } else if (fileType === 'xlsx') {
      const fileReader = new FileReader();

      fileReader.onload = (e: ProgressEvent<FileReader>) => {
        const binaryStr = e.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (data.length > 0) {
          const headers = data[0] as string[];
          const rows = data.slice(1);

          const processedData = rows.map((row: unknown[]) => {
            const obj: FileData = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

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

  const onUpload = async (dataToUpload: FileData[]) => {
    if (dataToUpload.length > 0) {
      try {
        const response = await fetch("/api/upload-csv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToUpload),
        });
        if (!response.ok) {
          throw new Error("Failed to upload CSV data");
        }
        const responseData = await response.json();
        toast({
          title: 'Success',
          description: responseData.message,
          duration: 3000,
        });
      } catch (error) {
        console.error("Error uploading CSV data:", error);
        setError("Failed to upload CSV data");
      }
    }
  };
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center">
        <Database className="w-8 h-8 mr-2 text-blue-500" />
        CSV Uploader
      </h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <Input
            type="file"
            accept=".csv, .xlsx"
            onChange={handleFileChange}
            className="flex-grow"
          />
          <Button
            onClick={uploadFile}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{loading ? 'Uploading...' : 'Upload'}</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
          <FileSpreadsheet className="w-6 h-6 mr-2 text-green-500" />
          Uploaded Files
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : fileList.length > 0 ? (
          <ul className="space-y-2">
            {fileList.map((filename, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <div className="flex items-center space-x-3">
                  {filename.endsWith('.csv') ? (
                    <Files className="w-5 h-5 text-green-500" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                  )}
                  <span className="text-sm font-medium text-gray-700">{filename}</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseCSV(filename)}
                    className="flex items-center space-x-1 text-blue-600"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Use File</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteFile(filename)}
                    className="flex items-center space-x-1 text-red-600"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Delete</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-8 flex items-center justify-center">
            <FileText className="w-5 h-5 mr-2 text-gray-400" />
            No files uploaded yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default CSVUpload;