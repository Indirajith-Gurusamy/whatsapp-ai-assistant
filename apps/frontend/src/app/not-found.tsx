import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="rounded-full bg-orange-100 p-4 dark:bg-orange-900/30">
          <FileQuestion className="h-10 w-10 text-orange-500" />
        </div>
        <div className="space-y-2">
          <p className="text-6xl font-bold text-gray-900 dark:text-gray-100">
            404
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Page Not Found
          </h1>
          <p className="max-w-md text-sm text-gray-500 dark:text-gray-400">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
