/**
 * User profile types
 */

export interface Location {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
}

export interface SocialLink {
    platform: string;
    url: string;
}

export interface UserProfile {
    id: number;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    bio?: string;
    phone?: string;
    location?: Location;
    dateOfBirth?: string; // ISO date string
    socialLinks?: SocialLink[];
    emailVerified: boolean;
    createdAt: string;
}

export interface UpdateProfileData {
    name?: string;
    email?: string;
    bio?: string;
    phone?: string;
    location?: Location;
    dateOfBirth?: string; // ISO date string
    socialLinks?: SocialLink[];
}
