import axios from "axios";
import { toast } from "@/components/ui/use-toast";

interface FileData {
  [key: string]: unknown;
}

export const handleUseCSV = async (
filename: string, userId: string | undefined, setLoading: (loading: boolean) => void, setError: (error: string | null) => void, onUpload: (data: FileData[]) => void, sheet?: string, table?: string) => {
  setLoading(true);
  setError(null);

  try {
    console.log("Sending request to backend...");

    const response = await axios.get(`http://localhost:5000/get_file/${userId}/${filename}`, {
      responseType: 'text',
    });

    console.log("Raw Response Data:", response.data);

    const fileData = response.data;

    if (!fileData || fileData.trim() === '') {
      throw new Error("No data found in the file");
    }

    console.log("File Data:", fileData);

    // Parse the data (assuming it's CSV-like format from the backend)
    const rows = fileData.trim().split('\n');
    console.log("Data Rows:", rows);
    const headers = rows[0].split(',');
    console.log("Data Headers:", headers);
    const data: FileData[] = rows.slice(1).map((row: string) => {
      const values = row.split(',');
      const record: FileData = {};
      headers.forEach((header: string, index: number) => {
        record[header.trim()] = values[index] ? values[index].trim() : '';
      });
      return record;
    });

    console.log("Parsed Data:", data);

    if (data.length === 0) {
      throw new Error("No data found after parsing");
    }

    onUpload(data);
toast({
      title: 'File selected',
      description: 'Data Processed Successfully.',
      duration: 3000,
    });
    } catch (err) {
    console.error("Error processing file:", err);
    if (axios.isAxiosError(err)) {
      setError(`Network error: ${err.message}. Status: ${err.response?.status}`);
    } else {
      setError(err instanceof Error ? err.message : 'Failed to process file data');
    }
    toast({
      title: 'Error',
      description: 'Failed to process file data. Check console for details.',
      duration: 3000,
    });
  } finally {
    setLoading(false);
  }
};

export type { FileData };
