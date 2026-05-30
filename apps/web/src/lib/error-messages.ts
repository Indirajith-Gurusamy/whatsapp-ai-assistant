/**
 * Centralized Error Messages
 *
 * All user-facing error messages live here so they can be managed in one place.
 * To add a new error, simply add a new key with { title, text }.
 *
 * Usage:
 *   import { ERROR_MESSAGES, getErrorMessage } from '@/lib/error-messages';
 *
 *   // Direct access
 *   toast.error(ERROR_MESSAGES.login.invalidCredentials.text);
 *
 *   // With helper (extracts message from unknown catch errors with fallback)
 *   toast.error(getErrorMessage(error, ERROR_MESSAGES.profile.loadFailed.text));
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ErrorEntry {
    title: string;
    text: string;
}

// ─── Error Messages ──────────────────────────────────────────────────────────

export const ERROR_MESSAGES = {

    // ── Network / Generic ────────────────────────────────────────────────────
    network: {
        connectionFailed: {
            title: 'Connection Error',
            text: 'Unable to connect to the server. Please check your internet connection.',
        },
        unexpectedError: {
            title: 'Unexpected Error',
            text: 'An unexpected error occurred. Please try again later.',
        },
        serverError: {
            title: 'Server Error',
            text: 'A server error occurred. Please try again later.',
        },
        sessionExpired: {
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
        },
        forbidden: {
            title: 'Access Denied',
            text: 'You do not have permission to perform this action.',
        },
        notFound: {
            title: 'Not Found',
            text: 'The requested resource was not found.',
        },
        tooManyRequests: {
            title: 'Too Many Requests',
            text: 'Too many requests. Please try again later.',
        },
    },

    // ── Auth / Login ─────────────────────────────────────────────────────────
    login: {
        invalidCredentials: {
            title: 'Login Failed',
            text: 'The email or password you entered is incorrect. Please try again.',
        },
        emailNotVerified: {
            title: 'Email Not Verified',
            text: 'Your email is not verified. Please verify your email to continue.',
        },
        accountDeactivated: {
            title: 'Account Deactivated',
            text: 'Your account has been deactivated. Please contact your administrator for assistance.',
        },
        genericFailure: {
            title: 'Login Failed',
            text: 'Login failed. Please try again.',
        },
    },

    // ── Admin Login ──────────────────────────────────────────────────────────
    adminLogin: {
        notAuthorized: {
            title: 'Not Authorized',
            text: 'You are not authorized to access the admin panel.',
        },
        invalidCredentials: {
            title: 'Invalid Credentials',
            text: 'Invalid email or password. Please try again.',
        },
        genericFailure: {
            title: 'Login Failed',
            text: 'Login failed. Please try again.',
        },
    },

    // ── Forgot Password ──────────────────────────────────────────────────────
    forgotPassword: {
        invalidEmail: {
            title: 'Invalid Email',
            text: 'Please enter a valid email address.',
        },
        noAccount: {
            title: 'Account Not Found',
            text: 'No account found with this email. Please check your email or contact your administrator.',
        },
        sendFailed: {
            title: 'Send Failed',
            text: 'Failed to send reset code. Please try again.',
        },
    },

    // ── Reset Password ───────────────────────────────────────────────────────
    resetPassword: {
        emailRequired: {
            title: 'Email Required',
            text: 'Please enter your email address.',
        },
        emailAgain: {
            title: 'Email Required',
            text: 'Please enter your email again.',
        },
        resendFailed: {
            title: 'Resend Failed',
            text: 'Failed to resend code.',
        },
    },

    // ── Email Verification ───────────────────────────────────────────────────
    verifyEmail: {
        emailNotProvided: {
            title: 'Email Missing',
            text: 'Email not provided.',
        },
        enterAllDigits: {
            title: 'Incomplete Code',
            text: 'Please enter all 6 digits.',
        },
        emailNotFound: {
            title: 'Email Not Found',
            text: 'Email not found.',
        },
        resendFailed: {
            title: 'Resend Failed',
            text: 'Failed to resend code. Please try again later.',
        },
        noAccount: {
            title: 'Account Not Found',
            text: 'No account found with this email. Please check and try again.',
        },
        connectionError: {
            title: 'Connection Error',
            text: 'Unable to connect. Please check your internet connection and try again.',
        },
    },

    // ── Profile ──────────────────────────────────────────────────────────────
    profile: {
        loadFailed: {
            title: 'Load Failed',
            text: 'Failed to load profile.',
        },
        updateFailed: {
            title: 'Update Failed',
            text: 'Failed to update profile.',
        },
        avatarInvalidType: {
            title: 'Invalid File',
            text: 'Please select an image file (JPG, PNG, GIF, WEBP).',
        },
        avatarTooLarge: {
            title: 'File Too Large',
            text: 'Image size must be less than 5MB.',
        },
        avatarUploadFailed: {
            title: 'Upload Failed',
            text: 'Failed to upload avatar.',
        },
        passwordUpdateFailed: {
            title: 'Password Update Failed',
            text: 'Failed to update password.',
        },
        passwordMismatch: {
            title: 'Password Mismatch',
            text: 'Passwords do not match.',
        },
        passwordSameAsCurrent: {
            title: 'Same Password',
            text: 'New password must be different from current password.',
        },
    },

    // ── Sessions ─────────────────────────────────────────────────────────────
    sessions: {
        loadFailed: {
            title: 'Load Failed',
            text: 'Failed to load sessions. Please try again.',
        },
        logoutFailed: {
            title: 'Logout Failed',
            text: 'Failed to logout session. Please try again.',
        },
        logoutAllFailed: {
            title: 'Logout Failed',
            text: 'Failed to logout all sessions. Please try again.',
        },
    },

    // ── Dashboard ────────────────────────────────────────────────────────────
    dashboard: {
        loadFailed: {
            title: 'Load Failed',
            text: 'Failed to load dashboard data.',
        },
    },

    // ── Conversations / Leads ────────────────────────────────────────────────
    conversations: {
        loadDetailsFailed: {
            title: 'Load Failed',
            text: 'Failed to load conversation details. Please try again.',
        },
        updateStatusFailed: {
            title: 'Update Failed',
            text: 'Failed to update status. Please try again.',
        },
        exportFailed: {
            title: 'Export Failed',
            text: 'Failed to generate export file.',
        },
        noDataToExport: {
            title: 'No Data',
            text: 'No data available to export.',
        },
        assignFailed: {
            title: 'Assign Failed',
            text: 'Failed to assign lead. Please try again.',
        },
        loadUsersFailed: {
            title: 'Load Failed',
            text: 'Failed to load users. Please try again.',
        },
        noUserSelected: {
            title: 'No User Selected',
            text: 'Please select a user.',
        },
    },

    // ── Admin / User Management ──────────────────────────────────────────────
    admin: {
        fetchUsersFailed: {
            title: 'Fetch Failed',
            text: 'Failed to fetch users.',
        },
        createUserFailed: {
            title: 'Create Failed',
            text: 'Failed to create user.',
        },
        deleteUserFailed: {
            title: 'Delete Failed',
            text: 'Failed to delete user.',
        },
        updateRoleFailed: {
            title: 'Update Failed',
            text: 'Failed to update role.',
        },
        toggleStatusFailed: {
            title: 'Update Failed',
            text: 'Failed to toggle user status.',
        },
        verifyUserFailed: {
            title: 'Verify Failed',
            text: 'Failed to verify user.',
        },
        bulkDeleteFailed: {
            title: 'Delete Failed',
            text: 'Failed to delete some users.',
        },
        resetPasswordFailed: {
            title: 'Reset Failed',
            text: 'Failed to reset password.',
        },
        noUsersSelected: {
            title: 'No Selection',
            text: 'No users selected for export.',
        },
    },

    // ── Validation ───────────────────────────────────────────────────────────
    validation: {
        nameTooShort: {
            title: 'Invalid Name',
            text: 'Name must be at least 2 characters.',
        },
        bioTooLong: {
            title: 'Bio Too Long',
            text: 'Bio must not exceed 500 characters.',
        },
        phoneInvalid: {
            title: 'Invalid Phone',
            text: 'Phone number must be between 10 and 15 digits.',
        },
        ageTooYoung: {
            title: 'Age Restriction',
            text: 'You must be at least 13 years old.',
        },
        invalidDate: {
            title: 'Invalid Date',
            text: 'Invalid date of birth.',
        },
        passwordTooShort: {
            title: 'Weak Password',
            text: 'Password must be at least 8 characters.',
        },
        passwordNoUppercase: {
            title: 'Weak Password',
            text: 'Password must contain an uppercase letter.',
        },
        passwordNoLowercase: {
            title: 'Weak Password',
            text: 'Password must contain a lowercase letter.',
        },
        passwordNoNumber: {
            title: 'Weak Password',
            text: 'Password must contain a number.',
        },
        passwordNoSpecial: {
            title: 'Weak Password',
            text: 'Password must contain a special character.',
        },
        passwordsDontMatch: {
            title: 'Mismatch',
            text: 'Passwords do not match.',
        },
        currentPasswordRequired: {
            title: 'Required',
            text: 'Current password is required.',
        },
    },

} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Safely extract a message from an unknown catch error,
 * falling back to the provided default message.
 *
 * @example
 *   catch (error: unknown) {
 *       toast.error(getErrorMessage(error, ERROR_MESSAGES.profile.loadFailed.text));
 *   }
 */
export function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}

/**
 * Safely extract an ErrorEntry-shaped object from an unknown catch error,
 * falling back to the provided ErrorEntry.
 *
 * @example
 *   catch (error: unknown) {
 *       const { title, text } = getErrorEntry(error, ERROR_MESSAGES.profile.loadFailed);
 *       toast.error(text, { description: title });
 *   }
 */
export function getErrorEntry(error: unknown, fallback: ErrorEntry): ErrorEntry {
    if (error instanceof Error && error.message) {
        return { title: fallback.title, text: error.message };
    }
    return fallback;
}
