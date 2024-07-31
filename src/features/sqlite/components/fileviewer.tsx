import { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

interface FileViewerProps {
  userId: string;
  filename: string;
}

// Define an interface for CSV row data
interface CSVRow {
  [key: string]: string | number; // Adjust as necessary for your CSV data
}

const FileViewer: React.FC<FileViewerProps> = ({ userId, filename }) => {
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCSVData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch the CSV file from Flask
        const response = await axios.get(`http://localhost:5000/get_file/${userId}/${filename}`, {
          responseType: 'blob',
        });

        // Parse the CSV file
        Papa.parse<CSVRow>(response.data, {
          header: true,
          complete: (results) => {
            setCsvData(results.data);
            setLoading(false);
          },
          error: (parseError) => {
            setError(parseError.message);
            setLoading(false);
          },
        });
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchCSVData();
  }, [userId, filename]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (csvData.length === 0) {
    return <p>No data available.</p>;
  }

  return (
    <div>
      <h2>CSV Data Viewer</h2>
      <table>
        <thead>
          <tr>
            {Object.keys(csvData[0]).map((key) => (
              <th key={key}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {csvData.map((row, index) => (
            <tr key={index}>
              {Object.values(row).map((value, colIndex) => (
                <td key={colIndex}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileViewer;
