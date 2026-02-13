'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { profileApi } from '@/lib/api';
import type { UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { FloatingInput } from '@/components/ui/floating-input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Loader2, User, CheckCircle2, Eye, EyeOff, X, KeyRound, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getCountryOptions,
    getStateOptions,
    getCountryByName,
    validatePostalCode
} from '@/lib/location-data';

import { themeClasses } from '@/lib/theme';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Avatar upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country: '',
        state: '',
        postalCode: '',
        dateOfBirth: ''
    });

    // Form errors
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Password change state
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

    // Derived data
    const selectedCountry = getCountryByName(formData.country);
    const countryOptions = getCountryOptions();
    const stateOptions = selectedCountry ? getStateOptions(selectedCountry.code) : [];

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setIsLoading(true);
        try {
            const data = await profileApi.getUserProfile();
            setProfile(data);
            setFormData({
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                country: data.location?.country || '',
                state: data.location?.state || '',
                postalCode: data.location?.postalCode || '',
                dateOfBirth: data.dateOfBirth || ''
            });
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Country change handler ──────────────────────────
    const handleCountryChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            country: value,
            state: '',       // Reset state when country changes
            postalCode: ''   // Reset postal code when country changes
        }));
        setFormErrors(prev => {
            const { state, postalCode, ...rest } = prev;
            return rest;
        });
    };

    // ─── State change handler ────────────────────────────
    const handleStateChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            state: value,
            postalCode: ''  // Reset postal code when state changes
        }));
        setFormErrors(prev => {
            const { postalCode, ...rest } = prev;
            return rest;
        });
    };

    // ─── Postal code validation ──────────────────────────
    const handlePostalCodeChange = (value: string) => {
        setFormData(prev => ({ ...prev, postalCode: value }));

        if (selectedCountry && value.trim()) {
            const error = validatePostalCode(value, selectedCountry.code);
            if (error) {
                setFormErrors(prev => ({ ...prev, postalCode: error }));
            } else {
                setFormErrors(prev => {
                    const { postalCode, ...rest } = prev;
                    return rest;
                });
            }
        } else {
            setFormErrors(prev => {
                const { postalCode, ...rest } = prev;
                return rest;
            });
        }
    };

    // ─── Avatar handlers ─────────────────────────────────
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        // Show preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setSelectedFile(file);
        e.target.value = '';

        // Upload right away
        setIsUploadingAvatar(true);
        try {
            const result = await profileApi.uploadAvatar(file);
            setProfile(prev => prev ? { ...prev, avatar: result.avatar_url } : null);
            toast.success('Avatar updated successfully!');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
        } finally {
            // Clean up preview
            URL.revokeObjectURL(objectUrl);
            setPreviewUrl(null);
            setSelectedFile(null);
            setIsUploadingAvatar(false);
        }
    };

    const clearAvatar = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setSelectedFile(null);
    };

    // ─── Save handler ────────────────────────────────────
    const handleSave = async () => {
        // Validate postal code before saving
        if (selectedCountry && formData.postalCode.trim()) {
            const postalError = validatePostalCode(formData.postalCode, selectedCountry.code);
            if (postalError) {
                setFormErrors(prev => ({ ...prev, postalCode: postalError }));
                return;
            }
        }

        setIsSaving(true);
        try {
            const updateData: any = {};

            if (formData.name && formData.name.trim()) {
                updateData.name = formData.name.trim();
            }
            if (formData.email && formData.email.trim() && formData.email !== profile?.email) {
                updateData.email = formData.email.trim();
            }
            if (formData.phone && formData.phone.trim()) {
                updateData.phone = formData.phone.trim();
            }
            if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
                updateData.dateOfBirth = formData.dateOfBirth;
            }

            // Build location
            const hasLocation = formData.country || formData.state || formData.postalCode;
            if (hasLocation) {
                updateData.location = {};
                if (formData.country) updateData.location.country = formData.country;
                if (formData.state) updateData.location.state = formData.state;
                if (formData.postalCode) updateData.location.postalCode = formData.postalCode.trim();
            }

            const updated = await profileApi.updateProfile(updateData);
            setProfile(updated);
            toast.success('Profile updated successfully!');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Password handlers ───────────────────────────────
    const validatePasswordField = (name: string, value: string) => {
        if (name === 'newPassword') {
            if (value.length < 8) return "Password must be at least 8 characters";
            if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter";
            if (!/[a-z]/.test(value)) return "Password must contain a lowercase letter";
            if (!/[0-9]/.test(value)) return "Password must contain a number";
            if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value)) return "Password must contain a special character";
        }
        if (name === 'confirmPassword') {
            if (value !== passwordData.newPassword) return "Passwords do not match";
        }
        return "";
    };

    const handlePasswordChange = (name: string, value: string) => {
        setPasswordData(prev => ({ ...prev, [name]: value }));
        const error = validatePasswordField(name, value);
        setPasswordErrors(prev => ({ ...prev, [name]: error }));

        if (name === 'newPassword' && passwordData.confirmPassword) {
            if (passwordData.confirmPassword !== value) {
                setPasswordErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
            } else {
                setPasswordErrors(prev => {
                    const { confirmPassword, ...rest } = prev;
                    return rest;
                });
            }
        }
    };

    const handleUpdatePassword = async () => {
        const errors: Record<string, string> = {};
        if (!passwordData.currentPassword) errors.currentPassword = "Current password is required";

        const newPassError = validatePasswordField('newPassword', passwordData.newPassword);
        if (newPassError) errors.newPassword = newPassError;

        const confirmError = validatePasswordField('confirmPassword', passwordData.confirmPassword);
        if (confirmError) errors.confirmPassword = confirmError;

        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors);
            return;
        }

        try {
            toast.success("Password updated successfully!");
            setShowPasswordChange(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update password');
        }
    };

    // ─── Render ──────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 lg:p-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <Skeleton className="h-8 w-32" />
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
                    {/* Profile Details Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-6 w-36" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-9 w-24" />
                    </div>

                    {/* Avatar */}
                    <div className="mb-8">
                        <Skeleton className="w-28 h-28 rounded-xl" />
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-5">
                        {/* Row: Name + Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Skeleton className="h-[52px] rounded-lg" />
                            <Skeleton className="h-[52px] rounded-lg" />
                        </div>
                        {/* Row: Email + DOB */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Skeleton className="h-[52px] rounded-lg" />
                            <Skeleton className="h-[52px] rounded-lg" />
                        </div>

                        {/* Address Section */}
                        <div className="pt-4">
                            <Skeleton className="h-6 w-24 mb-4" />
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Skeleton className="h-[52px] rounded-lg" />
                                    <Skeleton className="h-[52px] rounded-lg" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Skeleton className="h-[52px] rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-8">
                        <Skeleton className="h-11 w-28 rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    const avatarSrc = previewUrl
        ? previewUrl
        : profile.avatar
            ? (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')
                ? profile.avatar
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${profile.avatar}`)
            : null;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
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
                            <DropdownMenuItem onClick={() => setShowPasswordChange(true)} className="cursor-pointer">
                                <KeyRound className="w-4 h-4 mr-2" />
                                Change Password
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

                {/* Form Fields */}
                <div className="space-y-5">
                    {/* Row: Name + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FloatingInput
                            id="name"
                            label="Full Name *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <FloatingInput
                            id="phone"
                            label="Phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    {/* Row: Email + Date of Birth */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FloatingInput
                            id="email"
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <DatePicker
                            id="dateOfBirth"
                            label="Date of Birth *"
                            value={formData.dateOfBirth}
                            onChange={(iso) => setFormData({ ...formData, dateOfBirth: iso })}
                        />
                    </div>

                    {/* Address Section */}
                    <div className="pt-4">
                        <h3 className="text-lg font-semibold mb-4">Address</h3>
                        <div className="space-y-5">
                            {/* Row: Country + State */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <SearchableSelect
                                    options={countryOptions}
                                    value={formData.country}
                                    onChange={handleCountryChange}
                                    label="Country"
                                    searchPlaceholder="Search countries..."
                                    emptyMessage="No country found."
                                    showFlags
                                />
                                <SearchableSelect
                                    options={stateOptions}
                                    value={formData.state}
                                    onChange={handleStateChange}
                                    label="State / Region"
                                    searchPlaceholder="Search states..."
                                    emptyMessage="No states available."
                                    disabled={!formData.country || stateOptions.length === 0}
                                />
                            </div>

                            {/* Postal Code */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <FloatingInput
                                    id="postalCode"
                                    label={`Postal Code${selectedCountry?.postalCodeExample ? ` (e.g. ${selectedCountry.postalCodeExample})` : ''}`}
                                    value={formData.postalCode}
                                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                                    error={formErrors.postalCode}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-8">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || Object.values(formErrors).some(e => e)}
                        className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-white px-8 h-11 font-semibold rounded-lg transition-all"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </div>
            </div>

            {/* Password Change Modal */}
            <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                            Enter your current password and a new password to update your account security.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <FloatingInput
                            id="currentPassword"
                            label="Current Password *"
                            type={showPasswords.current ? "text" : "password"}
                            autoComplete="one-time-code"
                            value={passwordData.currentPassword}
                            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                            error={passwordErrors.currentPassword}
                            endIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />
                        <FloatingInput
                            id="newPassword"
                            label="New Password *"
                            type={showPasswords.new ? "text" : "password"}
                            autoComplete="new-password"
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                            error={passwordErrors.newPassword}
                            endIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />
                        <FloatingInput
                            id="confirmPassword"
                            label="Confirm New Password *"
                            type={showPasswords.confirm ? "text" : "password"}
                            autoComplete="new-password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            error={passwordErrors.confirmPassword}
                            endIcon={
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t mt-4">
                        <Button variant="outline" onClick={() => setShowPasswordChange(false)}>
                            Cancel
                        </Button>
                        <Button className={themeClasses.btnPrimary} onClick={handleUpdatePassword}>
                            Update Password
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
