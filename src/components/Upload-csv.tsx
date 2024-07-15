"use client"
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const FileDrop: React.FC<{ onFileDrop: (data: any) => void }> = ({ onFileDrop }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      Papa.parse(text, {
        header: true,
        complete: (results) => {
          onFileDrop(results.data);
        },
      });
    };
    reader.readAsText(file);
  }, [onFileDrop]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} style={{ border: '2px dashed #cccccc', padding: '20px', textAlign: 'center' }}>
      <input {...getInputProps()} />
      <p>Drop CSV file here, or click to select file</p>
    </div>
  );
};

export default FileDrop;
