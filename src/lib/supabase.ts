import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Profile {
  id: string
  email: string
  full_name?: string
  company_name?: string
  trial_start_date: string
  trial_end_date: string
  subscription_status: 'trial' | 'active' | 'expired' | 'failed' | 'cancelled'
  plan_type: 'free' | 'pro' | 'enterprise'
  paystack_customer_code?: string
  paystack_subscription_code?: string
  paystack_authorization_code?: string
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  owner_id: string
  name: string
  slug: string
  widget_color: string
  widget_logo_url?: string
  widget_greeting: string
  widget_position: string
  created_at: string
  updated_at: string
}

export interface Feedback {
  id: string
  workspace_id: string
  content: string
  rating?: number
  type: 'bug' | 'feature' | 'praise' | 'other'
  user_name?: string
  user_email?: string
  user_ip?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  ai_summary?: string
  suggested_reply?: string
  tags?: string[]
  status: 'new' | 'in_progress' | 'resolved' | 'archived'
  assigned_to?: string
  page_url?: string
  user_agent?: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  workspace_id?: string
  type: 'new_feedback' | 'team_invite' | 'payment_failed' | 'trial_ending'
  title: string
  message: string
  read: boolean
  created_at: string
}

export interface PaymentLog {
  id: string
  user_id: string
  event_type: string
  paystack_reference?: string
  amount?: number
  status: string
  metadata?: any
  created_at: string
}