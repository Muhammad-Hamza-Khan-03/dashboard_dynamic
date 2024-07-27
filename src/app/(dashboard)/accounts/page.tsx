"use client"
import { Button } from "@/components/ui/button"
import {Card,CardContent,CardHeader, CardTitle} from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"
import React from 'react'
import { columns } from "./columns"
import { DataTable } from "@/components/data-table"
import { useNewAccount } from "@/providers/account/use-new-account"
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts"
import {Skeleton} from "@/components/ui/skeleton"
import { useBulkDeleteAccount } from "@/features/accounts/api/use-bulk-delete"

function AccountsPage() {
  const newAccount = useNewAccount();
  const deleteAccounts = useBulkDeleteAccount();
  const accountsQuery = useGetAccounts();
  const accounts = accountsQuery.data || [];

  const isDisabled =
    accountsQuery.isLoading || deleteAccounts.isPending;
  
  if (accountsQuery.isLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
        <Card className="border-none drop-shadow-sm">
          <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-8 w-48" />
            
          </CardHeader>
          <CardContent>
            <div className="h-[500px] w-full flex items-center justify-center">
              <Loader2 className="size-6 text-slate-300 animate-spin" />
            </div>
          </CardContent>
        </Card>
    </div>
    )
  }
  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 -mt-24">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="gap-y-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-xl line-clamp-1">
    Accounts page
          </CardTitle> 
          <Button onClick={newAccount.onOpen} size="sm" >
        
            <Plus className="size-4 mr-2" />
              Add New
           
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            onDelete={(row) => {
              const ids = row.map((r) => r.original.id);
              deleteAccounts.mutate({ ids });
            } }
            //disabled implement later
            disabled={isDisabled}
            filterkey="name"
            columns={columns}
            data={accounts} />
        </CardContent>
      </Card>
      {/* <h1>Accounts Page</h1> */} 
    </div>
  )
}

export default AccountsPage
