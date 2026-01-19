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
}

export interface Customer {
  customer_id: number;
  phone: string;
  name: string | null;
  message: string;
  message_time: string;
  lead_status: LeadStatus;
  comments: string | null;
}

export interface Analytics {
  total_messages: number;
  total_responses: number;
  success_rate: number;
  average_response_time: string;
  unique_users: number;
  messages_today: number;
}

export interface ConversationHistory {
  role: 'customer' | 'agent';
  name: string;
  content: string;
  timestamp: string;
}

export interface ConversationDetail {
  message_id: number;
  phone: string;
  name: string | null;
  message: string;
  message_time: string;
  response: string | null;
  response_time: string | null;
  lead_status: LeadStatus;
  comments: string | null;
  status_updated_at: string | null;
}
