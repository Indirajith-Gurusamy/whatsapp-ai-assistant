'use client';

import React from 'react';
import Image from 'next/image';
import { UserProfile } from '@/types/profile';

interface ProfileViewProps {
    profile: UserProfile;
    onEdit: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ProfileView({ profile, onEdit }: ProfileViewProps) {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const avatarUrl = profile.avatar ? `${API_BASE_URL}${profile.avatar}` : null;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32"></div>

                {/* Profile Content */}
                <div className="relative px-8 pb-8">
                    {/* Avatar */}
                    <div className="absolute -top-16 left-8">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-lg">
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={profile.name}
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
                    </div>

                    {/* Edit Button */}
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={onEdit}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profile
                        </button>
                    </div>

                    {/* Profile Info */}
                    <div className="mt-4 space-y-6">
                        {/* Name and Email */}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{profile.name}</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.email}</p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${profile.emailVerified
                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                        : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                                    }`}>
                                    {profile.emailVerified ? '✓ Verified' : 'Not Verified'}
                                </span>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                                    {profile.role}
                                </span>
                            </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About</h2>
                                <p className="text-gray-600 dark:text-gray-400">{profile.bio}</p>
                            </div>
                        )}

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Phone */}
                            {profile.phone && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{profile.phone}</p>
                                </div>
                            )}

                            {/* Location */}
                            {profile.location && (profile.location.city || profile.location.country) && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Location</h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Date of Birth */}
                            {profile.dateOfBirth && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Birth</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{formatDate(profile.dateOfBirth)}</p>
                                </div>
                            )}

                            {/* Member Since */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Member Since</h3>
                                <p className="text-gray-600 dark:text-gray-400">{formatDate(profile.createdAt)}</p>
                            </div>
                        </div>

                        {/* Social Links */}
                        {profile.socialLinks && profile.socialLinks.length > 0 && (
                            <div>
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Social Links</h2>
                                <div className="flex flex-wrap gap-3">
                                    {profile.socialLinks.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <span className="capitalize">{link.platform}</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
