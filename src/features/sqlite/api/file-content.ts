import axios from "axios";
import { toast } from "@/components/ui/use-toast";

interface FileData {
  [key: string]: unknown;
}
interface TableInfo {
  id: string;
  name: string;
  full_name: string;
}

export const handleUseCSV = async (
  fileId: string,
  userId: string,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  onUpload: (data: FileData[]) => void,
  onTablesFound?: (tables: TableInfo[], fileType: string) => void 
) => {
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(`http://localhost:5000/get-file/${userId}/${fileId}`);
    const fileData = response.data;

    if (!fileData) {
      throw new Error("No data returned from server");
    }

    if (fileData.type === 'structured' && fileData.tables) {
      console.log("Found parent file with tables/sheets:", fileData.tables);
      
      // If callback for handling tables is provided, call it
      if (onTablesFound) {
        onTablesFound(fileData.tables, fileData.file_type);
        setLoading(false);
        return;
      } else {
        // If no callback is provided but we have tables, show toast message
        if (fileData.tables.length > 0) {
          toast({
            title: "Sheet selection required",
            description: `This ${fileData.file_type} file contains multiple sheets. Please select a specific sheet.`,
          });
          setLoading(false);
          return;
        }
      }
    }

    if (fileData.type === 'structured') {
      if (!fileData.data) {
        throw new Error("No data found in the file");
      }
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

export type { FileData,TableInfo };