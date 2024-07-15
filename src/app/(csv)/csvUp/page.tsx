"use client"
import React, { useState } from 'react';
import FileDrop from '@/components/Upload-csv';

const CsvUploader: React.FC = () => {
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileDrop = async (data: any) => {
    try {
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setUploadStatus('File uploaded successfully!');
      } else {
        setUploadStatus('Failed to upload file.');
      }
    } catch (error) {
      setUploadStatus('An error occurred.');
    }
  };

  return (
    <div>
      <FileDrop onFileDrop={handleFileDrop} />
      <p>{uploadStatus}</p>
    </div>
  );
};

export default CsvUploader;
