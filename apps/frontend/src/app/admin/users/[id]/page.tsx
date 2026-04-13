'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import type { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Loader2, User, CheckCircle2, X, KeyRound, ChevronDown, ArrowLeft } from 'lucide-react';
import {
    countries,
    getStatesForCountry,
    validatePostalCode,
    getCountryByName,
} from '@/lib/location-data';

import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';

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
        } catch (err: any) {
            toast.error(err.message || 'Failed to load user profile');
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
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload avatar');
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
            const updateData: any = {};

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
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
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
        } catch (err: any) {
            toast.error(err.message || 'Failed to reset password');
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

    const isActive = (profile as any).isActive ?? true;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/admin/users')}
                        className="h-9 w-9"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">
                        User Profile – {profile.name}
                    </h1>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                {/* Profile Details Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">Profile Details</h2>
                        <Badge className="capitalize text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">
                            {profile.role}
                        </Badge>
                        <Badge className={`text-xs border-0 ${isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
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
                            <Button variant="outline" size="sm" className="gap-1.5 text-sm font-medium">
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
                            className="w-28 h-28 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
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
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
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
                        />
                        <FloatingInput
                            label="Phone Number"
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                            className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                        />
                        <DatePicker
                            id="dateOfBirth"
                            label="Date of Birth *"
                            value={formData.dateOfBirth}
                            onChange={(iso) => setFormData({ ...formData, dateOfBirth: iso })}
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
                            />
                            <SearchableSelect
                                options={stateOptions}
                                value={formData.state}
                                onChange={(value) => setFormData({ ...formData, state: value })}
                                label="State / Region"
                                searchPlaceholder="Search states..."
                                disabled={!formData.country}
                            />
                        </div>

                        {/* Row: City + Postal Code */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FloatingInput
                                label="City"
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                            <FloatingInput
                                label="Postal Code"
                                id="postalCode"
                                value={formData.postalCode}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-8 pt-6 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 h-11"
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
            </div>

            {/* Password Reset Dialog */}
            <Dialog open={showPasswordReset} onOpenChange={setShowPasswordReset}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset User Password</DialogTitle>
                        <DialogDescription>
                            This will reset the password for {profile.name}. The user will receive a new temporary password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="outline" onClick={() => setShowPasswordReset(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={handleResetPassword}
                            disabled={isResettingPassword}
                        >
                            {isResettingPassword ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
