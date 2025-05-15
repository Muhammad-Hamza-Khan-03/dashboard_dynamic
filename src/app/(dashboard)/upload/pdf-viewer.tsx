import React, { useEffect, useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFViewerProps {
  fileId: string;
  userId: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileId, userId }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create plugin instance
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  useEffect(() => {
    if (!fileId || !userId) return;

    setLoading(true);
    
    // Fetch file metadata to get PDF URL
    fetch(`http://localhost:5000/get-file/${userId}/${fileId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch file metadata');
        }
        return response.json();
      })
      .then(data => {
        if (data.pdf_url) {
          setPdfUrl(data.pdf_url);
        } else {
          setError('PDF URL not found in response');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching PDF:', err);
        setError(err.message);
        setLoading(false);
      });
    setLoading(false);
  }, [fileId, userId]);
  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-50 rounded-lg">
      Error loading PDF: {error}
    </div>;
  }

  if (!pdfUrl) {
    return <div className="text-gray-500 p-4">No PDF available to display</div>;
  }

  return (
    <div className="h-screen w-full">
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfUrl}
          plugins={[defaultLayoutPluginInstance]}
        />
      </Worker>
    </div>
  );
};

export default PDFViewer;