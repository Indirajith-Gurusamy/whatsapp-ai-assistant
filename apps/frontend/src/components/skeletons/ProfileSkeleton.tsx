import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <Skeleton className="h-8 w-32" />
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                {/* Profile Details Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                </div>

                {/* Avatar */}
                <div className="mb-8">
                    <Skeleton className="w-28 h-28 rounded-xl" />
                </div>

                {/* Personal Information */}
                <div className="space-y-5">
                    {/* Row: Name + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Skeleton className="h-[52px] rounded-lg" />
                        <Skeleton className="h-[52px] rounded-lg" />
                    </div>

                    {/* Row: Email + Date of Birth */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Skeleton className="h-[52px] rounded-lg" />
                        <Skeleton className="h-[52px] rounded-lg" />
                    </div>

                    {/* Address Section */}
                    <div className="pt-4 border-t">
                        <Skeleton className="h-6 w-24 mb-4" />

                        {/* Row: Country + State */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <Skeleton className="h-[52px] rounded-lg" />
                            <Skeleton className="h-[52px] rounded-lg" />
                        </div>

                        {/* Row: City + Postal Code */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Skeleton className="h-[52px] rounded-lg" />
                            <Skeleton className="h-[52px] rounded-lg" />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-8 pt-6 border-t">
                    <Skeleton className="h-11 w-32" />
                </div>
            </div>
        </div>
    );
}
