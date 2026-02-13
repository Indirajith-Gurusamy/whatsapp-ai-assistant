import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Toaster } from "@/components/ui/sonner";
import { AuthLayoutWrapper } from "@/components/layout/AuthLayoutWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatsApp AI Dashboard",
  description: "WhatsApp Messages & AI Responses Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ErrorBoundary>
          <AuthLayoutWrapper>
            {children}
          </AuthLayoutWrapper>
        </ErrorBoundary>
        <Toaster
          richColors
          position="top-right"
          duration={4000}
        />
      </body>
    </html>
  );
}
