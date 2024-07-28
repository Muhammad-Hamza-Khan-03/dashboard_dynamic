//dropdown menu for edit items

"use client"

import React from 'react'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Edit, MoreHorizontal, Trash } from 'lucide-react'
import { useOpenAccount } from '@/features/accounts/hooks/use-open-account'
import { useDeleteAccount } from '@/features/accounts/api/use-delete-account'
import { UseConfirm } from '../../../../hooks/use-confirm'
type Props = {
    id:string,
}
const Actions = ({ id }: Props) => {

    const [ConfirmationDialog,Confirm] = UseConfirm(
        "Are you sure?",
        "Delete the item"
    )

    const deleteMutation = useDeleteAccount(id);
    const { onOpen } = useOpenAccount();


    const handleDelete = async () => {
        const ok = await Confirm();
        if (ok)
        {
            deleteMutation.mutate();
        }
    }
  return (
      <>
          <ConfirmationDialog />
          <DropdownMenu>
              <DropdownMenuTrigger >
                  <Button variant="ghost" className='size-8 p-0'>
                      <MoreHorizontal className='size-4' />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                      disabled={deleteMutation.isPending}
                      onClick={() => onOpen(id)}
                  >
                      <Edit className="size-4 mr-2" />
                      Edit
                  </DropdownMenuItem>
                     <DropdownMenuItem
                      disabled={deleteMutation.isPending}
                      onClick={handleDelete}
                  >
                      <Trash className="size-4 mr-2" />
                      Delete
                  </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
    </>
  )
}

export default Actions
