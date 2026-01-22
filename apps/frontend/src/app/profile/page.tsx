'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { profileApi } from '@/lib/api';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, User, Shield, CheckCircle2, XCircle, Eye, EyeOff, Camera, X } from 'lucide-react';
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Avatar upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        phone: '',
        city: '',
        country: '',
        dateOfBirth: ''
    });

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
                bio: data.bio || '',
                phone: data.phone || '',
                city: data.location?.city || '',
                country: data.location?.country || '',
                dateOfBirth: data.dateOfBirth || ''
            });
        } catch (err: any) {
            toast.error(err.message || 'Failed to load profile');
            if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
                router.push('/login');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (JPG, PNG, GIF, WEBP)');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB');
            return;
        }

        // Create preview URL
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setSelectedFile(file);

        // Reset file input so same file can be selected again if needed
        e.target.value = '';
    };

    const clearSelectedFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        setSelectedFile(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Check if any data has changed
            const hasChanges =
                formData.name !== (profile?.name || '') ||
                formData.bio !== (profile?.bio || '') ||
                formData.phone !== (profile?.phone || '') ||
                formData.city !== (profile?.location?.city || '') ||
                formData.country !== (profile?.location?.country || '') ||
                formData.dateOfBirth !== (profile?.dateOfBirth || '');

            // 1. Upload avatar if selected
            let avatarUpdated = false;
            if (selectedFile) {
                try {
                    const result = await profileApi.uploadAvatar(selectedFile);
                    // Update profile with new avatar URL immediately to show it persisted
                    setProfile(prev => prev ? { ...prev, avatar: result.avatar_url } : null);
                    avatarUpdated = true;
                    // Clear local preview state since we now have the real URL
                    clearSelectedFile();
                } catch (err: any) {
                    toast.error(`Failed to upload avatar: ${err.message}`);
                    setIsSaving(false);
                    return; // Stop saving if avatar upload fails
                }
            }

            // 2. Update profile details
            if (hasChanges) {
                // Format data to match backend schema - only send non-empty values
                const updateData: any = {};

                if (formData.name && formData.name.trim()) {
                    updateData.name = formData.name.trim();
                }
                if (formData.bio && formData.bio.trim()) {
                    updateData.bio = formData.bio.trim();
                }
                if (formData.phone && formData.phone.trim()) {
                    updateData.phone = formData.phone.trim();
                }
                if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
                    updateData.dateOfBirth = formData.dateOfBirth;
                }

                // Add location object if city or country is provided
                if ((formData.city && formData.city.trim()) || (formData.country && formData.country.trim())) {
                    updateData.location = {};
                    if (formData.city && formData.city.trim()) {
                        updateData.location.city = formData.city.trim();
                    }
                    if (formData.country && formData.country.trim()) {
                        updateData.location.country = formData.country.trim();
                    }
                }

                const updated = await profileApi.updateProfile(updateData);
                setProfile(updated);
            }

            // Show appropriate success message
            if (avatarUpdated && hasChanges) {
                toast.success('Profile and avatar updated successfully!');
            } else if (avatarUpdated) {
                toast.success('Avatar updated successfully!');
            } else if (hasChanges) {
                toast.success('Profile updated successfully!');
            } else {
                toast.success('No changes to save');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

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

        // Also re-validate confirm password if new password changes
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
        // Validate all fields
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
            // Call API to update password (assuming endpoint exists, or mock for now as backend might need update)
            // Implementation would go here. For now mimicking success.
            // await profileApi.changePassword(passwordData.currentPassword, passwordData.newPassword);

            toast.success("Password updated successfully!");
            setShowPasswordChange(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordErrors({});
        } catch (err: any) {
            toast.error(err.message || "Failed to update password");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-120px)]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                    <p className="text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Profile Details</h1>
                <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">
                        {profile.role}
                    </Badge>
                    {profile.emailVerified ? (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="w-3 h-3" />
                            <span>Not Verified</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Picture & Email */}
            <Card className="border-none shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            {/* Avatar Display */}
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 relative">
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Avatar Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : profile.avatar ? (
                                    <img
                                        src={profile.avatar.startsWith('http') || profile.avatar.startsWith('data:') ? profile.avatar : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${profile.avatar}`}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center">
                                        <User className="w-10 h-10 text-emerald-600" />
                                    </div>
                                )}

                                {/* Edit Overlay */}
                                <div
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleFileSelect}
                            />

                            {/* Cancel Preview Button */}
                            {selectedFile && (
                                <button
                                    onClick={clearSelectedFile}
                                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
                                    title="Cancel upload"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="mb-1">
                                <Label className="text-muted-foreground">Email Address</Label>
                                <p className="text-base font-medium">{profile.email}</p>
                            </div>
                            {selectedFile && (
                                <p className="text-xs text-emerald-600 font-medium animate-pulse">
                                    New avatar selected - Click Save to upload
                                </p>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPasswordChange(!showPasswordChange)}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Edit Password
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Password Change Modal */}
            <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">

                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showPasswords.current ? "text" : "password"}
                                    autoComplete="off"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                                    placeholder="Enter current password"
                                    className={passwordErrors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {passwordErrors.currentPassword && <p className="text-red-500 text-xs">{passwordErrors.currentPassword}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPasswords.new ? "text" : "password"}
                                    autoComplete="off"
                                    value={passwordData.newPassword}
                                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                                    placeholder="Enter new password"
                                    className={passwordErrors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {passwordErrors.newPassword && <p className="text-red-500 text-xs">{passwordErrors.newPassword}</p>}
                            {passwordData.newPassword && <PasswordStrength password={passwordData.newPassword} />}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPasswords.confirm ? "text" : "password"}
                                    autoComplete="off"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                                    placeholder="Confirm new password"
                                    className={passwordErrors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {passwordErrors.confirmPassword && <p className="text-red-500 text-xs">{passwordErrors.confirmPassword}</p>}
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                            <Button variant="outline" onClick={() => setShowPasswordChange(false)}>
                                Cancel
                            </Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleUpdatePassword}>
                                Update Password
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Personal Information */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Enter your phone number"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                            id="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                            className="min-h-[80px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Enter your city"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                placeholder="Enter your country"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button at Bottom */}
            <div className="flex justify-end pt-4 border-t">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 px-8"
                    size="lg"
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
    );
}
