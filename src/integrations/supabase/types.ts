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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
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
          description: string | null
          id: string
          legacy_city: string | null
          min_votes_for_results: number
          name: string
          resources: Json
          slug: string
          state_code: string
          status: string
          timezone: string
          topic_run_days: number
          type: string
          verification_note: string | null
          verified_by: string | null
          zip_codes: string[]
        }
        Insert: {
          ai_topics_enabled?: boolean
          approved_at?: string | null
          approved_by?: string | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_city?: string | null
          min_votes_for_results?: number
          name: string
          resources?: Json
          slug: string
          state_code: string
          status?: string
          timezone?: string
          topic_run_days?: number
          type?: string
          verification_note?: string | null
          verified_by?: string | null
          zip_codes?: string[]
        }
        Update: {
          ai_topics_enabled?: boolean
          approved_at?: string | null
          approved_by?: string | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_city?: string | null
          min_votes_for_results?: number
          name?: string
          resources?: Json
          slug?: string
          state_code?: string
          status?: string
          timezone?: string
          topic_run_days?: number
          type?: string
          verification_note?: string | null
          verified_by?: string | null
          zip_codes?: string[]
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
      community_interest_requests: {
        Row: {
          admin_note: string | null
          city_name: string
          community_id: string | null
          community_key: string
          community_type: string
          contact_email: string | null
          created_at: string
          device_hash: string
          followup_at: string | null
          id: string
          organization: string | null
          outreach_at: string | null
          pipeline_id: string | null
          reason: string | null
          state_code: string
          status: string
          updated_at: string
          verification_note: string | null
          wants_to_help: boolean
        }
        Insert: {
          admin_note?: string | null
          city_name: string
          community_id?: string | null
          community_key: string
          community_type: string
          contact_email?: string | null
          created_at?: string
          device_hash: string
          followup_at?: string | null
          id?: string
          organization?: string | null
          outreach_at?: string | null
          pipeline_id?: string | null
          reason?: string | null
          state_code: string
          status?: string
          updated_at?: string
          verification_note?: string | null
          wants_to_help?: boolean
        }
        Update: {
          admin_note?: string | null
          city_name?: string
          community_id?: string | null
          community_key?: string
          community_type?: string
          contact_email?: string | null
          created_at?: string
          device_hash?: string
          followup_at?: string | null
          id?: string
          organization?: string | null
          outreach_at?: string | null
          pipeline_id?: string | null
          reason?: string | null
          state_code?: string
          status?: string
          updated_at?: string
          verification_note?: string | null
          wants_to_help?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "community_interest_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_interest_requests_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "partner_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_interest_requests_state_code_fkey"
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
          admin_note: string | null
          city_name: string
          community_id: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          decision_reason: string | null
          engagement_plan: string | null
          id: string
          message: string | null
          org_type: string | null
          organization: string | null
          requester_role: string
          retention_until: string
          reviewed_at: string | null
          reviewed_by: string | null
          state_code: string
          status: string
          submitter_device: string | null
        }
        Insert: {
          admin_note?: string | null
          city_name: string
          community_id?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          decision_reason?: string | null
          engagement_plan?: string | null
          id?: string
          message?: string | null
          org_type?: string | null
          organization?: string | null
          requester_role?: string
          retention_until?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_code: string
          status?: string
          submitter_device?: string | null
        }
        Update: {
          admin_note?: string | null
          city_name?: string
          community_id?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          decision_reason?: string | null
          engagement_plan?: string | null
          id?: string
          message?: string | null
          org_type?: string | null
          organization?: string | null
          requester_role?: string
          retention_until?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state_code?: string
          status?: string
          submitter_device?: string | null
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
      demo_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          organization: string
          state_code: string | null
          status: string
          submitter_device: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          organization: string
          state_code?: string | null
          status?: string
          submitter_device?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          organization?: string
          state_code?: string | null
          status?: string
          submitter_device?: string | null
        }
        Relationships: []
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
      impact_records: {
        Row: {
          community_id: string
          created_at: string
          created_by: string | null
          description: string
          evidence_url: string | null
          id: string
          issue_id: string | null
          occurred_on: string
          public: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string | null
          description: string
          evidence_url?: string | null
          id?: string
          issue_id?: string | null
          occurred_on: string
          public?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          evidence_url?: string | null
          id?: string
          issue_id?: string | null
          occurred_on?: string
          public?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "impact_records_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impact_records_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
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
      onboarding_steps: {
        Row: {
          done_at: string
          done_by: string | null
          id: string
          pipeline_id: string
          step_no: number
        }
        Insert: {
          done_at?: string
          done_by?: string | null
          id?: string
          pipeline_id: string
          step_no: number
        }
        Update: {
          done_at?: string
          done_by?: string | null
          id?: string
          pipeline_id?: string
          step_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "partner_pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_log: {
        Row: {
          channel: string
          contacted_on: string
          created_at: string
          created_by: string | null
          id: string
          next_followup_at: string | null
          organization: string
          summary: string
        }
        Insert: {
          channel?: string
          contacted_on?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_followup_at?: string | null
          organization: string
          summary: string
        }
        Update: {
          channel?: string
          contacted_on?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_followup_at?: string | null
          organization?: string
          summary?: string
        }
        Relationships: []
      }
      partner_organizations: {
        Row: {
          community_id: string | null
          created_at: string
          id: string
          name: string
          org_type: string
          public_description: string | null
          public_listing: boolean
          request_id: string | null
          state_code: string | null
          verification_note: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          id?: string
          name: string
          org_type?: string
          public_description?: string | null
          public_listing?: boolean
          request_id?: string | null
          state_code?: string | null
          verification_note?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string
          id?: string
          name?: string
          org_type?: string
          public_description?: string | null
          public_listing?: boolean
          request_id?: string | null
          state_code?: string | null
          verification_note?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_organizations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_organizations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "community_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_organizations_state_code_fkey"
            columns: ["state_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
        ]
      }
      partner_pipeline: {
        Row: {
          activated_at: string | null
          community_id: string | null
          coordinator: string | null
          created_at: string
          id: string
          last_contact_at: string | null
          next_followup_at: string | null
          notes: string | null
          request_id: string | null
        }
        Insert: {
          activated_at?: string | null
          community_id?: string | null
          coordinator?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          request_id?: string | null
        }
        Update: {
          activated_at?: string | null
          community_id?: string | null
          coordinator?: string | null
          created_at?: string
          id?: string
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_pipeline_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_pipeline_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "community_requests"
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
      program_settings: {
        Row: {
          id: number
          pilot_end: string
          pilot_start: string
          pilot_target: number
        }
        Insert: {
          id?: number
          pilot_end?: string
          pilot_start?: string
          pilot_target?: number
        }
        Update: {
          id?: number
          pilot_end?: string
          pilot_start?: string
          pilot_target?: number
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
      toolkit_pages: {
        Row: {
          body: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
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
      is_public_community: { Args: { _id: string }; Returns: boolean }
      purge_expired_applications: { Args: never; Returns: number }
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
