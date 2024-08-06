import axios from "axios";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { toast } from "@/components/ui/use-toast";

interface FileData {
  [key: string]: unknown;
}

export const handleUseCSV = async (
  filename: string,
  userId: string|undefined,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  onUpload: (data: FileData[]) => void,
  sheetNumber?: number
) => { 
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(`http://localhost:5000/get_file/${userId}/${filename}`, {
      responseType: 'blob'
    });

    const file = new File([response.data], filename);
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'xlsx' && sheetNumber !== undefined) {
      await processFile(file, sheetNumber, onUpload);
    } else {
      await processFile(file, undefined, onUpload);
    }

  } catch (err) {
    setError('Failed to process CSV data');
    toast({
      title: 'Error',
      description: 'Failed to process CSV data',
      duration: 3000,
    });
  } finally {
    setLoading(false);
  }
};

export const processFile = async (uploadedFile: File, sheetNumber: number | undefined, onUpload: (data: FileData[]) => void) => {
  const fileType = uploadedFile.name.split('.').pop()?.toLowerCase();

  if (fileType === 'csv') {
    const fileReader = new FileReader();

    fileReader.onload = (e: ProgressEvent<FileReader>) => {
      const csvData = e.target?.result as string;
      Papa.parse<FileData>(csvData, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onUpload(results.data);
          toast({
            title: 'Success',
            description: 'CSV file processed successfully!',
            duration: 3000,
          });
        },
      });
    };
    fileReader.readAsText(uploadedFile);
  } else if (fileType === 'xlsx') {
    const fileReader = new FileReader();

    fileReader.onload = (e: ProgressEvent<FileReader>) => {
      const binaryStr = e.target?.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });

      const sheetIndex = sheetNumber ? sheetNumber - 1 : 0; // Default to the first sheet if no sheetNumber is provided
      const sheetName = workbook.SheetNames[sheetIndex];

      if (sheetName) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        if (data.length > 0) {
          const headers = data[0] as string[];
          const rows = data.slice(1);

          const processedData = rows.map((row: unknown[]) => {
            const obj: FileData = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });

          onUpload(processedData);
          toast({
            title: 'Success',
            description: 'Excel file processed successfully!',
            duration: 3000,
          });
        } else {
          toast({
            title: 'Error',
            description: 'No data found in the Excel file',
            duration: 3000,
          });
        }
      } else {
        toast({
          title: 'Error',
          description: `Sheet number ${sheetNumber} does not exist in the Excel file`,
          duration: 3000,
        });
      }
    };
    fileReader.readAsBinaryString(uploadedFile);
  } else {
    toast({
      title: 'Error',
      description: 'Unsupported file type',
      duration: 3000,
    });
  }
};