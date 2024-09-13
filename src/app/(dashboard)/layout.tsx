
import Header from '@/components/header';
import React from 'react'
import { Toaster } from "@/components/ui/toaster"
type Props = {
    children: React.ReactNode;
}
export default function DashboardLayout({children}:Props) {
    return (
        <>
            <Header />
            <main className='px-3 lg:px-14'>
                {children}
                <Toaster />
            </main></>
  )
}

