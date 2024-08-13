
import CSVUpload from '@/features/sqlite/components/csvupload'
import React from 'react'

function FileUpload() {
  return (
    <>
      <CSVUpload onUploadSuccess={function (): void {
        throw new Error('Function not implemented.')
      } }/>
    
      </>
  )
}

export default FileUpload

