'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FolderOpen, FileText, Loader2 } from 'lucide-react';

interface FileListProps {
  userId: string;
  onSelectFile: (filename: string) => void;
}

const FileList: React.FC<FileListProps> = ({ userId, onSelectFile }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`http://localhost:5000/list_files/${userId}`);
        setFiles(response.data.files);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchFiles();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="ml-2 text-lg font-semibold text-gray-700">Loading files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FolderOpen className="w-16 h-16 mb-4" />
        <p className="text-lg font-semibold">No files found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-gray-100 px-4 py-3 border-b">
        <h2 className="text-lg font-semibold text-gray-800">Your Files</h2>
      </div>
      <ul className="divide-y divide-gray-200">
        {files.map((filename) => (
          <li key={filename} className="hover:bg-gray-50">
            <button
              onClick={() => onSelectFile(filename)}
              className="w-full px-4 py-3 flex items-center text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FileText className="w-5 h-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-700">{filename}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FileList;