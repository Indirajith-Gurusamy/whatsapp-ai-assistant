'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FloatingInput, type FloatingInputProps } from '@/components/ui/floating-input';
import { cn } from '@/lib/utils';

export function PasswordFloatingInput({ className, ...props }: FloatingInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <FloatingInput
                {...props}
                type={showPassword ? 'text' : 'password'}
                className={cn('pr-12', className)}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition z-10"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
        </div>
    );
}
