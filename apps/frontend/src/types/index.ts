export type LeadStatus =
  | 'new lead'
  | 'assigned'
  | 'application sent'
  | 'application in'
  | 'nurture'
  | 'follow up'
  | 'on hold'
  | 'lost'
  | 'duplicate'
  | 'closed';

export interface Message {
  id: number;
  channel?: 'whatsapp' | 'email';
  phone: string;
  email?: string | null;
  name: string | null;
  message: string;
  html_body?: string | null;
  timestamp: string;
  customer_uuid?: string;
}

export interface Conversation {
  message_id: number;
  latest_message_id?: number;
  uuid: string;
  channel?: 'whatsapp' | 'email';
  phone: string;
  email?: string | null;
  name: string | null;
  message: string;
  message_time: string;
  response: string | null;
  response_time: string | null;
  response_status: string | null;
  lead_status: LeadStatus;
  comments: string | null;
  assigned_to?: string | null;
  ai_enabled?: boolean;
}

export interface Customer {
  customer_id: number;
  latest_message_id?: number;
  uuid: string;
  channel?: 'whatsapp' | 'email';
  phone: string;
  email?: string | null;
  name: string | null;
  message: string;
  message_time: string;
  lead_status: LeadStatus;
  comments: string | null;
  assigned_to?: string | null;
  conversation_uuid?: string | null;
  ai_enabled?: boolean;
}

export interface PipelineFunnelItem {
  stage: string;
  count: number;
  pct: number;
}

export interface AgentWorkloadItem {
  agent: string;
  count: number;
}

export interface PipelineAnalytics {
  funnel: PipelineFunnelItem[];
  by_status: Record<string, number>;
  avg_time_in_stage_hours: Record<string, number>;
  agent_workload: AgentWorkloadItem[];
  response_time: {
    median_seconds: number;
    p95_seconds: number;
    average_seconds: number;
    median_display: string;
    p95_display: string;
    average_display: string;
    sample_size: number;
  };
}

export interface Analytics {
  total_messages: number;
  total_responses: number;
  success_rate: number;
  average_response_time: string;
  average_response_seconds?: number;
  unique_users: number;
  messages_today: number;
  pipeline?: PipelineAnalytics;
}

export interface QuickReply {
  uuid: string;
  title: string;
  body: string;
  category?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface KnowledgeDocument {
  uuid: string;
  title: string;
  filename?: string | null;
  mime_type?: string | null;
  is_active: boolean;
  chunk_count: number;
  created_at?: string | null;
}

export interface AssistantAction {
  type: string;
  label?: string;
  path?: string;
  conversation_uuid?: string;
  customer_uuid?: string;
  enabled?: boolean;
}

export type MessageDeliveryStatus =
  | 'received'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'sending'
  | 'pending';

export interface ConversationHistory {
  id?: number;
  role: 'customer' | 'agent' | 'human_agent';
  name: string;
  content: string;
  html_body?: string | null;
  timestamp: string;
  status?: MessageDeliveryStatus;
}

export interface ConversationDetail {
  message_id: number;
  uuid: string;
  channel?: 'whatsapp' | 'email';
  phone: string;
  email?: string | null;
  name: string | null;
  message: string;
  message_time: string;
  response: string | null;
  response_time: string | null;
  lead_status: LeadStatus;
  comments: string | null;
  assigned_to?: string | null;
  status_updated_at: string | null;
  ai_enabled?: boolean;
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
  isActive?: boolean;
  emailVerified: boolean;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  location: {
    city: string | null;
    country: string | null;
    state: string | null;
    postalCode: string | null;
  } | null;
  dateOfBirth: string | null;
  socialLinks: SocialLink[];
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  phone?: string;
  email?: string;
  location?: {
    city?: string | null;
    country?: string | null;
    state?: string | null;
    postalCode?: string | null;
  };
  dateOfBirth?: string | null;
  socialLinks?: SocialLink[];
}

// Task Management Types
export type TaskStatus = 
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'completed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDetail {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  comments: TaskComment[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assigned_to?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  assigned_to?: string;
}
