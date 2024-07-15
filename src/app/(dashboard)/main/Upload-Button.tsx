import React from 'react'
import { useCSVReader } from 'react-papaparse'

import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react';

type Props = {
    onUpload: (results: any) => void;
}

function UploadButton({onUpload}:Props) {
    const { CSVReader } = useCSVReader();
  return (
      <CSVReader onUploadAccepted={onUpload}>
          {({ getRootProps }:any)=>(
              <Button
                  size="sm"
                  className='w-full lg:w-auto'
                  {...getRootProps()}
              >
                  <Upload className="size-4 mr-2"/>
                  Import
              </Button>
          )}
   </CSVReader>
  )
}

export default UploadButton
