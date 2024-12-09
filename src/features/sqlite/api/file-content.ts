import axios from "axios";
import { toast } from "@/components/ui/use-toast";

interface FileData {
  [key: string]: unknown;
}

export const handleUseCSV = async (
  fileId: string,
  userId: string,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  onUpload: (data: FileData[]) => void
) => {
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);
    const fileData = response.data;

    if (!fileData || !fileData.data) {
      throw new Error("No data found in the file");
    }

    if (fileData.type === 'structured') {
      // For structured data
      if (!fileData.columns) {
        throw new Error("No columns found in structured data");
      }
      const processedData = fileData.data.map((row: any) => {
        const processedRow: FileData = {};
        fileData.columns.forEach((column: string) => {
          processedRow[column] = row[column];
        });
        return processedRow;
      });
      onUpload(processedData);
    } else {
      // Handle unstructured data...
      const content = fileData.content;
      if (!content) {
        throw new Error("No content found in file");
      }
      onUpload([{ content }]);
    }
  } catch (err) {
    console.error("Error processing file:", err);
    setError(err instanceof Error ? err.message : 'Failed to process file data');
  } finally {
    setLoading(false);
  }
};

export type { FileData };