import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import axios from 'axios';

interface FileDisplayProps {
  fileId: string;
  userId: string;
  fileName: string;
  onDataLoad: (data: any[], columns: string[]) => void;
  onError: (error: string) => void;
}

const FileViewer: React.FC<FileDisplayProps> = ({
  fileId,
  userId,
  fileName,
  onDataLoad,
  onError,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension;
  };

  const fetchFileData = useCallback(async () => {
    if (!userId || !fileId) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/get-file/${userId}/${fileId}`,
        {
          params: {
            page: currentPage,
            page_size: pageSize,
          }
        }
      );

      if (!response.data) {
        throw new Error('No data received from server');
      }

      const fileData = response.data;
      
      if (fileData.type === 'structured') {
        // Handle structured data (CSV, Excel, DB)
        const data = fileData.data || [];
        const columns = fileData.columns || [];
        onDataLoad(data, columns);
      } else if (fileData.type === 'unstructured') {
        // Handle unstructured data (PDF, TXT)
        const content = fileData.content || '';
        const lines = content.split('\n').map((line: string, index: number) => ({
          id: index,
          content: line
        }));
        const columns = ['id', 'content'];
        onDataLoad(lines, columns);
      }
    } catch (error) {
      console.error('Error fetching file data:', error);
      onError(error instanceof Error ? error.message : 'Failed to fetch file data');
      toast({
        title: "Error",
        description: "Failed to load file content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, fileId, currentPage, pageSize, onDataLoad, onError]);

  useEffect(() => {
    fetchFileData();
  }, [fetchFileData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-500">
            Displaying {getFileType(fileName)} file
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFileData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileViewer;