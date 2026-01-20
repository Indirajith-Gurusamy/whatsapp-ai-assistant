import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/hooks/useNotifications";
import { AuthLayoutWrapper } from "@/components/layout/AuthLayoutWrapper";

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
        <NotificationProvider>
          <AuthLayoutWrapper>
            {children}
          </AuthLayoutWrapper>
          <Toaster richColors position="top-right" />
        </NotificationProvider>
      </body>
    </html>
  );
}
