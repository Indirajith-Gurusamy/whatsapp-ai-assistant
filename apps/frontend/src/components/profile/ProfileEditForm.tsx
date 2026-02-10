'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile, UpdateProfileData, Location, SocialLink } from '@/types/profile';
import { profileApi } from '@/lib/api';
import { themeClasses } from '@/lib/theme';
import AvatarUpload from './AvatarUpload';

interface ProfileEditFormProps {
    initialProfile: UserProfile;
    onSave: (profile: UserProfile) => void;
    onCancel: () => void;
}

export default function ProfileEditForm({ initialProfile, onSave, onCancel }: ProfileEditFormProps) {
    const [formData, setFormData] = useState<UpdateProfileData>({
        name: initialProfile.name,
        bio: initialProfile.bio || '',
        phone: initialProfile.phone || '',
        location: initialProfile.location || { city: '', country: '' },
        dateOfBirth: initialProfile.dateOfBirth || '',
        socialLinks: initialProfile.socialLinks || []
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Name validation
        if (formData.name && formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Bio validation
        if (formData.bio && formData.bio.length > 500) {
            newErrors.bio = 'Bio must not exceed 500 characters';
        }

        // Phone validation
        if (formData.phone) {
            const cleaned = formData.phone.replace(/[^\d+]/g, '');
            if (cleaned.length < 10 || cleaned.length > 15) {
                newErrors.phone = 'Phone number must be between 10 and 15 digits';
            }
        }

        // Date of birth validation (age 13+)
        if (formData.dateOfBirth) {
            const birthDate = new Date(formData.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            const dayDiff = today.getDate() - birthDate.getDate();
            const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

            if (actualAge < 13) {
                newErrors.dateOfBirth = 'You must be at least 13 years old';
            }
            if (actualAge > 120) {
                newErrors.dateOfBirth = 'Invalid date of birth';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const updatedProfile = await profileApi.updateProfile(formData);
            setSuccess('Profile updated successfully!');
            setTimeout(() => {
                onSave(updatedProfile);
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        setIsUploadingAvatar(true);
        setError('');
        try {
            await profileApi.uploadAvatar(file);
            setSuccess('Avatar updated successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to upload avatar');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleAddSocialLink = () => {
        setFormData({
            ...formData,
            socialLinks: [...(formData.socialLinks || []), { platform: 'twitter', url: '' }]
        });
    };

    const handleRemoveSocialLink = (index: number) => {
        const newLinks = [...(formData.socialLinks || [])];
        newLinks.splice(index, 1);
        setFormData({ ...formData, socialLinks: newLinks });
    };

    const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
        const newLinks = [...(formData.socialLinks || [])];
        newLinks[index] = { ...newLinks[index], [field]: value };
        setFormData({ ...formData, socialLinks: newLinks });
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Edit Profile</h1>

                {/* Avatar Upload */}
                <div className="mb-8 flex justify-center">
                    <AvatarUpload
                        currentAvatar={initialProfile.avatar}
                        onUpload={handleAvatarUpload}
                        isUploading={isUploadingAvatar}
                    />
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className={`mb-6 p-4 ${themeClasses.bgPrimaryLight} dark:bg-orange-900/20 border ${themeClasses.borderPrimaryMedium} dark:border-orange-800 rounded-lg ${themeClasses.textPrimaryDark} dark:text-orange-200`}>
                        {success}
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Bio ({formData.bio?.length || 0}/500)
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tell us about yourself..."
                        />
                        {errors.bio && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.bio}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+1234567890"
                        />
                        {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                City
                            </label>
                            <input
                                type="text"
                                value={formData.location?.city || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    location: { ...formData.location, city: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Country
                            </label>
                            <input
                                type="text"
                                value={formData.location?.country || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    location: { ...formData.location, country: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.dateOfBirth}</p>}
                    </div>

                    {/* Social Links */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Social Links
                            </label>
                            <button
                                type="button"
                                onClick={handleAddSocialLink}
                                className="text-sm text-primary dark:text-primary/80 hover:underline"
                            >
                                + Add Link
                            </button>
                        </div>
                        <div className="space-y-3">
                            {formData.socialLinks?.map((link, index) => (
                                <div key={index} className="flex gap-2">
                                    <select
                                        value={link.platform}
                                        onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="twitter">Twitter</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="github">GitHub</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="website">Website</option>
                                    </select>
                                    <input
                                        type="url"
                                        value={link.url}
                                        onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSocialLink(index)}
                                        className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
