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
      billing_profiles: {
        Row: {
          created_at: string | null
          id: string
          next_billing_date: string | null
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          plan: string | null
          plan_type: string | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          trial_end_date: string | null
          trial_ends_at: string | null
          trial_start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          next_billing_date?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan?: string | null
          plan_type?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          next_billing_date?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          plan?: string | null
          plan_type?: string | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          trial_end_date?: string | null
          trial_ends_at?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          created_at: string | null
          description: string | null
          feedback_ids: string[] | null
          id: string
          is_public: boolean | null
          milestone_date: string | null
          released_at: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          feedback_ids?: string[] | null
          id?: string
          is_public?: boolean | null
          milestone_date?: string | null
          released_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          feedback_ids?: string[] | null
          id?: string
          is_public?: boolean | null
          milestone_date?: string | null
          released_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          ai_summary: string | null
          created_at: string | null
          form_type: string | null
          id: string
          message: string
          metadata: Json | null
          project_id: string
          rating: number | null
          sentiment: string | null
          status: string | null
          suggested_reply: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string | null
          form_type?: string | null
          id?: string
          message: string
          metadata?: Json | null
          project_id: string
          rating?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          created_at?: string | null
          form_type?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          project_id?: string
          rating?: number | null
          sentiment?: string | null
          status?: string | null
          suggested_reply?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "feedback_settings"
            referencedColumns: ["project_id"]
          },
        ]
      }
      feedback_settings: {
        Row: {
          business_name: string | null
          created_at: string | null
          customer_satisfaction_enabled: boolean | null
          customer_survey_url: string | null
          id: string
          logo_url: string | null
          product_feedback_enabled: boolean | null
          product_feedback_url: string | null
          project_id: string | null
          updated_at: string | null
          user_id: string | null
          widget_code: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          customer_satisfaction_enabled?: boolean | null
          customer_survey_url?: string | null
          id?: string
          logo_url?: string | null
          product_feedback_enabled?: boolean | null
          product_feedback_url?: string | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          widget_code?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          customer_satisfaction_enabled?: boolean | null
          customer_survey_url?: string | null
          id?: string
          logo_url?: string | null
          product_feedback_enabled?: boolean | null
          product_feedback_url?: string | null
          project_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          widget_code?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          created_at: string | null
          details: string
          feedback_count: number | null
          id: string
          metadata: Json | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details: string
          feedback_count?: number | null
          id?: string
          metadata?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: string
          feedback_count?: number | null
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          company_name: string | null
          created_at: string
          demo_data_seeded: boolean | null
          email: string | null
          email_confirmed: boolean | null
          first_name: string | null
          full_name: string | null
          id: string
          industry: string | null
          is_active: boolean | null
          last_name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          plan: string | null
          preferences: Json | null
          trial_end: string | null
          trial_expired: boolean | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string
          demo_data_seeded?: boolean | null
          email?: string | null
          email_confirmed?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan?: string | null
          preferences?: Json | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          company_name?: string | null
          created_at?: string
          demo_data_seeded?: boolean | null
          email?: string | null
          email_confirmed?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan?: string | null
          preferences?: Json | null
          trial_end?: string | null
          trial_expired?: boolean | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          paystack_reference: string | null
          paystack_transaction_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          next_payment_date: string | null
          paystack_subscription_code: string | null
          plan: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          next_payment_date?: string | null
          paystack_subscription_code?: string | null
          plan?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          next_payment_date?: string | null
          paystack_subscription_code?: string | null
          plan?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_access: {
        Args: { user_uuid: string }
        Returns: {
          days_left: number
          has_access: boolean
          is_active: boolean
          plan: string
          trial_end: string
          trial_expired: boolean
        }[]
      }
      check_widget_access: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      create_feedback_settings_for_user: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      get_or_create_user_project: {
        Args: { p_user_id: string }
        Returns: {
          project_id: string
          project_name: string
        }[]
      }
      get_public_widget_settings: {
        Args: { project_uuid: string }
        Returns: Json
      }
      get_user_profile_with_access: {
        Args: { user_uuid: string }
        Returns: {
          days_left: number
          has_access: boolean
          id: string
          next_billing_date: string
          paystack_customer_id: string
          paystack_subscription_id: string
          plan: string
          subscription_status: string
          trial_ends_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_user_data: { Args: { p_user_id: string }; Returns: Json }
      initialize_user_trial: { Args: { user_uuid: string }; Returns: undefined }
      upgrade_user_to_business: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "moderator" | "admin"
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
    Enums: {
      app_role: ["user", "moderator", "admin"],
    },
  },
} as const
