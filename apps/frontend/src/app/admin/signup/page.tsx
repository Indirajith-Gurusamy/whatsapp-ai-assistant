"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminSignupPage() {
    const router = useRouter();

    useEffect(() => {
        router.push("/login");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h1>
                <p className="text-gray-600">Admin signup is disabled. Redirecting to login.</p>
            </div>
        </div>
    );
}
