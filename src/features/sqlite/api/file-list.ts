import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Define the type that matches the file structure from your backend response
interface FileItem {
  file_id: string;
  filename: string;
  file_type: string;
  is_structured: boolean;
  created_at: string;
  unique_key:string;
  parent_file_id?:number;
}

const useFilesList = (userId: string | undefined) => {
  const [fileList, setFileList] = useState<FileItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchFiles = useCallback(async () => {
    if (!userId) {
      setError('User ID is not available');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get<{ files: FileItem[] }>(`http://localhost:5000/list_files/${userId}`);
      setFileList(response.data.files);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const refetch = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { fileList, error, loading, refetch };
};

export default useFilesList;