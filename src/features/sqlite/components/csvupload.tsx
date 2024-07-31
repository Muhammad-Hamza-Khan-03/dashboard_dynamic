"use client";
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CSVUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileList, setFileList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { user } = useUser();

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

  const handleUpload = async () => {
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
    setSuccess(null);

    try {
      await axios.post(`http://localhost:5000/upload/${user.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess('File uploaded successfully!');
      fetchFileList();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileList = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`http://localhost:5000/list_files/${user.id}`);
      setFileList(response.data.files);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (filename: string) => {
    if (!user) return;
    window.location.href = `http://localhost:5000/get_file/${user.id}/${filename}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">CSV Uploader</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="flex-grow"
          />
          <Button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{loading ? 'Uploading...' : 'Upload CSV'}</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="mt-4 bg-green-50 text-green-700 border-green-200">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Uploaded Files</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : fileList.length > 0 ? (
          <ul className="space-y-2">
            {fileList.map((filename, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{filename}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadFile(filename)}
                  className="flex items-center space-x-1"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-8">No files uploaded yet.</p>
        )}
      </div>
    </div>
  );
};

export default CSVUpload;