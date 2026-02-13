'use client';

import React, { useState } from 'react';
import { UserProfile, UpdateProfileData } from '@/types/profile';
import { profileApi } from '@/lib/api';
import { toast } from 'sonner';
import { User, X, Loader2 } from 'lucide-react';
import { FloatingInput } from '@/components/ui/floating-input';

interface ProfileEditFormProps {
    initialProfile: UserProfile;
    onSave: (profile: UserProfile) => void;
    onCancel: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const inputClass = "w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition";
const labelClass = "block text-sm text-gray-500 dark:text-gray-400 mb-1.5";

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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const avatarUrl = avatarPreview
        ? avatarPreview
        : initialProfile.avatar
            ? (initialProfile.avatar.startsWith('http') || initialProfile.avatar.startsWith('data:')
                ? initialProfile.avatar
                : `${API_BASE_URL}${initialProfile.avatar}`)
            : null;

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (formData.name && formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (formData.bio && formData.bio.length > 500) {
            newErrors.bio = 'Bio must not exceed 500 characters';
        }

        if (formData.phone) {
            const cleaned = formData.phone.replace(/[^\d+]/g, '');
            if (cleaned.length < 10 || cleaned.length > 15) {
                newErrors.phone = 'Phone number must be between 10 and 15 digits';
            }
        }

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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (JPG, PNG, GIF, WEBP)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setAvatarPreview(URL.createObjectURL(file));
        setAvatarFile(file);
        e.target.value = '';
    };

    const clearAvatar = () => {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        setAvatarFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            // Upload avatar if selected
            if (avatarFile) {
                try {
                    await profileApi.uploadAvatar(avatarFile);
                    clearAvatar();
                } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
                    setIsSubmitting(false);
                    return;
                }
            }

            const updatedProfile = await profileApi.updateProfile(formData);
            toast.success('Profile updated successfully!');
            onSave(updatedProfile);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setIsSubmitting(false);
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
        <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>

            {/* Main Content */}
            <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                    {/* Avatar */}
                    <div className="mb-8">
                        <div className="relative inline-block">
                            <div
                                className="w-28 h-28 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={initialProfile.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <User className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {(avatarFile || avatarUrl) && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); clearAvatar(); }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileSelect}
                            />
                        </div>
                        {avatarFile && (
                            <p className="text-xs text-orange-600 font-medium mt-2 animate-pulse">
                                New avatar selected — click Save to upload
                            </p>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        {/* Row: Name + Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FloatingInput
                                id="edit-name"
                                label="Name *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={errors.name}
                                required
                            />
                            <FloatingInput
                                id="edit-phone"
                                label="Phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                error={errors.phone}
                            />
                        </div>

                        {/* Row: Email (read-only) + Date of Birth */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FloatingInput
                                label="Email"
                                type="email"
                                value={initialProfile.email}
                                disabled
                            />
                            <FloatingInput
                                id="edit-dob"
                                label="Date of Birth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                error={errors.dateOfBirth}
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label htmlFor="edit-bio" className={labelClass}>
                                Bio ({formData.bio?.length || 0}/500)
                            </label>
                            <textarea
                                id="edit-bio"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                rows={3}
                                className={`${inputClass} h-auto min-h-[80px] resize-none ${errors.bio ? 'border-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Tell us about yourself..."
                            />
                            {errors.bio && <p className="mt-1 text-xs text-red-500">{errors.bio}</p>}
                        </div>

                        {/* Address Section */}
                        <div className="pt-4">
                            <h3 className="text-lg font-semibold mb-4">Address</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <FloatingInput
                                    id="edit-city"
                                    label="City"
                                    value={formData.location?.city || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        location: { ...formData.location, city: e.target.value }
                                    })}
                                />
                                <FloatingInput
                                    id="edit-country"
                                    label="Country"
                                    value={formData.location?.country || ''}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        location: { ...formData.location, country: e.target.value }
                                    })}
                                />
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="pt-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold">Social Links</h3>
                                <button
                                    type="button"
                                    onClick={handleAddSocialLink}
                                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
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
                                            className={`${inputClass} w-36 shrink-0`}
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
                                            className={`${inputClass} flex-1`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSocialLink(index)}
                                            className="px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-8">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-8 h-11 bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
