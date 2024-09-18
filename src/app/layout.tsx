import type { Metadata } from "next";
import { Inter } from "next/font/google";

import {
  ClerkProvider,
  SignIn,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InsightAI Dashboard ",
  description: "Personalized Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
     
    <html lang="en">
        <body className={inter.className}>{children}</body>
        
      </html>
      </ClerkProvider>

  );
}
