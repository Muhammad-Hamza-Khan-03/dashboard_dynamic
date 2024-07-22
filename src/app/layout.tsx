import type { Metadata } from "next";
import { Inter } from "next/font/google";

import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'

import "./globals.css";
import { SheetProvider } from "@/providers/sheet-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dashboard ",
  description: "Final Year Project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
    <SheetProvider />
        <body className={inter.className}>{children}</body>
        
      </html>
      </ClerkProvider>

  );
}
