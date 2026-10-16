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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_devices: {
        Row: {
          claimed_at: string
          device_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          device_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          device_id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          community_id: string | null
          completion_tokens: number | null
          created_at: string
          drafts_created: number
          est_cost_usd: number
          feature: string
          id: string
          model: string | null
          prompt_tokens: number | null
        }
        Insert: {
          community_id?: string | null
          completion_tokens?: number | null
          created_at?: string
          drafts_created?: number
          est_cost_usd?: number
          feature: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
        }
        Update: {
          community_id?: string | null
          completion_tokens?: number | null
          created_at?: string
          drafts_created?: number
          est_cost_usd?: number
          feature?: string
          id?: string
          model?: string | null
          prompt_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          device_id: string
          display_name: string
          hidden: boolean
          id: string
          issue_id: string
          stance: string
        }
        Insert: {
          body: string
          created_at?: string
          device_id: string
          display_name?: string
          hidden?: boolean
          id?: string
          issue_id: string
          stance: string
        }
        Update: {
          body?: string
          created_at?: string
          device_id?: string
          display_name?: string
          hidden?: boolean
          id?: string
          issue_id?: string
          stance?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          ai_topics_enabled: boolean
          approved_at: string | null
          approved_by: string | null
          center_lat: number | null
          center_lng: number | null
          created_at: string
          id: string
          legacy_city: string | null
          min_votes_for_results: number
          name: string
          slug: string
          state_code: string
          status: string
          timezone: string
          topic_run_days: number
          type: string
        }
        Insert: {
          ai_topics_enabled?: boolean
          approved_at?: string | null
          approved_by?: string | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          id?: string
          legacy_city?: string | null
          min_votes_for_results?: number
          name: string
          slug: string
          state_code: string
          status?: string
          timezone?: string
          topic_run_days?: number
          type?: string
        }
        Update: {
          ai_topics_enabled?: boolean
          approved_at?: string | null
          approved_by?: string | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          id?: string
          legacy_city?: string | null
          min_votes_for_results?: number
          name?: string
          slug?: string
          state_code?: string
          status?: string
          timezone?: string
          topic_run_days?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      community_recipients: {
        Row: {
          active: boolean
          community_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          title: string | null
          verified: boolean
        }
        Insert: {
          active?: boolean
          community_id?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          title?: string | null
          verified?: boolean
        }
        Update: {
          active?: boolean
          community_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          title?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "community_recipients_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_requests: {
        Row: {
          city_name: string
          community_id: string | null
          contact_email: string
          created_at: string
          id: string
          message: string | null
          organization: string | null
          requester_role: string
          reviewed_at: string | null
          state_code: string
          status: string
        }
        Insert: {
          city_name: string
          community_id?: string | null
          contact_email: string
          created_at?: string
          id?: string
          message?: string | null
          organization?: string | null
          requester_role?: string
          reviewed_at?: string | null
          state_code: string
          status?: string
        }
        Update: {
          city_name?: string
          community_id?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          message?: string | null
          organization?: string | null
          requester_role?: string
          reviewed_at?: string | null
          state_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_requests_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      impact_events: {
        Row: {
          action: string
          created_at: string
          device_id: string
          id: string
          points: number
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          device_id: string
          id?: string
          points: number
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          device_id?: string
          id?: string
          points?: number
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: []
      }
      issues: {
        Row: {
          category: string
          city: string
          closes_at: string | null
          community_id: string | null
          created_at: string
          description: string
          id: string
          impact_note: string | null
          impact_status: string
          location_name: string | null
          location_scope: string
          review_status: string
          source: string
          status: string
          submitted_by_device: string | null
          title: string
          topic_type: string
        }
        Insert: {
          category?: string
          city?: string
          closes_at?: string | null
          community_id?: string | null
          created_at?: string
          description: string
          id?: string
          impact_note?: string | null
          impact_status?: string
          location_name?: string | null
          location_scope?: string
          review_status?: string
          source?: string
          status?: string
          submitted_by_device?: string | null
          title: string
          topic_type?: string
        }
        Update: {
          category?: string
          city?: string
          closes_at?: string | null
          community_id?: string | null
          created_at?: string
          description?: string
          id?: string
          impact_note?: string | null
          impact_status?: string
          location_name?: string | null
          location_scope?: string
          review_status?: string
          source?: string
          status?: string
          submitted_by_device?: string | null
          title?: string
          topic_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          handle: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name: string
          handle: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          handle?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_id: string
          fcm_token: string
          id: string
          last_seen_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          fcm_token: string
          id?: string
          last_seen_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          fcm_token?: string
          id?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: string
          created_at: string
          device_id: string
          id: string
          reason: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          device_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          device_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      topic_drafts: {
        Row: {
          category: string
          community_id: string
          created_at: string
          description: string
          id: string
          published_issue_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
        }
        Insert: {
          category?: string
          community_id: string
          created_at?: string
          description: string
          id?: string
          published_issue_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
        }
        Update: {
          category?: string
          community_id?: string
          created_at?: string
          description?: string
          id?: string
          published_issue_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_drafts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_drafts_published_issue_id_fkey"
            columns: ["published_issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          community_id: string | null
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          choice: string
          created_at: string
          device_id: string
          id: string
          issue_id: string
        }
        Insert: {
          choice: string
          created_at?: string
          device_id: string
          id?: string
          issue_id: string
        }
        Update: {
          choice?: string
          created_at?: string
          device_id?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_community: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      close_expired_issues: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "platform_admin" | "community_admin" | "partner" | "official"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["platform_admin", "community_admin", "partner", "official"],
    },
  },
} as const
