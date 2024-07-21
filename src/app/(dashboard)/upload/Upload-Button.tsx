import React from 'react';
import { useCSVReader } from 'react-papaparse';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

type Props = {
    onUpload: (results: any) => void;
};

const UploadButton: React.FC<Props> = ({ onUpload }) => {
    const { CSVReader } = useCSVReader();
    return (
        <CSVReader
            onUploadAccepted={(results: any) => {
                onUpload(results.data);
            }}
            config={{
                header: true,
                skipEmptyLines: true,
            }}
        >
            {({ getRootProps }: any) => (
                <Button
                    size="sm"
                    className="w-full lg:w-auto"
                    {...getRootProps()}
                >
                    <Upload className="size-4 mr-2" />
                    Import
                </Button>
            )}
        </CSVReader>
    );
};

export default UploadButton;