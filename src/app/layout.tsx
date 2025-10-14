import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import SetRoleCookie from '@/components/auth/SetRoleCookie';
import AuthProvider from '@/components/auth/AuthProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SupplyChain DApp - Hyperledger Fabric",
  description: "Blockchain-powered supply chain traceability using Hyperledger Fabric",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <QueryProvider>
          <AuthProvider>
            <SetRoleCookie />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
