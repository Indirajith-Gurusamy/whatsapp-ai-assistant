// Frontend API client for WhatsApp CRM
// Handles all HTTP requests to the backend API

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}

export interface Customer {
  id: number;
  uuid: string;
  waId: string;
  phone: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: number;
  uuid: string;
  customerId: number;
  status: string;
  leadStatus: string;
  aiEnabled: boolean;
  comments?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  customer: Customer;
  messages: Message[];
}

export interface Message {
  id: number;
  conversationId: number;
  whatsappId?: string;
  message: string;
  role: string;
  timestamp: string;
  status: string;
}

export interface TaskListResponse {
  tasks: any[];
  total: number;
}

export interface DashboardStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  aiResponses: number;
  humanResponses: number;
  conversionRate: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  customerName?: string;
}

export interface DashboardSummary {
  greeting: string;
  summary: string;
}

export interface UserListItem {
  id: number;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface Session {
  id: number;
  userId: number;
  tokenHash: string;
  deviceType?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
}

export interface AuditLogEntry {
  id: string;
  adminUserId: number;
  action: string;
  category: string;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
  adminUser: User;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface AdminStatsResponse {
  total_users: number;
  total_admins: number;
  total_active_users: number;
  total_verified_users: number;
}

export interface ProfileResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  location: { city: string | null; country: string | null; state: string | null; postalCode: string | null } | null;
  dateOfBirth: string | null;
  socialLinks: any[] | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface UpdateAvatarResponse {
  message: string;
  avatar_url: string;
}

export interface ToggleStatusResponse {
  message: string;
  user: UserListItem;
}

export interface VerifyUserResponse {
  message: string;
  user: UserListItem;
}

export interface RoleChangeResponse {
  message: string;
  user: UserListItem;
}

export interface MessageResponse {
  message: string;
}

// API Response wrapper
interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

const getFieldLabel = (loc: unknown) => {
  if (!Array.isArray(loc)) return undefined;
  const field = loc.find(item => typeof item === 'string' && item !== 'body' && item !== 'query' && item !== 'path');
  return typeof field === 'string' ? capitalize(field) : undefined;
};

const normalizePydanticMessage = (fieldLabel: string | undefined, msg: string) => {
  let normalized = msg;

  if (/Input should be a valid string/i.test(msg)) {
    normalized = 'must be a valid string';
  } else if (/Field required/i.test(msg)) {
    normalized = 'is required';
  } else if (/value is not a valid email address/i.test(msg)) {
    normalized = 'must be a valid email address';
  }

  if (!fieldLabel) {
    return normalized;
  }

  if (/^(is|must|should)/i.test(normalized)) {
    return `${fieldLabel} ${normalized}`;
  }

  return `${fieldLabel}: ${normalized}`;
};

const normalizeErrorItem = (item: unknown): string => {
  if (typeof item === 'string') {
    return item;
  }

  if (!item || typeof item !== 'object') {
    return String(item);
  }

  const typed = item as Record<string, unknown>;

  if (typeof typed.msg === 'string') {
    const fieldLabel = getFieldLabel(typed.loc);
    return normalizePydanticMessage(fieldLabel, typed.msg);
  }

  const detail = typed.detail ?? typed.message ?? typed.error ?? typed.errors;
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map(normalizeErrorItem).join(', ');
  }

  return JSON.stringify(item);
};

const normalizeErrorMessage = (errorData: unknown, fallback: string) => {
  if (typeof errorData === 'string') {
    return errorData;
  }

  if (Array.isArray(errorData)) {
    return errorData.map(normalizeErrorItem).join(', ');
  }

  if (errorData && typeof errorData === 'object') {
    const typed = errorData as Record<string, unknown>;
    const detail = typed.detail ?? typed.message ?? typed.error ?? typed.errors;

    if (detail !== undefined) {
      return normalizeErrorMessage(detail, fallback);
    }

    return normalizeErrorItem(errorData);
  }

  return fallback;
};

// HTTP client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const isFormData = options.body instanceof FormData;
    const config: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
    };

    // Add auth token if available
    const token = tokenStorage.getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = normalizeErrorMessage(
          errorData,
          `HTTP ${response.status}`
        );
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL);

// Token storage utilities
export const tokenStorage = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  },

  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  },

  removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', token);
  },

  removeRefreshToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('refresh_token');
  },

  // Compatibility helpers used by auth context and other client code
  getAccessToken(): string | null {
    return this.getToken();
  },

  setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false): void {
    if (typeof window === 'undefined') return;
    this.setToken(accessToken);
    this.setRefreshToken(refreshToken);
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    this.removeToken();
    this.removeRefreshToken();
  },
};

// Auth API
export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', { email, password });
    if (response.tokens?.access_token) {
      tokenStorage.setToken(response.tokens.access_token);
      tokenStorage.setRefreshToken(response.tokens.refresh_token);
    }
    return response;
  },

  async signup(data: { name: string; email: string; password: string; role?: string }) {
    return apiClient.post('/api/v1/auth/signup', data);
  },

  async logout() {
    tokenStorage.removeToken();
    tokenStorage.removeRefreshToken();
  },

  async refreshToken() {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await apiClient.post<TokenResponse>('/api/v1/auth/refresh', {
      refresh_token: refreshToken,
    });

    if (response.access_token) {
      tokenStorage.setToken(response.access_token);
    }
    return response;
  },

  async verifyEmail(email: string, otp: string) {
    return apiClient.post(`/api/v1/auth/verify-email?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
  },

  async resendOtp(email: string) {
    return apiClient.post(`/api/v1/auth/resend-otp?email=${encodeURIComponent(email)}`);
  },

  async forgotPassword(email: string) {
    return apiClient.post('/api/v1/auth/forgot-password', { email });
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    return apiClient.post('/api/v1/auth/reset-password', {
      email,
      otp,
      new_password: newPassword,
    });
  },

  async forceChangePassword(currentPassword: string, newPassword: string) {
    return apiClient.post('/api/v1/auth/force-change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async getSessions(): Promise<SessionListResponse> {
    return apiClient.get('/api/v1/auth/sessions');
  },

  async deleteSession(sessionId: number) {
    return apiClient.delete(`/api/v1/auth/sessions/${sessionId}`);
  },

  async deleteAllSessions() {
    return apiClient.delete('/api/v1/auth/sessions/all');
  },
};

// Profile API
export const profileApi = {
  async getProfile(): Promise<ProfileResponse> {
    return apiClient.get('/api/v1/auth/users/me');
  },

  async getUserProfile(): Promise<ProfileResponse> {
    return apiClient.get('/api/v1/auth/users/me');
  },

  async updateProfile(data: any): Promise<ProfileResponse> {
    return apiClient.put('/api/v1/auth/users/me', data);
  },

  async uploadAvatar(file: File): Promise<UpdateAvatarResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.patch('/api/v1/auth/users/me/avatar', formData);
  },
};

// Conversations API
export const fetchConversations = async (limit = 50) => {
  return apiClient.get(`/api/conversations?limit=${limit}`);
};

export const fetchConversationDetailByUuid = async (uuid: string): Promise<any> => {
  return apiClient.get(`/api/conversation/by-uuid/${uuid}`);
};

export const updateConversationStatusByUuid = async (uuid: string, status: string, comments?: string) => {
  return apiClient.post(`/api/conversation/by-uuid/${uuid}/status`, { status, comments });
};

// Messages API
export const fetchMessages = async (limit = 50) => {
  return apiClient.get(`/api/messages?limit=${limit}`);
};

// Customers API
export const fetchCustomers = async (limit = 50): Promise<any[]> => {
  return apiClient.get(`/api/customers?limit=${limit}`);
};

export const fetchCustomerByUuid = async (uuid: string): Promise<any> => {
  return apiClient.get(`/api/customers/by-uuid/${uuid}`);
};

export const fetchCustomerHistoryByUuid = async (uuid: string): Promise<any> => {
  return apiClient.get(`/api/customers/by-uuid/${uuid}/history`);
};

export const toggleConversationAI = async (uuid: string, aiEnabled: boolean) => {
  return apiClient.put(`/api/conversation/by-uuid/${uuid}/ai-toggle`, { enabled: aiEnabled });
};

export const sendAgentMessage = async (uuid: string, message: string) => {
  return apiClient.post(`/api/conversation/by-uuid/${uuid}/send-message`, { message });
};

// Analytics API
export const fetchAnalytics = async () => {
  return apiClient.get('/api/analytics');
};

// Dashboard API
export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    return apiClient.get('/api/v1/dashboard/stats');
  },

  async getActivity(limit = 10): Promise<DashboardActivity[]> {
    return apiClient.get(`/api/v1/dashboard/activity?limit=${limit}`);
  },

  async getSummary(): Promise<DashboardSummary> {
    return apiClient.get('/api/v1/dashboard/summary');
  },
};

// Tasks API (no backend module exists - stubs for now)
export const tasksApi = {
  async getTasks(): Promise<TaskListResponse> {
    return { tasks: [], total: 0 };
  },

  async createTask(data: any) {
    throw new Error('Task creation not yet implemented on backend');
  },

  async updateTask(uuid: string, data: any) {
    throw new Error('Task update not yet implemented on backend');
  },

  async deleteTask(uuid: string) {
    throw new Error('Task deletion not yet implemented on backend');
  },
};

// Settings API
export const settingsApi = {
  async getSettings(category: string) {
    return apiClient.get(`/api/v1/settings/${category}`);
  },

  async updateSettings(category: string, data: any) {
    return apiClient.put(`/api/v1/settings/${category}`, { settings: data });
  },

  async resetSettings(category: string) {
    return apiClient.post(`/api/v1/settings/${category}/reset`);
  },

  async testWhatsApp(accountId?: string) {
    const query = accountId ? `?account_id=${encodeURIComponent(accountId)}` : '';
    return apiClient.post(`/api/v1/settings/test/whatsapp${query}`);
  },

  async testAI() {
    return apiClient.post('/api/v1/settings/test/ai');
  },

  async sendTestWhatsApp(data: { account_id?: string; phone_number: string; message: string; is_template?: boolean }) {
    return apiClient.post('/api/v1/settings/test/whatsapp/send', data);
  },

  async getAuditLogs(skip = 0, limit = 50): Promise<{ logs: AuditLogEntry[]; total: number }> {
    return apiClient.get(`/api/v1/settings/audit-logs?skip=${skip}&limit=${limit}`);
  },
};

// Admin API
export const adminApi = {
  async getUsers(): Promise<UserListItem[]> {
    const response = await apiClient.get<UserListResponse>('/api/v1/admin/users');
    return response.users;
  },

  async getAllUsers(skip = 0, limit = 100): Promise<UserListResponse> {
    return apiClient.get<UserListResponse>(`/api/v1/admin/users?skip=${skip}&limit=${limit}`);
  },

  async getAdminStats(): Promise<any> {
    return apiClient.get('/api/v1/admin/stats');
  },

  async createUser(data: { name: string; email: string; password: string; role: string }) {
    return apiClient.post('/api/v1/admin/users', data);
  },

  async changeUserRole(id: number, role: string): Promise<RoleChangeResponse> {
    return apiClient.put(`/api/v1/admin/users/${id}/role`, { role });
  },

  async deleteUser(id: number): Promise<{ message: string; deleted_user_id: number }> {
    return apiClient.delete(`/api/v1/admin/users/${id}`);
  },

  async toggleUserStatus(userId: number, isActive: boolean): Promise<ToggleStatusResponse> {
    return apiClient.put(`/api/v1/admin/users/${userId}/status`, { is_active: isActive });
  },

  async verifyUser(userId: number): Promise<VerifyUserResponse> {
    return apiClient.put(`/api/v1/admin/users/${userId}/verify`, {});
  },

  async resetUserPassword(userId: number): Promise<MessageResponse> {
    return apiClient.post(`/api/v1/admin/users/${userId}/reset-password`);
  },

  async getUserProfile(userId: number): Promise<any> {
    return apiClient.get(`/api/v1/admin/users/${userId}/profile`);
  },

  async updateUserProfile(userId: number, data: any): Promise<any> {
    return apiClient.put(`/api/v1/admin/users/${userId}/profile`, data);
  },

  async uploadUserAvatar(userId: number, file: File): Promise<UpdateAvatarResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.patch(`/api/v1/admin/users/${userId}/avatar`, formData);
  },

  async adminLogin(data: { email: string; password: string }): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/v1/admin/login', data);
  },

  async assignLead(uuid: string, userEmail: string) {
    return apiClient.put(`/api/conversation/by-uuid/${uuid}/assign`, { user_email: userEmail });
  },
};

// Alias for backward compatibility
export const assignLeadByUuid = adminApi.assignLead;
