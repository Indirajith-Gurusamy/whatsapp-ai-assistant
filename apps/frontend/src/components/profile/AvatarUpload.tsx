'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';

interface AvatarUploadProps {
    currentAvatar?: string;
    onUpload: (file: File) => Promise<void>;
    isUploading?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AvatarUpload({ currentAvatar, onUpload, isUploading = false }: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Invalid file type. Please upload JPG, PNG, GIF, or WEBP');
            return;
        }

        // Validate file size
        if (file.size > MAX_SIZE) {
            setError('File too large. Maximum size is 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        onUpload(file).catch((err) => {
            setError(err.message || 'Upload failed');
            setPreview(null);
        });
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const avatarUrl = preview || (currentAvatar ? `${API_BASE_URL}${currentAvatar}` : null);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-lg">
                    {avatarUrl ? (
                        <Image
                            src={avatarUrl}
                            alt="Profile avatar"
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Upload overlay */}
                <div
                    onClick={handleClick}
                    className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all cursor-pointer flex items-center justify-center"
                >
                    <svg
                        className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>

                {isUploading && (
                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
            />

            <button
                onClick={handleClick}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isUploading ? 'Uploading...' : 'Change Avatar'}
            </button>

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                JPG, PNG, GIF or WEBP. Max 5MB.
            </p>
        </div>
    );
}
