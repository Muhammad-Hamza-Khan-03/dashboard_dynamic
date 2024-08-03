import axios from 'axios';
import { useState, useEffect } from 'react';

const useFilesList = (userId: string | undefined) => {
  const [fileList, setFileList] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCsvFiles = async () => {
      if (!userId) {
        setError('User ID is not available');
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get<{ files: string[] }>(`http://localhost:5000/list_files/${userId}`);
        setFileList(response.data.files);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCsvFiles();
  }, [userId]);

  return { fileList, error, loading };
};

export default useFilesList;
