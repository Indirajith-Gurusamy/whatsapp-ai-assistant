export type LeadStatus =
  | 'new lead'
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
  phone: string;
  name: string | null;
  message: string;
  timestamp: string;
}

export interface Conversation {
  message_id: number;
  uuid: string;
  phone: string;
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
  uuid: string;
  phone: string;
  name: string | null;
  message: string;
  message_time: string;
  lead_status: LeadStatus;
  comments: string | null;
  conversation_uuid?: string | null;
  ai_enabled?: boolean;
}

export interface Analytics {
  total_messages: number;
  total_responses: number;
  success_rate: number;
  average_response_time: string;
  unique_users: number;
  messages_today: number;
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
  timestamp: string;
  status?: MessageDeliveryStatus;
}

export interface ConversationDetail {
  message_id: number;
  uuid: string;
  phone: string;
  name: string | null;
  message: string;
  message_time: string;
  response: string | null;
  response_time: string | null;
  lead_status: LeadStatus;
  comments: string | null;
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
