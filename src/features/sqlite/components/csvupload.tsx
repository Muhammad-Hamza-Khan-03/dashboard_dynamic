"use client"
import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CSVUploadProps {
  onUploadSuccess: () => void;
  triggerButton?: React.ReactNode;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onUploadSuccess, triggerButton }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleFileRemove = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0 || !user) return;

    setUploading(true);
    setUploadProgress(new Array(files.length).fill(0));

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);

        await axios.post(`http://localhost:5000/upload/${user.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
            setUploadProgress(prevProgress => {
              const newProgress = [...prevProgress];
              newProgress[i] = percentCompleted;
              return newProgress;
            });
          },
        });
      }

      toast({
        title: 'Success',
        description: 'Files uploaded successfully!',
        duration: 3000,
      });

      onUploadSuccess();
      setFiles([]);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error uploading files:", err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFiles([]);
      setUploadProgress([]);
    }
  };

  const uploadContent = (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Add new files</h2>
      {files.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Input
            type="file"
            accept=".csv,.xlsx"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">Drag & Drop or Choose files to upload</p>
              <p className="text-xs text-gray-400 mt-1">CSV or XLSX</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file, index) => (
            <div key={index} className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 text-xl">✓</span>
                  </div>
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleFileRemove(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {uploading && <Progress value={uploadProgress[index]} className="w-full" />}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-between items-center">
        <div>
          <Button variant="outline" className="mr-2" onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={uploadFiles} disabled={files.length === 0 || uploading}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {uploading ? 'Uploading...' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="flex items-center bg-blue-500 text-white hover:bg-blue-600">
            <Upload className="mr-2 h-4 w-4" />
            Upload Files
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Files</DialogTitle>
        </DialogHeader>
        {uploadContent}
      </DialogContent>
    </Dialog>
  );
};

export default CSVUpload;
