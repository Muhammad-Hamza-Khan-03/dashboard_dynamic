import axios from "axios";
import { toast } from "@/components/ui/use-toast";

interface FileData {
  [key: string]: unknown;
}

export const handleUseCSV = async (
  filename: string,
  userId: string|undefined,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  onUpload: (data: FileData[]) => void
) => { 
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(`http://localhost:5000/get_file/${userId}/${filename}`, {
      responseType: 'json'
    });
    
    const processedData = response.data;

    if (processedData.length === 0) {
      throw new Error("No data found in the file");
    }

    onUpload(processedData);

  } catch (err) {
    console.error("Error processing file:", err);
    setError(err instanceof Error ? err.message : 'Failed to process file data');
    toast({
      title: 'Error',
      description: 'Failed to process file data',
      duration: 3000,
    });
  } finally {
    setLoading(false);
  }
};

export type { FileData };