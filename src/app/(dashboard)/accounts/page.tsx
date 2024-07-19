"use client"
import { Button } from "@/components/ui/button"
import {Card,CardContent,CardHeader, CardTitle} from "@/components/ui/card"
import { Plus } from "lucide-react"
import React from 'react'
import { columns,Payment } from "./columns"
import { DataTable } from "@/components/data-table"

const data:Payment[] = [
  {
      id: "728ed52f",
      amount: 100,
      status: "pending",
      email: "m@example.com",
  },
    {
      id: "728ed52f",
      amount: 0,
      status: "pending",
      email: "m@example.com",
  },
      {
      id: "728ed52f",
      amount: 10,
      status: "pending",
      email: "m@example.com",
    },
]
function AccountsPage() {
  // const newAccount = useNewAccount();
  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">
    Accounts page
          </CardTitle> 
          {/* <Button onClick={newAccount.onOpen} size={"sm"}>  later 3:33:00*/}
          <Button size={"sm"}>
            <Plus className="size-4 mr-2">
              Add New
            </Plus> 
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            onDelete={()=>{} }
            //disabled implement later
            disabled={false}
            filterkey="email"
            columns={columns}
            data={data} />
        </CardContent>
      </Card>
      {/* <h1>Accounts Page</h1> */} 
    </div>
  )
}

export default AccountsPage
