// Frontend API client for WhatsApp CRM
// Handles all HTTP requests to the backend API

import type {
  Analytics,
  Conversation as ConversationListItem,
  ConversationDetail,
  ConversationHistory,
  CreateTaskPayload,
  Customer as CrmCustomer,
  Message as MessageListItem,
  Task,
  UpdateProfilePayload,
  UpdateTaskPayload,
  UserProfile,
} from '@/types';

import { redirectToLogin } from '@/lib/auth-storage';

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
  tasks: Task[];
  total: number;
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
  admin_name: string;
  admin_email: string;
  action: string;
  category: string;
  old_value?: unknown;
  new_value?: unknown;
  created_at: string;
}

export interface SettingsResponse {
  settings: Record<string, string>;
}

export interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface AdminStatsResponse {
  total_users: number;
  total_admins: number;
  total_active_users: number;
  total_verified_users: number;
}

export type ProfileResponse = UserProfile;

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

export interface ResetPasswordResponse {
  message: string;
  temporary_password: string;
}

export interface BulkDeleteUsersResponse {
  deleted: number[];
  errors: { user_id: number; error: string }[];
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
        if (response.status === 401 && token) {
          tokenStorage.clearTokens();
          redirectToLogin();
        }
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
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          'Cannot reach the API server. Ensure the backend is running (port 8000) and the database is migrated (python scripts/db.py push local).'
        );
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
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

  setTokens(accessToken: string, refreshToken: string, _rememberMe: boolean = false): void {
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

  async updateProfile(data: UpdateProfilePayload): Promise<ProfileResponse> {
    return apiClient.put('/api/v1/auth/users/me', data);
  },

  async uploadAvatar(file: File): Promise<UpdateAvatarResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.patch('/api/v1/auth/users/me/avatar', formData);
  },
};

// Conversations API
export const fetchConversations = async (limit = 50): Promise<ConversationListItem[]> => {
  return apiClient.get(`/api/conversations?limit=${limit}`);
};

export const fetchConversationDetailByUuid = async (uuid: string): Promise<ConversationDetail> => {
  return apiClient.get(`/api/conversation/by-uuid/${uuid}`);
};

export const updateConversationStatusByUuid = async (uuid: string, status: string, comments?: string) => {
  return apiClient.post(`/api/conversation/by-uuid/${uuid}/status`, { status, comments });
};

// Messages API
export const fetchMessages = async (limit = 50): Promise<MessageListItem[]> => {
  return apiClient.get(`/api/messages?limit=${limit}`);
};

// Customers API
export const fetchCustomers = async (limit = 50): Promise<CrmCustomer[]> => {
  return apiClient.get(`/api/customers?limit=${limit}`);
};

export const fetchCustomerByUuid = async (uuid: string): Promise<CrmCustomer> => {
  return apiClient.get(`/api/customers/by-uuid/${uuid}`);
};

export const fetchCustomerHistoryByUuid = async (uuid: string): Promise<ConversationHistory[]> => {
  return apiClient.get(`/api/customers/by-uuid/${uuid}/history`);
};

export const customersApi = {
  create: (data: { phone: string; name?: string }) =>
    apiClient.post<{ uuid: string; phone: string; name: string; created: boolean }>(
      '/api/customers',
      data,
    ),
  delete: (uuid: string) =>
    apiClient.delete<{ success: boolean; deleted_uuid: string }>(`/api/customers/by-uuid/${uuid}`),
  bulkDelete: (customer_uuids: string[]) =>
    apiClient.post<{ deleted: string[]; errors: { uuid: string; error: string }[] }>(
      '/api/customers/bulk-delete',
      { customer_uuids },
    ),
};

export const toggleConversationAI = async (uuid: string, aiEnabled: boolean) => {
  return apiClient.put(`/api/conversation/by-uuid/${uuid}/ai-toggle`, { enabled: aiEnabled });
};

export const sendAgentMessage = async (uuid: string, message: string) => {
  return apiClient.post(`/api/conversation/by-uuid/${uuid}/send-message`, { message });
};

export const suggestAgentReply = async (uuid: string): Promise<{ suggestion: string }> => {
  return apiClient.post(`/api/conversation/by-uuid/${uuid}/suggest-reply`, {});
};

// Analytics API
export const fetchAnalytics = async (): Promise<Analytics> => {
  return apiClient.get('/api/analytics');
};

// In-app assistant (uses active AI provider from Settings → AI)
export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatRequest {
  message: string;
  history?: AssistantChatMessage[];
  pathname?: string;
}

export interface AssistantAction {
  type: string;
  label?: string;
  path?: string;
  conversation_uuid?: string;
  customer_uuid?: string;
  enabled?: boolean;
  user_id?: number;
  role?: string;
  user_email?: string;
  lead_status?: string;
  comments?: string;
  message?: string;
  active?: boolean;
  email?: string;
  password?: string;
  name?: string;
  profile_name?: string;
  bio?: string;
  phone?: string;
  settings_category?: string;
  category?: string;
  settings?: Record<string, unknown>;
  settings_json?: string;
  provider_id?: string;
  task_uuid?: string;
  task_title?: string;
  title?: string;
  task_description?: string;
  description?: string;
  task_status?: string;
  status?: string;
  task_priority?: string;
  priority?: string;
  assigned_to?: string;
  customer_name?: string;
  user_ids?: number[];
  customer_uuids?: string[];
  ui_target?: string;
  target?: string;
}

export interface AssistantChatResponse {
  reply: string;
  provider_name?: string;
  actions?: AssistantAction[];
}

export const assistantApi = {
  async chat(body: AssistantChatRequest): Promise<AssistantChatResponse> {
    return apiClient.post('/api/v1/assistant/chat', body);
  },
  async execute(action: AssistantAction): Promise<Record<string, unknown>> {
    return apiClient.post('/api/v1/assistant/execute', { action });
  },
};

export const quickRepliesApi = {
  list: () => apiClient.get<import('@/types').QuickReply[]>('/api/v1/quick-replies'),
  listManage: () => apiClient.get<import('@/types').QuickReply[]>('/api/v1/quick-replies/manage'),
  create: (data: { title: string; body: string; category?: string; sort_order?: number }) =>
    apiClient.post('/api/v1/quick-replies', data),
  update: (uuid: string, data: Partial<{ title: string; body: string; category: string; sort_order: number; is_active: boolean }>) =>
    apiClient.patch(`/api/v1/quick-replies/${uuid}`, data),
  remove: (uuid: string) => apiClient.delete(`/api/v1/quick-replies/${uuid}`),
};

export const knowledgeApi = {
  list: () => apiClient.get<import('@/types').KnowledgeDocument[]>('/api/v1/knowledge'),
  upload: async (title: string, file: File) => {
    const form = new FormData();
    form.append('title', title);
    form.append('file', file);
    const token = tokenStorage.getToken();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${base}/api/v1/knowledge/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || 'Upload failed');
    }
    return res.json();
  },
  ingestText: (title: string, text: string) =>
    apiClient.post('/api/v1/knowledge/text', { title, text }),
  setActive: (uuid: string, is_active: boolean) =>
    apiClient.patch(`/api/v1/knowledge/${uuid}/active`, { is_active }),
  remove: (uuid: string) => apiClient.delete(`/api/v1/knowledge/${uuid}`),
};

export const tasksApi = {
  async getTasks(): Promise<TaskListResponse> {
    return apiClient.get<TaskListResponse>('/api/v1/tasks');
  },

  async createTask(data: CreateTaskPayload): Promise<Task> {
    return apiClient.post<Task>('/api/v1/tasks', {
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      due_date: data.due_date,
      assigned_to: data.assigned_to,
    });
  },

  async updateTask(uuid: string, data: UpdateTaskPayload): Promise<Task> {
    return apiClient.patch<Task>(`/api/v1/tasks/${uuid}`, data);
  },

  async deleteTask(uuid: string): Promise<{ deleted_uuid: string }> {
    return apiClient.delete(`/api/v1/tasks/${uuid}`);
  },
};

// Settings API
export const settingsApi = {
  async getSettings(category: string): Promise<SettingsResponse> {
    return apiClient.get(`/api/v1/settings/${category}`);
  },

  async updateSettings(category: string, data: Record<string, unknown>): Promise<SettingsResponse> {
    return apiClient.put(`/api/v1/settings/${category}`, { settings: data });
  },

  async resetSettings(category: string): Promise<SettingsResponse> {
    return apiClient.post(`/api/v1/settings/${category}/reset`);
  },

  async testWhatsApp(accountId?: string): Promise<TestResult> {
    const query = accountId ? `?account_id=${encodeURIComponent(accountId)}` : '';
    return apiClient.post(`/api/v1/settings/test/whatsapp${query}`);
  },

  async testAI(providerId?: string): Promise<TestResult> {
    const query = providerId ? `?provider_id=${encodeURIComponent(providerId)}` : '';
    return apiClient.post(`/api/v1/settings/test/ai${query}`);
  },

  async sendTestWhatsApp(data: { account_id?: string; phone_number: string; message: string }): Promise<TestResult> {
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

  async getAllUsers(
    skip = 0,
    limit = 100,
    search?: string,
    filters?: { role?: 'USER' | 'ADMIN'; isActive?: boolean },
  ): Promise<UserListResponse> {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(Math.min(limit, 100)),
    });
    if (search?.trim()) {
      params.set('search', search.trim());
    }
    if (filters?.role) {
      params.set('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      params.set('is_active', String(filters.isActive));
    }
    return apiClient.get<UserListResponse>(`/api/v1/admin/users?${params.toString()}`);
  },

  async getAdminStats(): Promise<AdminStatsResponse> {
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

  async bulkDeleteUsers(user_ids: number[]): Promise<BulkDeleteUsersResponse> {
    return apiClient.post('/api/v1/admin/users/bulk-delete', { user_ids });
  },

  async toggleUserStatus(userId: number, isActive: boolean): Promise<ToggleStatusResponse> {
    return apiClient.put(`/api/v1/admin/users/${userId}/status`, { is_active: isActive });
  },

  async verifyUser(userId: number): Promise<VerifyUserResponse> {
    return apiClient.put(`/api/v1/admin/users/${userId}/verify`, {});
  },

  async resetUserPassword(userId: number): Promise<ResetPasswordResponse> {
    return apiClient.post(`/api/v1/admin/users/${userId}/reset-password`);
  },

  async getUserProfile(userId: number): Promise<UserProfile> {
    return apiClient.get(`/api/v1/admin/users/${userId}/profile`);
  },

  async updateUserProfile(userId: number, data: UpdateProfilePayload): Promise<UserProfile> {
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
