'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { UserProfile, UpdateProfilePayload } from '@/types';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Loader2, User, CheckCircle2, X, KeyRound, ChevronDown } from 'lucide-react';
import {
    countries,
    getStatesForCountry,
    validatePostalCode,
    getCountryByName,
} from '@/lib/location-data';

import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';
import { listPageCard, listPageFill, pageContentPad, pagePadX } from '@/components/settings/settings-layout';

const flatControlClass = 'rounded-none';
const flatBadgeClass = 'rounded-none';

export default function AdminUserProfilePage() {
    const router = useRouter();
    const params = useParams();
    const userId = Number(params.id);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        city: '',
        country: '',
        state: '',
        postalCode: '',
    });

    // Password reset dialog state
    const [showPasswordReset, setShowPasswordReset] = useState(false);

    // Derived state for dropdowns
    const countryOptions = countries.map(c => ({ value: c.name, label: c.name }));
    const stateOptions = formData.country
        ? getStatesForCountry(getCountryByName(formData.country)?.code || '').map(s => ({ value: s.name, label: s.name }))
        : [];

    useEffect(() => {
        if (userId) loadProfile();
    }, [userId]);

    // Reset state when country changes
    useEffect(() => {
        if (formData.country) {
            setFormData(prev => ({ ...prev, state: '', postalCode: '' }));
        }
    }, [formData.country]);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const data = await adminApi.getUserProfile(userId);
            setProfile(data);
            setFormData({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                dateOfBirth: data.dateOfBirth || '',
                city: data.location?.city || '',
                country: data.location?.country || '',
                state: data.location?.state || '',
                postalCode: data.location?.postalCode || '',
            });
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to load user profile'));
            router.push('/admin/users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const result = await adminApi.uploadUserAvatar(userId, file);
            setProfile(prev => prev ? { ...prev, avatar: result.avatar_url } : null);
            toast.success('Avatar updated successfully!');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to upload avatar'));
        } finally {
            setIsUploadingAvatar(false);
        }

        e.target.value = '';
    };

    const clearAvatar = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        // Validate postal code if provided
        if (formData.postalCode && formData.country) {
            const countryCode = getCountryByName(formData.country)?.code;
            if (countryCode) {
                const postalError = validatePostalCode(formData.postalCode, countryCode);
                if (postalError) {
                    toast.error(postalError);
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            const updateData: UpdateProfilePayload = {};

            if (formData.name?.trim()) updateData.name = formData.name.trim();
            if (formData.phone?.trim()) updateData.phone = formData.phone.trim();
            if (formData.dateOfBirth?.trim()) updateData.dateOfBirth = formData.dateOfBirth;

            if (formData.city || formData.country || formData.state || formData.postalCode) {
                updateData.location = {
                    city: formData.city?.trim() || null,
                    country: formData.country?.trim() || null,
                    state: formData.state?.trim() || null,
                    postalCode: formData.postalCode?.trim() || null,
                };
            }

            const updated = await adminApi.updateUserProfile(userId, updateData);
            setProfile(updated);
            toast.success('Profile updated successfully!');
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to update profile'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetPassword = async () => {
        setIsResettingPassword(true);
        try {
            await adminApi.resetUserPassword(userId);
            toast.success('Password reset successfully!');
            setShowPasswordReset(false);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err, 'Failed to reset password'));
        } finally {
            setIsResettingPassword(false);
        }
    };

    if (isLoading) {
        return <ProfileSkeleton />;
    }

    if (!profile) return null;

    const avatarSrc = profile.avatar?.startsWith('http') || profile.avatar?.startsWith('data:')
        ? profile.avatar
        : profile.avatar
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${profile.avatar}`
            : null;

    const isActive = profile.isActive ?? true;

    return (
        <div className={listPageFill}>
            <div className={listPageCard}>
                <div className={pageContentPad}>
                <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
                    <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {profile.name}
                    </h2>
                </div>
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge className={cn('border-0 bg-orange-100 text-xs capitalize text-orange-700 hover:bg-orange-100', flatBadgeClass)}>
                            {profile.role}
                        </Badge>
                        <Badge className={cn('border-0 text-xs', flatBadgeClass, isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100')}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {profile.emailVerified && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified</span>
                            </div>
                        )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 rounded-none text-sm font-medium">
                                Actions
                                <ChevronDown className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setShowPasswordReset(true)} className="cursor-pointer">
                                <KeyRound className="w-4 h-4 mr-2" />
                                Reset Password
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Avatar */}
                <div className="mb-8">
                    <div className="relative inline-block">
                        <div
                            className="h-28 w-28 cursor-pointer overflow-hidden border-2 border-gray-200 transition-opacity hover:opacity-90 dark:border-gray-700"
                            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
                        >
                            {isUploadingAvatar ? (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                                </div>
                            ) : avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    alt={profile.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <User className="w-12 h-12 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Remove button */}
                        {avatarSrc && !isUploadingAvatar && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearAvatar();
                                }}
                                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center bg-red-500 text-white shadow-md transition-colors hover:bg-red-600"
                                title="Change photo"
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
                </div>

                {/* Personal Information */}
                <div className="space-y-5">
                    {/* Row: Name + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FloatingInput
                            label="Full Name *"
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={flatControlClass}
                        />
                        <FloatingInput
                            label="Phone Number"
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className={flatControlClass}
                        />
                    </div>

                    {/* Row: Email + Date of Birth */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FloatingInput
                            label="Email"
                            id="email"
                            type="email"
                            value={formData.email}
                            readOnly
                            className={cn(flatControlClass, 'cursor-not-allowed bg-gray-50 dark:bg-gray-800')}
                        />
                        <DatePicker
                            id="dateOfBirth"
                            label="Date of Birth *"
                            value={formData.dateOfBirth}
                            onChange={(iso) => setFormData({ ...formData, dateOfBirth: iso })}
                            className={flatControlClass}
                        />
                    </div>

                    {/* Address Section */}
                    <div className="pt-4 border-t">
                        <h3 className="text-base font-semibold mb-4">Address</h3>

                        {/* Row: Country + State */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            <SearchableSelect
                                options={countryOptions}
                                value={formData.country}
                                onChange={(value) => setFormData({ ...formData, country: value })}
                                label="Country *"
                                searchPlaceholder="Search countries..."
                                showFlags
                                className={flatControlClass}
                            />
                            <SearchableSelect
                                options={stateOptions}
                                value={formData.state}
                                onChange={(value) => setFormData({ ...formData, state: value })}
                                label="State / Region"
                                searchPlaceholder="Search states..."
                                disabled={!formData.country}
                                className={flatControlClass}
                            />
                        </div>

                        {/* Row: City + Postal Code */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FloatingInput
                                label="City"
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className={flatControlClass}
                            />
                            <FloatingInput
                                label="Postal Code"
                                id="postalCode"
                                value={formData.postalCode}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                className={flatControlClass}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-8 pt-6 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-11 rounded-none bg-orange-500 px-8 text-white hover:bg-orange-600"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>

            <ConfirmDialog
                open={showPasswordReset}
                onOpenChange={setShowPasswordReset}
                title="Reset user password?"
                description={
                    <>
                        This will reset the password for{' '}
                        <span className="font-medium text-foreground">{profile.name}</span>. The user will receive a new temporary password.
                    </>
                }
                confirmLabel="Reset Password"
                loadingLabel="Resetting..."
                isLoading={isResettingPassword}
                onConfirm={handleResetPassword}
            />
                </div>
            </div>
        </div>
    );
}
