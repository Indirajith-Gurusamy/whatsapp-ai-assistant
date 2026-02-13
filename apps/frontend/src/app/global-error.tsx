"use client";

import { Inter } from "next/font/google";
import { AlertTriangle } from "lucide-react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-white dark:bg-gray-950`}>
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Something went wrong
              </h1>
              <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
                {error.message || "A critical error occurred. Please try again."}
              </p>
            </div>
            <button
              onClick={() => reset()}
              className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
