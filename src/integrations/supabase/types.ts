export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          confidence_score: number | null
          content: Json
          created_at: string
          data_source_id: string | null
          id: string
          industry_category: string | null
          insight_type: string
          is_actionable: boolean | null
          priority: string | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          content: Json
          created_at?: string
          data_source_id?: string | null
          id?: string
          industry_category?: string | null
          insight_type: string
          is_actionable?: boolean | null
          priority?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          content?: Json
          created_at?: string
          data_source_id?: string | null
          id?: string
          industry_category?: string | null
          insight_type?: string
          is_actionable?: boolean | null
          priority?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_history: {
        Row: {
          analysis_type: string
          analytics_data: Json
          created_at: string | null
          id: string
          insights_count: number
          time_range: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_type?: string
          analytics_data: Json
          created_at?: string | null
          id?: string
          insights_count?: number
          time_range?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_type?: string
          analytics_data?: Json
          created_at?: string | null
          id?: string
          insights_count?: number
          time_range?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing: {
        Row: {
          created_at: string | null
          end_date: string | null
          plan: string | null
          start_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          plan?: string | null
          start_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          plan?: string | null
          start_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_profiles: {
        Row: {
          created_at: string | null
          id: string
          next_billing_date: string | null
          paystack_customer_id: string | null
          paystack_subscription_id: string | null
          plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          next_billing_date?: string | null
          paystack_customer_id?: string | null
          paystack_subscription_id?: string | null
          plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          next_billing_date?: string | null
          paystack_customer_id?: string | null
          paystack_subscription_id?: string | null
          plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          created_at: string
          file_size: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_links: {
        Row: {
          created_at: string | null
          id: string
          link: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string
          project_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string | null
          client_name: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          sentiment: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          client_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          sentiment?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          client_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          sentiment?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedback_notifications: {
        Row: {
          feedback_id: string | null
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          sent_at: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          feedback_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          feedback_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          sent_at?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_notifications_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_settings: {
        Row: {
          brand_color: string | null
          business_logo: string | null
          business_name: string | null
          button_text: string | null
          created_at: string | null
          custom_fields: Json | null
          id: string
          notify_email: string | null
          project_id: string | null
          project_id_locked: boolean | null
          redirect_url: string | null
          show_contact_info: boolean | null
          show_email: boolean | null
          show_name: boolean | null
          show_rating: boolean | null
          theme: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          brand_color?: string | null
          business_logo?: string | null
          business_name?: string | null
          button_text?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          notify_email?: string | null
          project_id?: string | null
          project_id_locked?: boolean | null
          redirect_url?: string | null
          show_contact_info?: boolean | null
          show_email?: boolean | null
          show_name?: boolean | null
          show_rating?: boolean | null
          theme?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          brand_color?: string | null
          business_logo?: string | null
          business_name?: string | null
          button_text?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          id?: string
          notify_email?: string | null
          project_id?: string | null
          project_id_locked?: boolean | null
          redirect_url?: string | null
          show_contact_info?: boolean | null
          show_email?: boolean | null
          show_name?: boolean | null
          show_rating?: boolean | null
          theme?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          email: string | null
          id: string
          message: string
          name: string | null
          project_id: string | null
          status: string | null
          timestamp: string | null
        }
        Insert: {
          email?: string | null
          id?: string
          message: string
          name?: string | null
          project_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          project_id?: string | null
          status?: string | null
          timestamp?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          is_achieved: boolean | null
          name: string
          target_date: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          is_achieved?: boolean | null
          name: string
          target_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          is_achieved?: boolean | null
          name?: string
          target_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      insights_history: {
        Row: {
          analysis_result: Json
          created_at: string | null
          id: string
          selected_feedback_ids: string[]
          user_id: string | null
        }
        Insert: {
          analysis_result: Json
          created_at?: string | null
          id?: string
          selected_feedback_ids: string[]
          user_id?: string | null
        }
        Update: {
          analysis_result?: Json
          created_at?: string | null
          id?: string
          selected_feedback_ids?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      insights_results: {
        Row: {
          created_at: string | null
          file_id: string
          file_name: string
          id: string
          key_themes: string[]
          performance: Json
          sentiment: Json
          suggested_actions: string[]
          summary: string
          trends: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_id: string
          file_name: string
          id?: string
          key_themes?: string[]
          performance?: Json
          sentiment?: Json
          suggested_actions?: string[]
          summary: string
          trends?: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_id?: string
          file_name?: string
          id?: string
          key_themes?: string[]
          performance?: Json
          sentiment?: Json
          suggested_actions?: string[]
          summary?: string
          trends?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          feedback_alerts: boolean | null
          id: string
          system_updates: boolean | null
          updated_at: string | null
          user_id: string
          weekly_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          feedback_alerts?: boolean | null
          id?: string
          system_updates?: boolean | null
          updated_at?: string | null
          user_id: string
          weekly_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          feedback_alerts?: boolean | null
          id?: string
          system_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
          weekly_reports?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_email_sent: boolean | null
          is_read: boolean | null
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_email_sent?: boolean | null
          is_read?: boolean | null
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_email_sent?: boolean | null
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          size: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          size?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          size?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          code: string
          created_at: string | null
          id: string
          limits: Json
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          limits: Json
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          limits?: Json
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          authorization_code: string | null
          avatar_url: string | null
          company: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          industry: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          preferences: Json | null
          role: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          authorization_code?: string | null
          avatar_url?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          authorization_code?: string | null
          avatar_url?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferences?: Json | null
          role?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      qr_links: {
        Row: {
          created_at: string | null
          id: string
          link: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string
          project_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          date_range_end: string | null
          date_range_start: string | null
          file_size: number | null
          file_url: string | null
          format: string
          id: string
          insights_included: number | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_size?: number | null
          file_url?: string | null
          format: string
          id?: string
          insights_included?: number | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_end?: string | null
          date_range_start?: string | null
          file_size?: number | null
          file_url?: string | null
          format?: string
          id?: string
          insights_included?: number | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string | null
          features: Json | null
          id: string
          interval: string
          max_data_sources: number | null
          max_insights_per_month: number | null
          max_team_members: number | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          currency?: string | null
          features?: Json | null
          id?: string
          interval: string
          max_data_sources?: number | null
          max_insights_per_month?: number | null
          max_team_members?: number | null
          name: string
          price: number
        }
        Update: {
          created_at?: string
          currency?: string | null
          features?: Json | null
          id?: string
          interval?: string
          max_data_sources?: number | null
          max_insights_per_month?: number | null
          max_team_members?: number | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          id: string
          paystack_customer_id: string | null
          paystack_subscription_code: string | null
          plan: string
          status: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          plan: string
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          paystack_customer_id?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          declined_at: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          inviter_id: string
          message: string | null
          personal_message: string | null
          role: string
          status: string
          team_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          inviter_id: string
          message?: string | null
          personal_message?: string | null
          role?: string
          status?: string
          team_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          inviter_id?: string
          message?: string | null
          personal_message?: string | null
          role?: string
          status?: string
          team_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          last_active: string | null
          permissions: string[] | null
          role: string
          status: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          last_active?: string | null
          permissions?: string[] | null
          role?: string
          status?: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          last_active?: string | null
          permissions?: string[] | null
          role?: string
          status?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          analytics_enabled: boolean | null
          avatar_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          owner_id: string | null
          real_time_collaboration: boolean | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
          owner_id?: string | null
          real_time_collaboration?: boolean | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          analytics_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          owner_id?: string | null
          real_time_collaboration?: boolean | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: number
          paystack_reference: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: number
          paystack_reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: number
          paystack_reference?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          ai_insights_count: number
          analytics_count: number
          analytics_disabled: boolean | null
          analytics_reports_count: number
          created_at: string | null
          detailed_reports_count: number
          feedback_count: number
          feedback_disabled: boolean | null
          id: string
          insights_count: number
          insights_disabled: boolean | null
          month_start: string
          reports_count: number
          reports_disabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_insights_count?: number
          analytics_count?: number
          analytics_disabled?: boolean | null
          analytics_reports_count?: number
          created_at?: string | null
          detailed_reports_count?: number
          feedback_count?: number
          feedback_disabled?: boolean | null
          id?: string
          insights_count?: number
          insights_disabled?: boolean | null
          month_start: string
          reports_count?: number
          reports_disabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_insights_count?: number
          analytics_count?: number
          analytics_disabled?: boolean | null
          analytics_reports_count?: number
          created_at?: string | null
          detailed_reports_count?: number
          feedback_count?: number
          feedback_disabled?: boolean | null
          id?: string
          insights_count?: number
          insights_disabled?: boolean | null
          month_start?: string
          reports_count?: number
          reports_disabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          analytics_count: number | null
          created_at: string | null
          feedback_count: number | null
          id: string
          insights_count: number | null
          reports_count: number | null
          teams_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analytics_count?: number | null
          created_at?: string | null
          feedback_count?: number | null
          id: string
          insights_count?: number | null
          reports_count?: number | null
          teams_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analytics_count?: number | null
          created_at?: string | null
          feedback_count?: number | null
          id?: string
          insights_count?: number | null
          reports_count?: number | null
          teams_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_insights_history: {
        Row: {
          analysis: Json | null
          created_at: string | null
          file_name: string | null
          file_type: string | null
          id: string
          uploaded_data: Json | null
          user_id: string | null
        }
        Insert: {
          analysis?: Json | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          uploaded_data?: Json | null
          user_id?: string | null
        }
        Update: {
          analysis?: Json | null
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          uploaded_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_tone: string | null
          alert_frequency: string | null
          created_at: string
          data_retention_days: number | null
          email_notifications: boolean | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_tone?: string | null
          alert_frequency?: string | null
          created_at?: string
          data_retention_days?: number | null
          email_notifications?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_tone?: string | null
          alert_frequency?: string | null
          created_at?: string
          data_retention_days?: number | null
          email_notifications?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_code: string
          plan_name: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code: string
          plan_name: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_code?: string
          plan_name?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_links: {
        Row: {
          created_at: string | null
          id: string
          link: string
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link: string
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string
          project_id?: string
        }
        Relationships: []
      }
      widget_settings: {
        Row: {
          ai_auto_tagging: boolean | null
          anonymous_feedback: boolean | null
          auto_resolve_after_reply: boolean | null
          brand_color: string | null
          created_at: string | null
          email_notifications: boolean | null
          greeting_text: string | null
          id: string
          updated_at: string | null
          user_id: string
          widget_location: string | null
          widget_position: string | null
        }
        Insert: {
          ai_auto_tagging?: boolean | null
          anonymous_feedback?: boolean | null
          auto_resolve_after_reply?: boolean | null
          brand_color?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          greeting_text?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          widget_location?: string | null
          widget_position?: string | null
        }
        Update: {
          ai_auto_tagging?: boolean | null
          anonymous_feedback?: boolean | null
          auto_resolve_after_reply?: boolean | null
          brand_color?: string | null
          created_at?: string | null
          email_notifications?: boolean | null
          greeting_text?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          widget_location?: string | null
          widget_position?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_use_feature: {
        Args: { feature_name: string; user_uuid: string }
        Returns: boolean
      }
      check_and_consume_usage: {
        Args: { p_kind: string; p_user_id: string }
        Returns: boolean
      }
      check_project_id_availability: {
        Args: { current_user_id: string; project_id_param: string }
        Returns: {
          is_available: boolean
          message: string
          taken_by_email: string
          taken_by_user_id: string
        }[]
      }
      clean_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_feedback_settings_for_user: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      create_insights_result: {
        Args: {
          p_file_id: string
          p_file_name: string
          p_key_themes: string[]
          p_performance: Json
          p_sentiment: Json
          p_suggested_actions: string[]
          p_summary: string
          p_trends: string[]
          p_user_id: string
        }
        Returns: {
          created_at: string | null
          file_id: string
          file_name: string
          id: string
          key_themes: string[]
          performance: Json
          sentiment: Json
          suggested_actions: string[]
          summary: string
          trends: string[]
          updated_at: string | null
          user_id: string
        }
      }
      create_user_billing_profile: {
        Args: { user_uuid: string }
        Returns: Json
      }
      delete_insights_result: {
        Args: { p_result_id: string; p_user_id: string }
        Returns: boolean
      }
      detect_urgent_keywords: {
        Args: { message_text: string }
        Returns: boolean
      }
      enforce_usage_limits: {
        Args: { user_uuid?: string }
        Returns: undefined
      }
      ensure_all_tables_for_user: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      ensure_current_month_usage: {
        Args: { user_uuid: string }
        Returns: {
          analytics_count: number
          created_at: string
          feedback_count: number
          insights_count: number
          month_start: string
          reports_count: number
          updated_at: string
          user_id: string
        }[]
      }
      ensure_user_feedback_settings: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      get_all_project_ids: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          project_id: string
          user_email: string
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_plan_limits: {
        Args: { plan_code: string }
        Returns: Json
      }
      get_team_invitation_stats: {
        Args: { team_uuid: string }
        Returns: {
          accepted_invitations: number
          declined_invitations: number
          expired_invitations: number
          pending_invitations: number
          total_invitations: number
        }[]
      }
      get_user_insights_results: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          file_id: string
          file_name: string
          id: string
          key_themes: string[]
          performance: Json
          sentiment: Json
          suggested_actions: string[]
          summary: string
          trends: string[]
        }[]
      }
      get_user_plan: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_usage_summary: {
        Args: { p_user_id: string }
        Returns: {
          analytics_count: number
          analytics_limit: number
          analytics_remaining: number
          feedback_count: number
          feedback_limit: number
          feedback_remaining: number
          insights_count: number
          insights_limit: number
          insights_remaining: number
          plan_code: string
          plan_name: string
          reports_count: number
          reports_limit: number
          reports_remaining: number
        }[]
      }
      increment_usage_with_check: {
        Args: { feature_name: string; user_uuid: string }
        Returns: Json
      }
      refresh_usage_for_user: {
        Args: { user_uuid: string }
        Returns: {
          ai_insights_count: number
          analytics_reports_count: number
          created_at: string
          detailed_reports_count: number
          feedback_count: number
          month_start: string
          updated_at: string
          user_id: string
        }[]
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      safe_create_user_profile: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      test_increment_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_insights_results_table: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      upsert_user_subscription: {
        Args: {
          p_interval?: string
          p_plan_name?: string
          p_plan_type?: string
          p_price?: number
          p_user_id: string
        }
        Returns: string
      }
      validate_project_id: {
        Args: { current_user_id: string; project_id_param: string }
        Returns: {
          error_message: string
          is_available: boolean
          is_valid: boolean
          taken_by_email: string
          taken_by_user_id: string
        }[]
      }
      validate_security_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          issues: string[]
          policies_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
