"use client"
import { Button } from "@/components/ui/button"
import {Card,CardContent,CardHeader, CardTitle} from "@/components/ui/card"
import { Plus } from "lucide-react"
import React from 'react'
import { DataTable } from "@/components/data-table"
import { columns,Payment } from "../accounts/columns"
import UploadButton from "./Upload-Button"

const data:Payment[] = [
  {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@example.com",
    },
]
const INITIAL_IMPORT_RESULTS = {
  data: [],
  errors: [],
  meta:{}
}
function MainPage() {
  const onUpload = (results: typeof INITIAL_IMPORT_RESULTS) => {
    <h1>File Uploaded</h1>
  }
  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">
    Accounts page
          </CardTitle> 

          <div className="flex items-center gap-x-2">
          <Button size={"sm"}>
            <Plus className="size-4 mr-2">
              Add New
            </Plus> 
                  </Button>
                  <UploadButton onUpload={onUpload} />
        </div>
        </CardHeader>
        <CardContent>
          <DataTable
            filterkey="email"
            columns={columns}
            data={data} />
        </CardContent>
      </Card>
    </div>
  )
}

export default MainPage
