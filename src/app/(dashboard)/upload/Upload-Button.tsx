// import React, { useRef, useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Upload } from 'lucide-react';
// import Papa from 'papaparse';
// import * as XLSX from 'xlsx';

// type Props = {
//     onUpload: (results: any) => void;
// };

// const UploadButton: React.FC<Props> = ({ onUpload }) => {
//     const [file, setFile] = useState<File | null>(null);
//     const fileInputRef = useRef<HTMLInputElement>(null);

//     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//         const selectedFile = event.target.files?.[0] || null;
//         setFile(selectedFile);
//         if (selectedFile) {
//             handleUpload(selectedFile);
//         }
//     };

//     const handleUpload = async (uploadedFile: File) => {
//         const fileType = uploadedFile.name.split('.').pop()?.toLowerCase();

//         if (fileType === 'csv') {
//             const fileReader = new FileReader();
            
//             fileReader.onload = () => {
//                 const csvData = fileReader.result as string;
//                 Papa.parse(csvData, {
//                     header: true,
//                     skipEmptyLines: true,
//                     complete: (results) => {
//                         onUpload(results.data);
//                     },
//                 });
//             };
//             fileReader.readAsText(uploadedFile);
//         } else if (fileType === 'xlsx') {
//             const fileReader = new FileReader();
            
//             fileReader.onload = (e) => {
//                 const binaryStr = e.target?.result;
//                 const workbook = XLSX.read(binaryStr, { type: 'binary' });
//                 const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//                 const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
                
//                 if (data.length > 0) {
//                     const headers = data[0] as string[];
//                     const rows = data.slice(1);
                    
//                     const processedData = rows.map((row: unknown[]) => {
//                         const obj: { [key: string]: unknown } = {};
//                         headers.forEach((header, index) => {
//                             obj[header] = row[index];
//                         });
//                         return obj;
//                     });
                    
//                     onUpload(processedData);
//                 } else {
//                     console.error('No data found in the Excel file');
//                 }
//             };
//             fileReader.readAsBinaryString(uploadedFile);
//         } else {
//             console.error('Unsupported file type');
//         }
//     };

//     const handleButtonClick = () => {
//         fileInputRef.current?.click();
//     };

//     return (
//         <div>
//             <input 
//                 ref={fileInputRef}
//                 type="file" 
//                 accept=".csv, .xlsx" 
//                 onChange={handleFileChange} 
//                 style={{ display: 'none' }}
//             />
//             {/* <Button
//                 size="sm"
//                 className="w-full lg:w-auto"
//                 onClick={handleButtonClick}
//             >
//                 <Upload className="size-4 mr-2" />
//                 Import
//             </Button> */}
//         </div>
//     );
// };

// export default UploadButton;