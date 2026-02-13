'use client';

import React from 'react';
import { UserProfile } from '@/types/profile';
import { User, Mail, Phone, MapPin, Calendar, ExternalLink } from 'lucide-react';

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

    const avatarUrl = profile.avatar
        ? (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')
            ? profile.avatar
            : `${API_BASE_URL}${profile.avatar}`)
        : null;

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
                <button
                    onClick={onEdit}
                    className="px-5 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                    Edit Profile
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                {/* Avatar + Name */}
                <div className="flex items-start gap-5 mb-8">
                    <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shrink-0">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={profile.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <User className="w-10 h-10 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <div className="pt-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.name}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.emailVerified
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                {profile.emailVerified ? '✓ Verified' : 'Not Verified'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 capitalize">
                                {profile.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">Bio</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{profile.bio}</p>
                    </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {profile.phone && (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Phone className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="text-sm font-medium">{profile.phone}</p>
                            </div>
                        </div>
                    )}

                    {profile.location && (profile.location.city || profile.location.country) && (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <MapPin className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="text-sm font-medium">
                                    {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                                </p>
                            </div>
                        </div>
                    )}

                    {profile.dateOfBirth && (
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Date of Birth</p>
                                <p className="text-sm font-medium">{formatDate(profile.dateOfBirth)}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Member Since</p>
                            <p className="text-sm font-medium">{formatDate(profile.createdAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Social Links */}
                {profile.socialLinks && profile.socialLinks.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Social Links</h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.socialLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors capitalize"
                                >
                                    {link.platform}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
