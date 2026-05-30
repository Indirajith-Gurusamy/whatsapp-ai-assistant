import type {
    Conversation,
    ConversationDetail,
    Analytics,
    Customer,
    Message,
    ConversationHistory,
    UserProfile,
    Task,
    TaskDetail,
    CreateTaskPayload,
    UpdateTaskPayload,
} from '@/types';
import { apiFetch, API_BASE_URL } from '@/lib/api-error';

export { apiFetch, ApiError } from '@/lib/api-error';
export { tokenStorage } from '@/lib/token-storage';

export interface SignupData {
    name: string;
    email: string;
    password: string;
    role?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: {
        id: number;
        email: string;
        name: string;
        role: string;
        isActive: boolean;
        emailVerified: boolean;
        mustChangePassword: boolean;
    };
    tokens: {
        access_token: string;
        refresh_token: string;
        token_type: string;
    };
}

export interface Session {
    id: number;
    deviceType: string | null;
    browser: string | null;
    browserVersion: string | null;
    os: string | null;
    ipAddress: string | null;
    location: string | null;
    lastActivity: string;
    createdAt: string;
    isCurrent: boolean;
}

export interface SessionListResponse {
    sessions: Session[];
    total: number;
}



export const authApi = {
    async signup(data: SignupData): Promise<{ message: string }> {
        return apiFetch<{ message: string }>(`${API_BASE_URL}/api/v1/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            showToast: false,
        });
    },

    async login(data: LoginData): Promise<AuthResponse> {
        return apiFetch<AuthResponse>(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            showToast: false,
        });
    },

    async checkEmailAvailability(email: string): Promise<{ available: boolean; needs_verification: boolean }> {
        return apiFetch<{ available: boolean; needs_verification: boolean }>(
            `${API_BASE_URL}/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,
            { showToast: false }
        );
    },

    async verifyEmail(email: string, otp: string): Promise<void> {
        await apiFetch(`${API_BASE_URL}/api/v1/auth/verify-email?email=${encodeURIComponent(email)}&otp=${otp}`, {
            method: 'POST',
            showToast: false,
        });
    },

    async resendOtp(email: string): Promise<void> {
        await apiFetch(`${API_BASE_URL}/api/v1/auth/resend-otp?email=${encodeURIComponent(email)}`, {
            method: 'POST',
            showToast: false,
        });
    },

    async forgotPassword(email: string): Promise<void> {
        await apiFetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            showToast: false,
        });
    },

    async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
        await apiFetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, new_password: newPassword }),
            showToast: false,
        });
    },

    async getSessions(): Promise<SessionListResponse> {
        return apiFetch<SessionListResponse>(`${API_BASE_URL}/api/v1/auth/sessions`, {
            showToast: false,
        });
    },

    async deleteSession(sessionId: number): Promise<void> {
        await apiFetch(`${API_BASE_URL}/api/v1/auth/sessions/${sessionId}`, {
            method: 'DELETE',
            showToast: false,
        });
    },

    async deleteAllSessions(): Promise<void> {
        await apiFetch(`${API_BASE_URL}/api/v1/auth/sessions/all`, {
            method: 'DELETE',
            showToast: false,
        });
    },

    async forceChangePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        return apiFetch<{ message: string }>(`${API_BASE_URL}/api/v1/auth/force-change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            }),
            showToast: false,
        });
    },
};

export interface AdminSignupData {
    name: string;
    email: string;
    password: string;
    admin_code: string;
}

export interface UserListItem {
    id: number;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
    mustChangePassword: boolean;
    lastLogin: string | null;
    createdAt: string;
}

export interface UserListResponse {
    users: UserListItem[];
    total: number;
    skip: number;
    limit: number;
}

export interface AdminStatsResponse {
    total_users: number;
    total_admins: number;
    total_active_users: number;
    total_verified_users: number;
}

export const adminApi = {
    async adminSignup(data: AdminSignupData): Promise<{ message: string }> {
        return apiFetch<{ message: string }>(`${API_BASE_URL}/api/v1/admin/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            showToast: false,
        });
    },

    async adminLogin(data: LoginData): Promise<AuthResponse> {
        return apiFetch<AuthResponse>(`${API_BASE_URL}/api/v1/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            showToast: false,
        });
    },

    async getAllUsers(skip = 0, limit = 50): Promise<UserListResponse> {
        return apiFetch<UserListResponse>(
            `${API_BASE_URL}/api/v1/admin/users?skip=${skip}&limit=${limit}`
        );
    },

    async changeUserRole(userId: number, role: string): Promise<{ message: string; user: UserListItem }> {
        return apiFetch<{ message: string; user: UserListItem }>(`${API_BASE_URL}/api/v1/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
    },

    async deleteUser(userId: number): Promise<{ message: string; deleted_user_id: number }> {
        return apiFetch<{ message: string; deleted_user_id: number }>(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
            method: 'DELETE',
        });
    },

    async getAdminStats(): Promise<AdminStatsResponse> {
        return apiFetch<AdminStatsResponse>(`${API_BASE_URL}/api/v1/admin/stats`);
    },

    async toggleUserStatus(userId: number, isActive: boolean): Promise<{ message: string; user: UserListItem }> {
        return apiFetch<{ message: string; user: UserListItem }>(`${API_BASE_URL}/api/v1/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: isActive }),
        });
    },

    async verifyUser(userId: number): Promise<{ message: string; user: UserListItem }> {
        return apiFetch<{ message: string; user: UserListItem }>(`${API_BASE_URL}/api/v1/admin/users/${userId}/verify`, {
            method: 'PUT',
        });
    },

    async resetUserPassword(userId: number): Promise<{ message: string }> {
        return apiFetch<{ message: string }>(`${API_BASE_URL}/api/v1/admin/users/${userId}/reset-password`, {
            method: 'POST',
        });
    },

    async getUserProfile(userId: number): Promise<UserProfile> {
        return apiFetch<UserProfile>(`${API_BASE_URL}/api/v1/admin/users/${userId}/profile`);
    },

    async updateUserProfile(userId: number, data: any): Promise<any> {
        return apiFetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async uploadUserAvatar(userId: number, file: File): Promise<{ message: string; avatar_url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch<{ message: string; avatar_url: string }>(`${API_BASE_URL}/api/v1/admin/users/${userId}/avatar`, {
            method: 'PATCH',
            body: formData,
            showToast: false,
        });
    },
};

export const profileApi = {
    async getUserProfile(): Promise<UserProfile> {
        return apiFetch<UserProfile>(`${API_BASE_URL}/api/v1/auth/users/me`);
    },

    async updateProfile(data: any): Promise<any> {
        return apiFetch(`${API_BASE_URL}/api/v1/auth/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async uploadAvatar(file: File): Promise<{ message: string; avatar_url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return apiFetch<{ message: string; avatar_url: string }>(`${API_BASE_URL}/api/v1/auth/users/me/avatar`, {
            method: 'PATCH',
            body: formData,
            showToast: false,
        });
    }
};

export interface DashboardStats {
    total_items: number;
    active_items: number;
    completed_items: number;
    recent_activity_count: number;
}

export interface DashboardActivity {
    id: number;
    type: string;
    customer_name: string;
    lead_status: string;
    last_message: string | null;
    timestamp: string;
    status: string;
}

export interface DashboardSummary {
    greeting: string;
    message: string;
}

export const dashboardApi = {
    async getStats(): Promise<DashboardStats> {
        return apiFetch<DashboardStats>(`${API_BASE_URL}/api/v1/dashboard/stats`);
    },

    async getActivity(limit?: number): Promise<DashboardActivity[]> {
        const params = limit ? `?limit=${limit}` : '';
        return apiFetch<DashboardActivity[]>(`${API_BASE_URL}/api/v1/dashboard/activity${params}`);
    },

    async getSummary(): Promise<DashboardSummary> {
        return apiFetch<DashboardSummary>(`${API_BASE_URL}/api/v1/dashboard/summary`);
    }
};



// Data fetching functions
export async function fetchConversations(limit = 50): Promise<Conversation[]> {
    return apiFetch<Conversation[]>(`${API_BASE_URL}/api/conversations?limit=${limit}`, { showToast: false });
}

export async function fetchConversationDetail(id: number): Promise<ConversationDetail> {
    return apiFetch<ConversationDetail>(`${API_BASE_URL}/api/conversation/${id}`);
}

export async function updateConversationStatus(id: number, status: string, comments?: string): Promise<any> {
    return apiFetch(`${API_BASE_URL}/api/conversation/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments }),
    });
}

export async function fetchAnalytics(): Promise<Analytics> {
    return apiFetch<Analytics>(`${API_BASE_URL}/api/analytics`, { showToast: false });
}

export async function fetchCustomers(limit = 50): Promise<Customer[]> {
    return apiFetch<Customer[]>(`${API_BASE_URL}/api/customers?limit=${limit}`, { showToast: false });
}

export async function fetchMessages(limit = 50): Promise<Message[]> {
    return apiFetch<Message[]>(`${API_BASE_URL}/api/messages?limit=${limit}`, { showToast: false });
}

export async function fetchCustomerHistory(phone: string): Promise<ConversationHistory[]> {
    return apiFetch<ConversationHistory[]>(`${API_BASE_URL}/api/customers/${encodeURIComponent(phone)}/history`);
}

export interface DashboardStats {
    total_items: number;
    active_items: number;
    completed_items: number;
    recent_activity_count: number;
}

export interface DashboardActivity {
    id: number;
    type: string;
    customer_name: string;
    lead_status: string;
    last_message: string | null;
    timestamp: string;
    status: string;
}

export interface DashboardSummary {
    greeting: string;
    message: string;
}

export const dashboardApi = {
    async getStats(): Promise<DashboardStats> {
        return apiFetch<DashboardStats>(`${API_BASE_URL}/api/v1/dashboard/stats`, { showToast: false });
    },

    async getActivity(limit: number = 10): Promise<DashboardActivity[]> {
        return apiFetch<DashboardActivity[]>(`${API_BASE_URL}/api/v1/dashboard/activity?limit=${limit}`, { showToast: false });
    },

    async getSummary(): Promise<DashboardSummary> {
        return apiFetch<DashboardSummary>(`${API_BASE_URL}/api/v1/dashboard/summary`, { showToast: false });
    }
};

export async function fetchCustomerByUuid(uuid: string): Promise<Customer> {
    return apiFetch<Customer>(`${API_BASE_URL}/api/customers/by-uuid/${uuid}`);
}

export async function fetchCustomerHistoryByUuid(uuid: string): Promise<ConversationHistory[]> {
    return apiFetch<ConversationHistory[]>(`${API_BASE_URL}/api/customers/by-uuid/${uuid}/history`);
}

export async function fetchConversationDetailByUuid(uuid: string): Promise<ConversationDetail> {
    return apiFetch<ConversationDetail>(`${API_BASE_URL}/api/conversation/by-uuid/${uuid}`);
}

export async function updateConversationStatusByUuid(uuid: string, status: string, comments?: string): Promise<any> {
    return apiFetch(`${API_BASE_URL}/api/conversation/by-uuid/${uuid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comments }),
    });
}

export async function assignLeadByUuid(uuid: string, userEmail: string): Promise<any> {
    return apiFetch(`${API_BASE_URL}/api/conversation/by-uuid/${uuid}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail }),
    });
}

export async function assignLead(id: number, userEmail: string): Promise<any> {
    return apiFetch(`${API_BASE_URL}/api/conversation/${id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail }),
    });
}

export async function toggleConversationAI(uuid: string, enabled: boolean): Promise<{ success: boolean; ai_enabled: boolean }> {
    return apiFetch<{ success: boolean; ai_enabled: boolean }>(`${API_BASE_URL}/api/conversation/by-uuid/${uuid}/ai-toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
    });
}

export async function sendAgentMessage(uuid: string, message: string): Promise<{ success: boolean; message_id: number }> {
    return apiFetch<{ success: boolean; message_id: number }>(`${API_BASE_URL}/api/conversation/by-uuid/${uuid}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
}

// ── Settings API ────────────────────────────────────

export interface CategorySettingsResponse {
    category: string;
    settings: Record<string, string>;
}

export interface TestResultResponse {
    success: boolean;
    message: string;
    details?: Record<string, any>;
}

export interface AuditLogEntry {
    id: string;
    admin_name: string;
    admin_email: string;
    action: string;
    category: string;
    old_value?: Record<string, any> | null;
    new_value?: Record<string, any> | null;
    created_at: string;
}

export interface AuditLogListResponse {
    logs: AuditLogEntry[];
    total: number;
    skip: number;
    limit: number;
}

export const settingsApi = {
    async getSettings(category: string): Promise<CategorySettingsResponse> {
        return apiFetch<CategorySettingsResponse>(
            `${API_BASE_URL}/api/v1/settings/${category}`
        );
    },

    async updateSettings(category: string, settings: Record<string, string>): Promise<CategorySettingsResponse> {
        return apiFetch<CategorySettingsResponse>(
            `${API_BASE_URL}/api/v1/settings/${category}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings }),
            }
        );
    },

    async testWhatsApp(accountId?: string): Promise<TestResultResponse> {
        const url = accountId
            ? `${API_BASE_URL}/api/v1/settings/test/whatsapp?account_id=${accountId}`
            : `${API_BASE_URL}/api/v1/settings/test/whatsapp`;
        return apiFetch<TestResultResponse>(url, { method: 'POST' });
    },

    async sendTestWhatsApp(data: { account_id?: string; phone_number: string; message: string; is_template?: boolean }): Promise<TestResultResponse> {
        return apiFetch<TestResultResponse>(
            `${API_BASE_URL}/api/v1/settings/test/whatsapp/send`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }
        );
    },

    async testAI(): Promise<TestResultResponse> {
        return apiFetch<TestResultResponse>(
            `${API_BASE_URL}/api/v1/settings/test/ai`,
            { method: 'POST' }
        );
    },

    async resetSettings(category: string): Promise<CategorySettingsResponse> {
        return apiFetch<CategorySettingsResponse>(
            `${API_BASE_URL}/api/v1/settings/reset/${category}`,
            { method: 'POST' }
        );
    },

    async getAuditLogs(skip = 0, limit = 50): Promise<AuditLogListResponse> {
        return apiFetch<AuditLogListResponse>(
            `${API_BASE_URL}/api/v1/settings/audit-logs?skip=${skip}&limit=${limit}`
        );
    },
};

// ── Tasks API ────────────────────────────────────────

export interface TaskListResponse {
    tasks: Task[];
    total: number;
    skip: number;
    limit: number;
}

export const tasksApi = {
    async getTasks(skip = 0, limit = 50, status?: string): Promise<TaskListResponse> {
        const url = status
            ? `${API_BASE_URL}/api/v1/tasks?skip=${skip}&limit=${limit}&status=${status}`
            : `${API_BASE_URL}/api/v1/tasks?skip=${skip}&limit=${limit}`;
        return apiFetch<TaskListResponse>(url);
    },

    async getTaskByUuid(uuid: string): Promise<TaskDetail> {
        return apiFetch<TaskDetail>(`${API_BASE_URL}/api/v1/tasks/${uuid}`);
    },

    async createTask(data: CreateTaskPayload): Promise<Task> {
        return apiFetch<Task>(`${API_BASE_URL}/api/v1/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async updateTask(uuid: string, data: UpdateTaskPayload): Promise<Task> {
        return apiFetch<Task>(`${API_BASE_URL}/api/v1/tasks/${uuid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async deleteTask(uuid: string): Promise<{ success: boolean; message: string }> {
        return apiFetch<{ success: boolean; message: string }>(`${API_BASE_URL}/api/v1/tasks/${uuid}`, {
            method: 'DELETE',
        });
    },

    async addTaskComment(
        taskUuid: string,
        content: string
    ): Promise<{ id: number; content: string; created_at: string }> {
        return apiFetch<{ id: number; content: string; created_at: string }>(
            `${API_BASE_URL}/api/v1/tasks/${taskUuid}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            }
        );
    },
};

