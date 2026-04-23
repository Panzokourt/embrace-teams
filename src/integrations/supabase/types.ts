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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: Json | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_call_logs: {
        Row: {
          company_id: string | null
          completion_tokens: number | null
          cost_estimate_usd: number | null
          created_at: string
          error_text: string | null
          function_name: string
          id: string
          latency_ms: number | null
          model_used: string
          prompt_tokens: number | null
          success: boolean
          task_type: string | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completion_tokens?: number | null
          cost_estimate_usd?: number | null
          created_at?: string
          error_text?: string | null
          function_name: string
          id?: string
          latency_ms?: number | null
          model_used: string
          prompt_tokens?: number | null
          success?: boolean
          task_type?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completion_tokens?: number | null
          cost_estimate_usd?: number | null
          created_at?: string
          error_text?: string | null
          function_name?: string
          id?: string
          latency_ms?: number | null
          model_used?: string
          prompt_tokens?: number | null
          success?: boolean
          task_type?: string | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          hashed_key: string
          id: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          hashed_key: string
          id?: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          hashed_key?: string
          id?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_notifications: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          deliverable_id: string | null
          description: string | null
          id: string
          invoice_id: string | null
          notification_type: string
          period_end: string | null
          period_start: string | null
          processed_at: string | null
          project_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number
          client_id?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          notification_type: string
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          project_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          notification_type?: string
          period_end?: string | null
          period_start?: string | null
          processed_at?: string | null
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_notifications_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_notifications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_deep_dives: {
        Row: {
          action_plan: Json | null
          company_id: string
          created_at: string
          extended_analysis: string
          id: string
          insight_category: string | null
          insight_id: string | null
          insight_title: string
          suggested_project: Json | null
          suggested_task: Json | null
          user_id: string
        }
        Insert: {
          action_plan?: Json | null
          company_id: string
          created_at?: string
          extended_analysis: string
          id?: string
          insight_category?: string | null
          insight_id?: string | null
          insight_title: string
          suggested_project?: Json | null
          suggested_task?: Json | null
          user_id: string
        }
        Update: {
          action_plan?: Json | null
          company_id?: string
          created_at?: string
          extended_analysis?: string
          id?: string
          insight_category?: string | null
          insight_id?: string | null
          insight_title?: string
          suggested_project?: Json | null
          suggested_task?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_deep_dives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_deep_dives_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "brain_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_insights: {
        Row: {
          body: string
          category: string
          citations: Json | null
          company_id: string
          created_at: string
          evidence: Json | null
          id: string
          is_actioned: boolean
          is_dismissed: boolean
          market_context: string | null
          neuro_rationale: string | null
          neuro_tactic: string | null
          nlp_metadata: Json | null
          priority: string
          subcategory: string | null
          title: string
        }
        Insert: {
          body: string
          category?: string
          citations?: Json | null
          company_id: string
          created_at?: string
          evidence?: Json | null
          id?: string
          is_actioned?: boolean
          is_dismissed?: boolean
          market_context?: string | null
          neuro_rationale?: string | null
          neuro_tactic?: string | null
          nlp_metadata?: Json | null
          priority?: string
          subcategory?: string | null
          title: string
        }
        Update: {
          body?: string
          category?: string
          citations?: Json | null
          company_id?: string
          created_at?: string
          evidence?: Json | null
          id?: string
          is_actioned?: boolean
          is_dismissed?: boolean
          market_context?: string | null
          neuro_rationale?: string | null
          neuro_tactic?: string | null
          nlp_metadata?: Json | null
          priority?: string
          subcategory?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          brief_type: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brief_type: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          data?: Json
          id?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brief_type?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_attendees: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          client_id: string | null
          color: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          event_type: string
          google_event_id: string | null
          id: string
          location: string | null
          project_id: string | null
          recurrence_rule: string | null
          start_time: string
          title: string
          updated_at: string | null
          video_link: string | null
        }
        Insert: {
          all_day?: boolean | null
          client_id?: string | null
          color?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          event_type?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          recurrence_rule?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          video_link?: string | null
        }
        Update: {
          all_day?: boolean | null
          client_id?: string | null
          color?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          event_type?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          project_id?: string | null
          recurrence_rule?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          project_id: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          project_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean
          last_message_at: string | null
          name: string
          project_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          name: string
          project_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string | null
          name?: string
          project_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          message_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          message_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_tags: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message_id: string
          tag: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_tags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean
          is_pinned: boolean
          message_type: string
          metadata: Json | null
          parent_message_id: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          is_pinned?: boolean
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          is_pinned?: boolean
          message_type?: string
          metadata?: Json | null
          parent_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_enrichment_log: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          sources: Json | null
          suggestion_count: number
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          sources?: Json | null
          suggestion_count?: number
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          sources?: Json | null
          suggestion_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_enrichment_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_enrichment_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access_tokens: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          last_used_at: string | null
          pin_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          require_pin: boolean
          revoked_at: string | null
          token_hash: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          require_pin?: boolean
          revoked_at?: string | null
          token_hash: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          last_used_at?: string | null
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          require_pin?: boolean
          revoked_at?: string | null
          token_hash?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_user_access: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_user_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          ad_accounts: Json | null
          additional_websites: Json | null
          address: string | null
          company_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          secondary_phone: string | null
          sector: string | null
          social_accounts: Json | null
          status: string | null
          strategy: Json | null
          tags: string[] | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ad_accounts?: Json | null
          additional_websites?: Json | null
          address?: string | null
          company_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          secondary_phone?: string | null
          sector?: string | null
          social_accounts?: Json | null
          status?: string | null
          strategy?: Json | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ad_accounts?: Json | null
          additional_websites?: Json | null
          address?: string | null
          company_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          secondary_phone?: string | null
          sector?: string | null
          social_accounts?: Json | null
          status?: string | null
          strategy?: Json | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_attachments: {
        Row: {
          comment_id: string
          content_type: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string
        }
        Insert: {
          comment_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by: string
        }
        Update: {
          comment_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          deliverable_id: string | null
          id: string
          project_id: string | null
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          deliverable_id?: string | null
          id?: string
          project_id?: string | null
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deliverable_id?: string | null
          id?: string
          project_id?: string | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          allow_domain_requests: boolean
          company_size: string | null
          created_at: string
          domain: string
          domain_verified: boolean
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          onboarding_preset: Json | null
          settings: Json | null
          sso_enforced: boolean
          updated_at: string
          workspace_type: string | null
        }
        Insert: {
          allow_domain_requests?: boolean
          company_size?: string | null
          created_at?: string
          domain: string
          domain_verified?: boolean
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          onboarding_preset?: Json | null
          settings?: Json | null
          sso_enforced?: boolean
          updated_at?: string
          workspace_type?: string | null
        }
        Update: {
          allow_domain_requests?: boolean
          company_size?: string | null
          created_at?: string
          domain?: string
          domain_verified?: boolean
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          onboarding_preset?: Json | null
          settings?: Json | null
          sso_enforced?: boolean
          updated_at?: string
          workspace_type?: string | null
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          color: string | null
          company_id: string
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          avatar_url: string | null
          category: string | null
          client_id: string | null
          company_id: string
          created_at: string | null
          email: string | null
          entity_type: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          secondary_phone: string | null
          sector: string | null
          tags: string[] | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          category?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          entity_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          secondary_phone?: string | null
          sector?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          category?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          entity_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          secondary_phone?: string | null
          sector?: string | null
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          billing_frequency: string | null
          company_id: string
          contract_number: string | null
          contract_type: string | null
          created_at: string
          end_date: string | null
          file_path: string | null
          id: string
          payment_terms: string | null
          project_id: string
          signed_date: string | null
          start_date: string | null
          status: string | null
          tender_id: string | null
          terms: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          billing_frequency?: string | null
          company_id: string
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string
          end_date?: string | null
          file_path?: string | null
          id?: string
          payment_terms?: string | null
          project_id: string
          signed_date?: string | null
          start_date?: string | null
          status?: string | null
          tender_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          billing_frequency?: string | null
          company_id?: string
          contract_number?: string | null
          contract_type?: string | null
          created_at?: string
          end_date?: string | null
          file_path?: string | null
          id?: string
          payment_terms?: string | null
          project_id?: string
          signed_date?: string | null
          start_date?: string | null
          status?: string | null
          tender_id?: string | null
          terms?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverables: {
        Row: {
          assigned_to: string | null
          budget: number | null
          completed: boolean | null
          cost: number | null
          created_at: string
          department_id: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          budget?: number | null
          completed?: boolean | null
          cost?: number | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          budget?: number | null
          completed?: boolean | null
          cost?: number | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverables_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          head_user_id: string | null
          id: string
          name: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          name: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          head_user_id?: string | null
          id?: string
          name?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_head_user_id_fkey"
            columns: ["head_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          company_id: string
          created_at: string
          display_name: string | null
          email_address: string
          encrypted_password: string
          id: string
          imap_host: string
          imap_port: number
          is_active: boolean
          last_sync_at: string | null
          smtp_host: string
          smtp_port: number
          updated_at: string
          use_tls: boolean
          user_id: string
          username: string
        }
        Insert: {
          company_id: string
          created_at?: string
          display_name?: string | null
          email_address: string
          encrypted_password: string
          id?: string
          imap_host: string
          imap_port?: number
          is_active?: boolean
          last_sync_at?: string | null
          smtp_host: string
          smtp_port?: number
          updated_at?: string
          use_tls?: boolean
          user_id: string
          username: string
        }
        Update: {
          company_id?: string
          created_at?: string
          display_name?: string | null
          email_address?: string
          encrypted_password?: string
          id?: string
          imap_host?: string
          imap_port?: number
          is_active?: boolean
          last_sync_at?: string | null
          smtp_host?: string
          smtp_port?: number
          updated_at?: string
          use_tls?: boolean
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_attachments: {
        Row: {
          created_at: string | null
          filename: string
          gmail_attachment_id: string | null
          id: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filename: string
          gmail_attachment_id?: string | null
          id?: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filename?: string
          gmail_attachment_id?: string | null
          id?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_entity_links: {
        Row: {
          created_at: string | null
          email_message_id: string | null
          entity_id: string
          entity_type: string
          id: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_message_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_message_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_entity_links_email_message_id_fkey"
            columns: ["email_message_id"]
            isOneToOne: false
            referencedRelation: "email_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_messages: {
        Row: {
          account_id: string
          body_html: string | null
          body_text: string | null
          brief_parsed_at: string | null
          cc_addresses: Json | null
          created_at: string
          folder: string
          from_address: string | null
          from_name: string | null
          id: string
          is_brief_candidate: boolean | null
          is_read: boolean
          is_starred: boolean
          message_id_header: string | null
          message_uid: string | null
          sent_at: string | null
          subject: string | null
          thread_id: string | null
          to_addresses: Json | null
          user_id: string
        }
        Insert: {
          account_id: string
          body_html?: string | null
          body_text?: string | null
          brief_parsed_at?: string | null
          cc_addresses?: Json | null
          created_at?: string
          folder?: string
          from_address?: string | null
          from_name?: string | null
          id?: string
          is_brief_candidate?: boolean | null
          is_read?: boolean
          is_starred?: boolean
          message_id_header?: string | null
          message_uid?: string | null
          sent_at?: string | null
          subject?: string | null
          thread_id?: string | null
          to_addresses?: Json | null
          user_id: string
        }
        Update: {
          account_id?: string
          body_html?: string | null
          body_text?: string | null
          brief_parsed_at?: string | null
          cc_addresses?: Json | null
          created_at?: string
          folder?: string
          from_address?: string | null
          from_name?: string | null
          id?: string
          is_brief_candidate?: boolean | null
          is_read?: boolean
          is_starred?: boolean
          message_id_header?: string | null
          message_uid?: string | null
          sent_at?: string | null
          subject?: string | null
          thread_id?: string | null
          to_addresses?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_cost_overrides: {
        Row: {
          company_id: string
          created_at: string | null
          effective_from: string | null
          employee_id: string
          hourly_cost: number
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          effective_from?: string | null
          employee_id: string
          hourly_cost: number
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          effective_from?: string | null
          employee_id?: string
          hourly_cost?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_cost_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_cost_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approval_status: string
          approved_by: string | null
          category: string | null
          client_id: string | null
          created_at: string
          description: string
          expense_date: string
          expense_type: string
          file_path: string | null
          id: string
          notes: string | null
          project_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          approval_status?: string
          approved_by?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          expense_type?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          approval_status?: string
          approved_by?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          expense_type?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          metadata: Json | null
          rollout_type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          metadata?: Json | null
          rollout_type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          metadata?: Json | null
          rollout_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      file_attachments: {
        Row: {
          ai_analysis: Json | null
          company_id: string | null
          content_type: string | null
          created_at: string
          deliverable_id: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          project_id: string | null
          task_id: string | null
          tender_id: string | null
          uploaded_by: string
        }
        Insert: {
          ai_analysis?: Json | null
          company_id?: string | null
          content_type?: string | null
          created_at?: string
          deliverable_id?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          project_id?: string | null
          task_id?: string | null
          tender_id?: string | null
          uploaded_by: string
        }
        Update: {
          ai_analysis?: Json | null
          company_id?: string | null
          content_type?: string | null
          created_at?: string
          deliverable_id?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          project_id?: string | null
          task_id?: string | null
          tender_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_attachments_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      file_folders: {
        Row: {
          color: string | null
          company_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          parent_folder_id: string | null
          project_id: string | null
          tender_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          parent_folder_id?: string | null
          project_id?: string | null
          tender_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          project_id?: string | null
          tender_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "file_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_folders_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_oauth_tokens: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          display_name: string | null
          email_address: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          refresh_token: string
          scopes: string[] | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          display_name?: string | null
          email_address: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token: string
          scopes?: string[] | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          display_name?: string | null
          email_address?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          refresh_token?: string
          scopes?: string[] | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_oauth_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_access_grants: {
        Row: {
          asset_id: string
          company_id: string
          created_at: string
          granted_by: string | null
          granted_on: string | null
          id: string
          last_review_date: string | null
          notes: string | null
          person_email: string | null
          person_name: string
          person_type: string
          removal_date: string | null
          review_cycle_days: number
          role_id: string | null
          role_name_override: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          company_id: string
          created_at?: string
          granted_by?: string | null
          granted_on?: string | null
          id?: string
          last_review_date?: string | null
          notes?: string | null
          person_email?: string | null
          person_name: string
          person_type?: string
          removal_date?: string | null
          review_cycle_days?: number
          role_id?: string | null
          role_name_override?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          company_id?: string
          created_at?: string
          granted_by?: string | null
          granted_on?: string | null
          id?: string
          last_review_date?: string | null
          notes?: string | null
          person_email?: string | null
          person_name?: string
          person_type?: string
          removal_date?: string | null
          review_cycle_days?: number
          role_id?: string | null
          role_name_override?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_access_grants_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gov_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_access_grants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_access_grants_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "gov_access_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_access_roles: {
        Row: {
          company_id: string
          id: string
          permissions_description: string | null
          platform_id: string
          role_name: string
        }
        Insert: {
          company_id: string
          id?: string
          permissions_description?: string | null
          platform_id: string
          role_name: string
        }
        Update: {
          company_id?: string
          id?: string
          permissions_description?: string | null
          platform_id?: string
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_access_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_access_roles_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "gov_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_assets: {
        Row: {
          asset_external_id: string | null
          asset_name: string
          asset_type: string
          billing_owner: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by_person: string | null
          id: string
          notes: string | null
          owner_entity: string | null
          platform_id: string
          status: string
          updated_at: string
          url: string | null
        }
        Insert: {
          asset_external_id?: string | null
          asset_name: string
          asset_type: string
          billing_owner?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by_person?: string | null
          id?: string
          notes?: string | null
          owner_entity?: string | null
          platform_id: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          asset_external_id?: string | null
          asset_name?: string
          asset_type?: string
          billing_owner?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by_person?: string | null
          id?: string
          notes?: string | null
          owner_entity?: string | null
          platform_id?: string
          status?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_assets_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "gov_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_audit_events: {
        Row: {
          actor_name: string
          after_state: Json | null
          asset_id: string | null
          before_state: Json | null
          client_id: string | null
          company_id: string
          created_at: string
          event_type: string
          id: string
          notes: string | null
        }
        Insert: {
          actor_name: string
          after_state?: Json | null
          asset_id?: string | null
          before_state?: Json | null
          client_id?: string | null
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
        }
        Update: {
          actor_name?: string
          after_state?: Json | null
          asset_id?: string | null
          before_state?: Json | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_audit_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gov_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_audit_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_checklists: {
        Row: {
          company_id: string
          created_at: string
          id: string
          items: Json
          template_type: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          items?: Json
          template_type: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          items?: Json
          template_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_checklists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_platforms: {
        Row: {
          category: string
          company_id: string
          created_at: string
          icon_name: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          icon_name?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          icon_name?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_platforms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_review_tasks: {
        Row: {
          asset_id: string
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          due_date: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          asset_id: string
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          asset_id?: string
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_review_tasks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gov_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_review_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_review_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_security_controls: {
        Row: {
          asset_id: string
          backup_admin_present: boolean
          company_id: string
          created_at: string
          id: string
          last_password_change_date: string | null
          mfa_enabled: boolean
          mfa_method: string
          password_rotation_policy: string
          personal_login_used: boolean
          recovery_email: string | null
          recovery_phone: string | null
          risk_level: string
          risk_score: number
          updated_at: string
        }
        Insert: {
          asset_id: string
          backup_admin_present?: boolean
          company_id: string
          created_at?: string
          id?: string
          last_password_change_date?: string | null
          mfa_enabled?: boolean
          mfa_method?: string
          password_rotation_policy?: string
          personal_login_used?: boolean
          recovery_email?: string | null
          recovery_phone?: string | null
          risk_level?: string
          risk_score?: number
          updated_at?: string
        }
        Update: {
          asset_id?: string
          backup_admin_present?: boolean
          company_id?: string
          created_at?: string
          id?: string
          last_password_change_date?: string | null
          mfa_enabled?: boolean
          mfa_method?: string
          password_rotation_policy?: string
          personal_login_used?: boolean
          recovery_email?: string | null
          recovery_phone?: string | null
          risk_level?: string
          risk_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_security_controls_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "gov_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_security_controls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_vault_references: {
        Row: {
          asset_id: string
          company_id: string
          created_at: string
          id: string
          last_verified_date: string | null
          vault_entry_name: string | null
          vault_location: string | null
          vault_provider: string
        }
        Insert: {
          asset_id: string
          company_id: string
          created_at?: string
          id?: string
          last_verified_date?: string | null
          vault_entry_name?: string | null
          vault_location?: string | null
          vault_provider?: string
        }
        Update: {
          asset_id?: string
          company_id?: string
          created_at?: string
          id?: string
          last_verified_date?: string | null
          vault_entry_name?: string | null
          vault_location?: string | null
          vault_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_vault_references_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gov_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_vault_references_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          notes: string | null
          uploaded_by: string
          user_id: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          notes?: string | null
          uploaded_by: string
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          notes?: string | null
          uploaded_by?: string
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_request_history: {
        Row: {
          action: string
          actor_id: string
          comment: string | null
          created_at: string
          id: string
          request_id: string
          stage_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          comment?: string | null
          created_at?: string
          id?: string
          request_id: string
          stage_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          request_id?: string
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_request_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "intake_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_request_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "intake_workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_requests: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          current_stage_id: string | null
          description: string | null
          form_data: Json | null
          id: string
          project_id: string | null
          requested_by: string
          status: string
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          current_stage_id?: string | null
          description?: string | null
          form_data?: Json | null
          id?: string
          project_id?: string | null
          requested_by: string
          status?: string
          title: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          current_stage_id?: string | null
          description?: string | null
          form_data?: Json | null
          id?: string
          project_id?: string | null
          requested_by?: string
          status?: string
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "intake_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "intake_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_workflow_connections: {
        Row: {
          condition: Json | null
          created_at: string | null
          from_stage_id: string | null
          id: string
          label: string | null
          sort_order: number | null
          to_stage_id: string | null
          workflow_id: string
        }
        Insert: {
          condition?: Json | null
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          label?: string | null
          sort_order?: number | null
          to_stage_id?: string | null
          workflow_id: string
        }
        Update: {
          condition?: Json | null
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          label?: string | null
          sort_order?: number | null
          to_stage_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_workflow_connections_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "intake_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_workflow_connections_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "intake_workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_workflow_connections_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "intake_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_workflow_stages: {
        Row: {
          approver_role: string | null
          approver_user_id: string | null
          auto_advance: boolean
          created_at: string
          custom_fields: Json | null
          field_set_type: string | null
          id: string
          linked_template_id: string | null
          min_approvals: number | null
          name: string
          notification_config: Json | null
          notify_on_enter: boolean
          on_enter_actions: Json | null
          on_exit_actions: Json | null
          position_x: number | null
          position_y: number | null
          required_fields: Json | null
          responsible_roles: string[] | null
          sla_hours: number | null
          sla_reason: string | null
          sla_unit: string | null
          sort_order: number
          stage_type: string
          workflow_id: string
        }
        Insert: {
          approver_role?: string | null
          approver_user_id?: string | null
          auto_advance?: boolean
          created_at?: string
          custom_fields?: Json | null
          field_set_type?: string | null
          id?: string
          linked_template_id?: string | null
          min_approvals?: number | null
          name: string
          notification_config?: Json | null
          notify_on_enter?: boolean
          on_enter_actions?: Json | null
          on_exit_actions?: Json | null
          position_x?: number | null
          position_y?: number | null
          required_fields?: Json | null
          responsible_roles?: string[] | null
          sla_hours?: number | null
          sla_reason?: string | null
          sla_unit?: string | null
          sort_order?: number
          stage_type?: string
          workflow_id: string
        }
        Update: {
          approver_role?: string | null
          approver_user_id?: string | null
          auto_advance?: boolean
          created_at?: string
          custom_fields?: Json | null
          field_set_type?: string | null
          id?: string
          linked_template_id?: string | null
          min_approvals?: number | null
          name?: string
          notification_config?: Json | null
          notify_on_enter?: boolean
          on_enter_actions?: Json | null
          on_exit_actions?: Json | null
          position_x?: number | null
          position_y?: number | null
          required_fields?: Json | null
          responsible_roles?: string[] | null
          sla_hours?: number | null
          sla_reason?: string | null
          sla_unit?: string | null
          sort_order?: number
          stage_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_workflow_stages_linked_template_id_fkey"
            columns: ["linked_template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_workflow_stages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "intake_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_workflows: {
        Row: {
          auto_create_project: boolean
          company_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_draft: boolean | null
          name: string
          project_template_id: string | null
          published_version: number | null
          updated_at: string
          version: number | null
        }
        Insert: {
          auto_create_project?: boolean
          company_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_draft?: boolean | null
          name: string
          project_template_id?: string | null
          published_version?: number | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          auto_create_project?: boolean
          company_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_draft?: boolean | null
          name?: string
          project_template_id?: string | null
          published_version?: number | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_workflows_project_template_id_fkey"
            columns: ["project_template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          access_scope: Database["public"]["Enums"]["access_scope"]
          client_ids: string[] | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          permissions: Database["public"]["Enums"]["permission_type"][] | null
          project_ids: string[] | null
          role: Database["public"]["Enums"]["company_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          access_scope?: Database["public"]["Enums"]["access_scope"]
          client_ids?: string[] | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          permissions?: Database["public"]["Enums"]["permission_type"][] | null
          project_ids?: string[] | null
          role?: Database["public"]["Enums"]["company_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          access_scope?: Database["public"]["Enums"]["access_scope"]
          client_ids?: string[] | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          permissions?: Database["public"]["Enums"]["permission_type"][] | null
          project_ids?: string[] | null
          role?: Database["public"]["Enums"]["company_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          contract_id: string | null
          created_at: string
          due_date: string | null
          file_path: string | null
          id: string
          invoice_number: string
          issued_date: string
          net_amount: number | null
          notes: string | null
          paid: boolean | null
          paid_amount: number | null
          paid_date: string | null
          project_id: string
          status: string
          updated_at: string
          vat_amount: number | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          due_date?: string | null
          file_path?: string | null
          id?: string
          invoice_number: string
          issued_date?: string
          net_amount?: number | null
          notes?: string | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          project_id: string
          status?: string
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          contract_id?: string | null
          created_at?: string
          due_date?: string | null
          file_path?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string
          net_amount?: number | null
          notes?: string | null
          paid?: boolean | null
          paid_amount?: number | null
          paid_date?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          vat_amount?: number | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_chunks: {
        Row: {
          article_id: string
          chunk_index: number
          company_id: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          tokens: number | null
        }
        Insert: {
          article_id: string
          chunk_index: number
          company_id: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          tokens?: number | null
        }
        Update: {
          article_id?: string
          chunk_index?: number
          company_id?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_chunks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_links: {
        Row: {
          company_id: string
          created_at: string
          from_article_id: string
          id: string
          to_article_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          from_article_id: string
          id?: string
          to_article_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          from_article_id?: string
          id?: string
          to_article_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_links_from_article_id_fkey"
            columns: ["from_article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_links_to_article_id_fkey"
            columns: ["to_article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_versions: {
        Row: {
          article_id: string
          body: string
          change_notes: string | null
          changed_by: string | null
          created_at: string
          id: string
          title: string
          version: number
        }
        Insert: {
          article_id: string
          body?: string
          change_notes?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          title: string
          version: number
        }
        Update: {
          article_id?: string
          body?: string
          change_notes?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          action_items: Json | null
          article_type: string
          attendees: string[] | null
          body: string
          category_id: string | null
          client_id: string | null
          company_id: string
          created_at: string
          decisions: Json | null
          gov_asset_id: string | null
          id: string
          next_review_date: string | null
          owner_id: string | null
          project_id: string | null
          source_links: string[] | null
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          version: number
          visibility: string
        }
        Insert: {
          action_items?: Json | null
          article_type?: string
          attendees?: string[] | null
          body?: string
          category_id?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          decisions?: Json | null
          gov_asset_id?: string | null
          id?: string
          next_review_date?: string | null
          owner_id?: string | null
          project_id?: string | null
          source_links?: string[] | null
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Update: {
          action_items?: Json | null
          article_type?: string
          attendees?: string[] | null
          body?: string
          category_id?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          decisions?: Json | null
          gov_asset_id?: string | null
          id?: string
          next_review_date?: string | null
          owner_id?: string | null
          project_id?: string | null
          source_links?: string[] | null
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_gov_asset_id_fkey"
            columns: ["gov_asset_id"]
            isOneToOne: false
            referencedRelation: "gov_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          level: number
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          level?: number
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_raw_sources: {
        Row: {
          company_id: string
          compiled: boolean
          compiled_at: string | null
          content: string
          created_at: string
          embedded_at: string | null
          embedding: string | null
          id: string
          source_type: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          compiled?: boolean
          compiled_at?: string | null
          content?: string
          created_at?: string
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          source_type?: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          compiled?: boolean
          compiled_at?: string | null
          content?: string
          created_at?: string
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          source_type?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_raw_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_template_usage: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          id: string
          project_id: string | null
          template_id: string
          used_by: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          project_id?: string | null
          template_id: string
          used_by?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          project_id?: string | null
          template_id?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_template_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_template_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_template_usage_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "kb_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_template_usage_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_templates: {
        Row: {
          company_id: string
          content: Json | null
          created_at: string
          default_tasks: Json | null
          description: string | null
          id: string
          owner_id: string | null
          status: string
          template_type: string
          title: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          company_id: string
          content?: Json | null
          created_at?: string
          default_tasks?: Json | null
          description?: string | null
          id?: string
          owner_id?: string | null
          status?: string
          template_type?: string
          title: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          company_id?: string
          content?: Json | null
          created_at?: string
          default_tasks?: Json | null
          description?: string | null
          id?: string
          owner_id?: string | null
          status?: string
          template_type?: string
          title?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "kb_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_templates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          carried_over: number
          company_id: string
          created_at: string
          entitled_days: number
          id: string
          leave_type_id: string
          pending_days: number
          updated_at: string
          used_days: number
          user_id: string
          year: number
        }
        Insert: {
          carried_over?: number
          company_id: string
          created_at?: string
          entitled_days?: number
          id?: string
          leave_type_id: string
          pending_days?: number
          updated_at?: string
          used_days?: number
          user_id: string
          year: number
        }
        Update: {
          carried_over?: number
          company_id?: string
          created_at?: string
          entitled_days?: number
          id?: string
          leave_type_id?: string
          pending_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string
          created_at: string
          days_count: number
          end_date: string
          half_day: boolean | null
          id: string
          leave_type_id: string
          reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_count?: number
          end_date: string
          half_day?: boolean | null
          id?: string
          leave_type_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_count?: number
          end_date?: string
          half_day?: boolean | null
          id?: string
          leave_type_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          color: string | null
          company_id: string
          created_at: string
          default_days: number | null
          id: string
          is_active: boolean | null
          name: string
          requires_approval: boolean | null
        }
        Insert: {
          code: string
          color?: string | null
          company_id: string
          created_at?: string
          default_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_approval?: boolean | null
        }
        Update: {
          code?: string
          color?: string | null
          company_id?: string
          created_at?: string
          default_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_approval?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_channels: {
        Row: {
          channel_name: string
          company_id: string | null
          group_name: string
          id: string
          is_default: boolean | null
          sort_order: number | null
        }
        Insert: {
          channel_name: string
          company_id?: string | null
          group_name: string
          id?: string
          is_default?: boolean | null
          sort_order?: number | null
        }
        Update: {
          channel_name?: string
          company_id?: string | null
          group_name?: string
          id?: string
          is_default?: boolean | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_channels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_item_attachments: {
        Row: {
          content_type: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          media_plan_item_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          media_plan_item_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          media_plan_item_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_item_attachments_media_plan_item_id_fkey"
            columns: ["media_plan_item_id"]
            isOneToOne: false
            referencedRelation: "media_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_item_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_item_tasks: {
        Row: {
          created_at: string | null
          id: string
          media_plan_item_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_plan_item_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_plan_item_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_item_tasks_media_plan_item_id_fkey"
            columns: ["media_plan_item_id"]
            isOneToOne: false
            referencedRelation: "media_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_item_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_items: {
        Row: {
          actual_cost: number | null
          approval_needed: boolean | null
          approved_at: string | null
          approved_by: string | null
          audience: string | null
          budget: number | null
          campaign_name: string | null
          category: string | null
          clicks: number | null
          color: string | null
          commission_rate: number | null
          cost_type: string | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          daily_budget: number | null
          deliverable_id: string | null
          dependency_id: string | null
          duration: number | null
          end_date: string | null
          format: string | null
          frequency: number | null
          funnel_stage: string | null
          geography: string | null
          id: string
          impressions: number | null
          invoice_id: string | null
          is_locked: boolean | null
          kpi_target: string | null
          media_plan_id: string | null
          medium: string
          message_summary: string | null
          net_budget: number | null
          notes: string | null
          objective: string | null
          owner_id: string | null
          phase: string | null
          placement: string | null
          priority: string | null
          project_id: string
          reach: number | null
          sort_order: number | null
          start_date: string | null
          status: string | null
          subchannel: string | null
          tags: string[] | null
          target_audience: string | null
          task_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          approval_needed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          audience?: string | null
          budget?: number | null
          campaign_name?: string | null
          category?: string | null
          clicks?: number | null
          color?: string | null
          commission_rate?: number | null
          cost_type?: string | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          deliverable_id?: string | null
          dependency_id?: string | null
          duration?: number | null
          end_date?: string | null
          format?: string | null
          frequency?: number | null
          funnel_stage?: string | null
          geography?: string | null
          id?: string
          impressions?: number | null
          invoice_id?: string | null
          is_locked?: boolean | null
          kpi_target?: string | null
          media_plan_id?: string | null
          medium: string
          message_summary?: string | null
          net_budget?: number | null
          notes?: string | null
          objective?: string | null
          owner_id?: string | null
          phase?: string | null
          placement?: string | null
          priority?: string | null
          project_id: string
          reach?: number | null
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          subchannel?: string | null
          tags?: string[] | null
          target_audience?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          approval_needed?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          audience?: string | null
          budget?: number | null
          campaign_name?: string | null
          category?: string | null
          clicks?: number | null
          color?: string | null
          commission_rate?: number | null
          cost_type?: string | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          daily_budget?: number | null
          deliverable_id?: string | null
          dependency_id?: string | null
          duration?: number | null
          end_date?: string | null
          format?: string | null
          frequency?: number | null
          funnel_stage?: string | null
          geography?: string | null
          id?: string
          impressions?: number | null
          invoice_id?: string | null
          is_locked?: boolean | null
          kpi_target?: string | null
          media_plan_id?: string | null
          medium?: string
          message_summary?: string | null
          net_budget?: number | null
          notes?: string | null
          objective?: string | null
          owner_id?: string | null
          phase?: string | null
          placement?: string | null
          priority?: string | null
          project_id?: string
          reach?: number | null
          sort_order?: number | null
          start_date?: string | null
          status?: string | null
          subchannel?: string | null
          tags?: string[] | null
          target_audience?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_dependency_id_fkey"
            columns: ["dependency_id"]
            isOneToOne: false
            referencedRelation: "media_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plan_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          media_plan_id: string
          name: string
          snapshot_data: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_plan_id: string
          name?: string
          snapshot_data: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          media_plan_id?: string
          name?: string
          snapshot_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plan_snapshots_media_plan_id_fkey"
            columns: ["media_plan_id"]
            isOneToOne: false
            referencedRelation: "media_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      media_plans: {
        Row: {
          agency_fee_percentage: number | null
          client_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          objective: string | null
          owner_id: string | null
          period_end: string | null
          period_start: string | null
          project_id: string
          status: string
          total_budget: number | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agency_fee_percentage?: number | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          objective?: string | null
          owner_id?: string | null
          period_end?: string | null
          period_start?: string | null
          project_id: string
          status?: string
          total_budget?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agency_fee_percentage?: number | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          objective?: string | null
          owner_id?: string | null
          period_end?: string | null
          period_start?: string | null
          project_id?: string
          status?: string
          total_budget?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chart_positions: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          department: string | null
          id: string
          level: number | null
          parent_position_id: string | null
          position_title: string
          sort_order: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          department?: string | null
          id?: string
          level?: number | null
          parent_position_id?: string | null
          position_title: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          department?: string | null
          id?: string
          level?: number | null
          parent_position_id?: string | null
          position_title?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_positions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_positions_parent_position_id_fkey"
            columns: ["parent_position_id"]
            isOneToOne: false
            referencedRelation: "org_chart_positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_items: {
        Row: {
          duration_months: number | null
          id: string
          package_id: string
          quantity: number | null
          service_id: string
          sort_order: number | null
          unit_price: number
        }
        Insert: {
          duration_months?: number | null
          id?: string
          package_id: string
          quantity?: number | null
          service_id: string
          sort_order?: number | null
          unit_price?: number
        }
        Update: {
          duration_months?: number | null
          id?: string
          package_id?: string
          quantity?: number | null
          service_id?: string
          sort_order?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          department_id: string | null
          email: string
          full_name: string | null
          hire_date: string | null
          id: string
          job_title: string | null
          onboarding_completed: boolean
          phone: string | null
          reports_to: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          work_status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          email: string
          full_name?: string | null
          hire_date?: string | null
          id: string
          job_title?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          reports_to?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          work_status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          email?: string
          full_name?: string | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          reports_to?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          work_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_reports_to_fkey"
            columns: ["reports_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contact_access: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          project_id: string
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          project_id: string
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contact_access_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contact_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contracts: {
        Row: {
          company_id: string
          contract_type: string | null
          created_at: string | null
          end_date: string | null
          extracted_data: Json | null
          file_attachment_id: string | null
          id: string
          parties: Json | null
          project_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          company_id: string
          contract_type?: string | null
          created_at?: string | null
          end_date?: string | null
          extracted_data?: Json | null
          file_attachment_id?: string | null
          id?: string
          parties?: Json | null
          project_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          company_id?: string
          contract_type?: string | null
          created_at?: string | null
          end_date?: string | null
          extracted_data?: Json | null
          file_attachment_id?: string | null
          id?: string
          parties?: Json | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_file_attachment_id_fkey"
            columns: ["file_attachment_id"]
            isOneToOne: false
            referencedRelation: "file_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_creatives: {
        Row: {
          company_id: string
          content_type: string | null
          created_at: string | null
          deliverable_id: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          media_plan_item_id: string | null
          project_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_id: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string
          version: string | null
        }
        Insert: {
          company_id: string
          content_type?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          media_plan_item_id?: string | null
          project_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by: string
          version?: string | null
        }
        Update: {
          company_id?: string
          content_type?: string | null
          created_at?: string | null
          deliverable_id?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          media_plan_item_id?: string | null
          project_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_id?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_creatives_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_media_plan_item_id_fkey"
            columns: ["media_plan_item_id"]
            isOneToOne: false
            referencedRelation: "media_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_creatives_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_financial_milestones: {
        Row: {
          collected_amount: number | null
          collected_at: string | null
          company_id: string
          costing_amount: number | null
          costing_at: string | null
          costing_notes: string | null
          created_at: string
          delivery_at: string | null
          delivery_notes: string | null
          id: string
          invoice_id: string | null
          invoiced_at: string | null
          is_internal_costing: boolean
          project_id: string
          proposal_accepted_at: string | null
          proposal_amount: number | null
          proposal_reference: string | null
          proposal_rejected_at: string | null
          proposal_sent_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          collected_amount?: number | null
          collected_at?: string | null
          company_id: string
          costing_amount?: number | null
          costing_at?: string | null
          costing_notes?: string | null
          created_at?: string
          delivery_at?: string | null
          delivery_notes?: string | null
          id?: string
          invoice_id?: string | null
          invoiced_at?: string | null
          is_internal_costing?: boolean
          project_id: string
          proposal_accepted_at?: string | null
          proposal_amount?: number | null
          proposal_reference?: string | null
          proposal_rejected_at?: string | null
          proposal_sent_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          collected_amount?: number | null
          collected_at?: string | null
          company_id?: string
          costing_amount?: number | null
          costing_at?: string | null
          costing_notes?: string | null
          created_at?: string
          delivery_at?: string | null
          delivery_notes?: string | null
          id?: string
          invoice_id?: string | null
          invoiced_at?: string | null
          is_internal_costing?: boolean
          project_id?: string
          proposal_accepted_at?: string | null
          proposal_amount?: number | null
          proposal_reference?: string | null
          proposal_rejected_at?: string | null
          proposal_sent_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_financial_milestones_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_milestones_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_financial_milestones_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_folder_templates: {
        Row: {
          company_id: string
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_folder_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_folders: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          parent_folder_id: string | null
          sort_order: number
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          parent_folder_id?: string | null
          sort_order?: number
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "project_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_access: {
        Row: {
          created_at: string
          id: string
          project_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_access_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_deliverables: {
        Row: {
          created_at: string | null
          default_budget: number | null
          description: string | null
          id: string
          name: string
          sort_order: number | null
          template_id: string
        }
        Insert: {
          created_at?: string | null
          default_budget?: number | null
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          template_id: string
        }
        Update: {
          created_at?: string | null
          default_budget?: number | null
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_deliverables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_tasks: {
        Row: {
          created_at: string | null
          days_offset_due: number | null
          days_offset_start: number | null
          deliverable_ref_order: number | null
          description: string | null
          estimated_hours: number | null
          id: string
          priority: string | null
          sort_order: number | null
          task_category: string | null
          task_type: string | null
          template_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          days_offset_due?: number | null
          days_offset_start?: number | null
          deliverable_ref_order?: number | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          sort_order?: number | null
          task_category?: string | null
          task_type?: string | null
          template_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          days_offset_due?: number | null
          days_offset_start?: number | null
          deliverable_ref_order?: number | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          sort_order?: number | null
          task_category?: string | null
          task_type?: string | null
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          company_id: string
          created_at: string | null
          default_agency_fee_percentage: number | null
          default_budget: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          default_agency_fee_percentage?: number | null
          default_budget?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_type: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          default_agency_fee_percentage?: number | null
          default_budget?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_user_access: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_user_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_manager_id: string | null
          agency_fee_percentage: number | null
          budget: number | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          folder_id: string | null
          id: string
          is_internal: boolean
          lost_reason: string | null
          metadata: Json | null
          name: string
          parent_project_id: string | null
          probability: number | null
          progress: number | null
          project_lead_id: string | null
          sidebar_sort_order: number | null
          source: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          submission_deadline: string | null
          tender_type: string | null
          updated_at: string
          won_date: string | null
        }
        Insert: {
          account_manager_id?: string | null
          agency_fee_percentage?: number | null
          budget?: number | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          folder_id?: string | null
          id?: string
          is_internal?: boolean
          lost_reason?: string | null
          metadata?: Json | null
          name: string
          parent_project_id?: string | null
          probability?: number | null
          progress?: number | null
          project_lead_id?: string | null
          sidebar_sort_order?: number | null
          source?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_deadline?: string | null
          tender_type?: string | null
          updated_at?: string
          won_date?: string | null
        }
        Update: {
          account_manager_id?: string | null
          agency_fee_percentage?: number | null
          budget?: number | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          folder_id?: string | null
          id?: string
          is_internal?: boolean
          lost_reason?: string | null
          metadata?: Json | null
          name?: string
          parent_project_id?: string | null
          probability?: number | null
          progress?: number | null
          project_lead_id?: string | null
          sidebar_sort_order?: number | null
          source?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_deadline?: string | null
          tender_type?: string | null
          updated_at?: string
          won_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "project_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_project_id_fkey"
            columns: ["parent_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_project_lead_id_fkey"
            columns: ["project_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_items: {
        Row: {
          custom_description: string | null
          custom_name: string | null
          discount_percent: number | null
          duration_months: number | null
          id: string
          item_type: string | null
          package_id: string | null
          proposal_id: string
          quantity: number | null
          service_id: string | null
          sort_order: number | null
          unit_cost: number
          unit_price: number
        }
        Insert: {
          custom_description?: string | null
          custom_name?: string | null
          discount_percent?: number | null
          duration_months?: number | null
          id?: string
          item_type?: string | null
          package_id?: string | null
          proposal_id: string
          quantity?: number | null
          service_id?: string | null
          sort_order?: number | null
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          custom_description?: string | null
          custom_name?: string | null
          discount_percent?: number | null
          duration_months?: number | null
          id?: string
          item_type?: string | null
          package_id?: string | null
          proposal_id?: string
          quantity?: number | null
          service_id?: string | null
          sort_order?: number | null
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          proposal_id: string
          snapshot_data: Json
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          proposal_id: string
          snapshot_data: Json
          version: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          proposal_id?: string
          snapshot_data?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_snapshots_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          assumptions: string | null
          client_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          discount_percent: number | null
          id: string
          name: string
          notes: string | null
          status: string | null
          updated_at: string | null
          valid_until: string | null
          version: number | null
        }
        Insert: {
          assumptions?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          name: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Update: {
          assumptions?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          discount_percent?: number | null
          id?: string
          name?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quick_notes: {
        Row: {
          company_id: string
          content: string
          created_at: string
          date: string
          id: string
          is_pinned: boolean | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content?: string
          created_at?: string
          date?: string
          id?: string
          is_pinned?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          date?: string
          id?: string
          is_pinned?: boolean | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_audit_log: {
        Row: {
          action: string
          actor_id: string
          company_id: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          company_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          company_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_default_costs: {
        Row: {
          company_id: string
          created_at: string | null
          hourly_cost: number
          id: string
          level: string | null
          role_title: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          hourly_cost?: number
          id?: string
          level?: string | null
          role_title: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          hourly_cost?: number
          id?: string
          level?: string | null
          role_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_default_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      secretary_conversations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretary_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretary_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      secretary_memory: {
        Row: {
          category: string
          client_id: string | null
          company_id: string
          content: string
          created_at: string | null
          embedded_at: string | null
          embedding: string | null
          id: string
          key: string
          metadata: Json | null
          project_id: string | null
          source_conversation_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string
          client_id?: string | null
          company_id: string
          content: string
          created_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          key: string
          metadata?: Json | null
          project_id?: string | null
          source_conversation_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          client_id?: string | null
          company_id?: string
          content?: string
          created_at?: string | null
          embedded_at?: string | null
          embedding?: string | null
          id?: string
          key?: string
          metadata?: Json | null
          project_id?: string | null
          source_conversation_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretary_memory_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretary_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretary_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretary_memory_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "secretary_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      secretary_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretary_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "secretary_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          discount_percent: number | null
          duration_type: string
          duration_value: number
          id: string
          is_active: boolean | null
          list_price: number
          name: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_type?: string
          duration_value?: number
          id?: string
          is_active?: boolean | null
          list_price?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          duration_type?: string
          duration_value?: number
          id?: string
          is_active?: boolean | null
          list_price?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_role_costs: {
        Row: {
          company_id: string
          cost_source: string | null
          created_at: string | null
          department_id: string | null
          employee_id: string | null
          estimated_hours: number
          hourly_cost: number
          id: string
          level: string | null
          role_title: string
          service_id: string
          total_cost: number | null
        }
        Insert: {
          company_id: string
          cost_source?: string | null
          created_at?: string | null
          department_id?: string | null
          employee_id?: string | null
          estimated_hours?: number
          hourly_cost?: number
          id?: string
          level?: string | null
          role_title: string
          service_id: string
          total_cost?: number | null
        }
        Update: {
          company_id?: string
          cost_source?: string | null
          created_at?: string | null
          department_id?: string | null
          employee_id?: string | null
          estimated_hours?: number
          hourly_cost?: number
          id?: string
          level?: string | null
          role_title?: string
          service_id?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_role_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_role_costs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_role_costs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_role_costs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived_at: string | null
          category: string
          company_id: string
          created_at: string
          deliverables: string[] | null
          department_id: string | null
          description: string | null
          estimated_turnaround: string | null
          external_cost: number | null
          id: string
          internal_cost: number | null
          is_active: boolean
          list_price: number
          name: string
          notes: string | null
          pricing_model: string | null
          pricing_unit: string
          role_hours: Json | null
          role_rates: Json | null
          sort_order: number
          subcategory: string | null
          target_margin: number | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          company_id: string
          created_at?: string
          deliverables?: string[] | null
          department_id?: string | null
          description?: string | null
          estimated_turnaround?: string | null
          external_cost?: number | null
          id?: string
          internal_cost?: number | null
          is_active?: boolean
          list_price?: number
          name: string
          notes?: string | null
          pricing_model?: string | null
          pricing_unit?: string
          role_hours?: Json | null
          role_rates?: Json | null
          sort_order?: number
          subcategory?: string | null
          target_margin?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          company_id?: string
          created_at?: string
          deliverables?: string[] | null
          department_id?: string | null
          description?: string | null
          estimated_turnaround?: string | null
          external_cost?: number | null
          id?: string
          internal_cost?: number | null
          is_active?: boolean
          list_price?: number
          name?: string
          notes?: string | null
          pricing_model?: string | null
          pricing_unit?: string
          role_hours?: Json | null
          role_rates?: Json | null
          sort_order?: number
          subcategory?: string | null
          target_margin?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_tags: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          resolved_at: string | null
          review_type: string
          reviewer_id: string
          status: string
          task_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          review_type?: string
          reviewer_id: string
          status?: string
          task_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          resolved_at?: string | null
          review_type?: string
          reviewer_id?: string
          status?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          assigned_role: string | null
          company_id: string
          created_at: string
          default_priority: string | null
          depends_on_template_id: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          phase: string | null
          sort_order: number | null
          template_type: string
          updated_at: string
        }
        Insert: {
          assigned_role?: string | null
          company_id: string
          created_at?: string
          default_priority?: string | null
          depends_on_template_id?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          phase?: string | null
          sort_order?: number | null
          template_type: string
          updated_at?: string
        }
        Update: {
          assigned_role?: string | null
          company_id?: string
          created_at?: string
          default_priority?: string | null
          depends_on_template_id?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          phase?: string | null
          sort_order?: number | null
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_depends_on_template_id_fkey"
            columns: ["depends_on_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_hours: number | null
          approver: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          deliverable_id: string | null
          department_id: string | null
          depends_on: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          internal_reviewer: string | null
          is_ai_generated: boolean | null
          is_recurring: boolean | null
          parent_task_id: string | null
          priority: string | null
          progress: number | null
          project_id: string
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          rescheduled_from: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_category: string | null
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          approver?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          department_id?: string | null
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          internal_reviewer?: string | null
          is_ai_generated?: boolean | null
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: string | null
          progress?: number | null
          project_id: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          rescheduled_from?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_category?: string | null
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          approver?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          deliverable_id?: string | null
          department_id?: string | null
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          internal_reviewer?: string | null
          is_ai_generated?: boolean | null
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: string | null
          progress?: number | null
          project_id?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          rescheduled_from?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_category?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_internal_reviewer_fkey"
            columns: ["internal_reviewer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          team_lead_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_team_lead_id_fkey"
            columns: ["team_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_deliverables: {
        Row: {
          budget: number | null
          completed: boolean | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          tender_id: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          tender_id: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_deliverables_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_evaluation_criteria: {
        Row: {
          created_at: string
          criterion: string
          id: string
          max_score: number
          notes: string | null
          our_score: number | null
          sort_order: number | null
          tender_id: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          criterion: string
          id?: string
          max_score?: number
          notes?: string | null
          our_score?: number | null
          sort_order?: number | null
          tender_id: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          criterion?: string
          id?: string
          max_score?: number
          notes?: string | null
          our_score?: number | null
          sort_order?: number | null
          tender_id?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_evaluation_criteria_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_suggestions: {
        Row: {
          applied: boolean
          created_at: string
          data: Json
          id: string
          selected: boolean
          suggestion_type: string
          tender_id: string
          updated_at: string
        }
        Insert: {
          applied?: boolean
          created_at?: string
          data: Json
          id?: string
          selected?: boolean
          suggestion_type: string
          tender_id: string
          updated_at?: string
        }
        Update: {
          applied?: boolean
          created_at?: string
          data?: Json
          id?: string
          selected?: boolean
          suggestion_type?: string
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_suggestions_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          tender_deliverable_id: string | null
          tender_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          tender_deliverable_id?: string | null
          tender_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          tender_deliverable_id?: string | null
          tender_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_tasks_tender_deliverable_id_fkey"
            columns: ["tender_deliverable_id"]
            isOneToOne: false
            referencedRelation: "tender_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_tasks_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_team_access: {
        Row: {
          created_at: string
          id: string
          role: string | null
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string | null
          tender_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string | null
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_team_access_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          budget: number | null
          client_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          probability: number | null
          progress: number | null
          source_email: string | null
          stage: Database["public"]["Enums"]["tender_stage"]
          submission_deadline: string | null
          tender_type: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          probability?: number | null
          progress?: number | null
          source_email?: string | null
          stage?: Database["public"]["Enums"]["tender_stage"]
          submission_deadline?: string | null
          tender_type?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          probability?: number | null
          progress?: number | null
          source_email?: string | null
          stage?: Database["public"]["Enums"]["tender_stage"]
          submission_deadline?: string | null
          tender_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_running: boolean | null
          project_id: string
          start_time: string
          task_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_running?: boolean | null
          project_id: string
          start_time?: string
          task_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_running?: boolean | null
          project_id?: string
          start_time?: string
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access_assignments: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          id: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_access_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_roles: {
        Row: {
          access_scope: Database["public"]["Enums"]["access_scope"]
          company_id: string
          created_at: string
          id: string
          last_login_at: string | null
          role: Database["public"]["Enums"]["company_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["access_scope"]
          company_id: string
          created_at?: string
          id?: string
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["access_scope"]
          company_id?: string
          created_at?: string
          id?: string
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted: boolean
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted?: boolean
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted?: boolean
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          company_id: string
          created_at: string
          given_by: string | null
          id: string
          points: number
          reason: string
          skill_tag: string | null
          source_entity_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          given_by?: string | null
          id?: string
          points?: number
          reason: string
          skill_tag?: string | null
          source_entity_id?: string | null
          source_type?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          given_by?: string | null
          id?: string
          points?: number
          reason?: string
          skill_tag?: string | null
          source_entity_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_xp_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_xp_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp_summary: {
        Row: {
          company_id: string
          id: string
          kudos_received: number
          level: number
          on_time_streak: number
          tasks_completed: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          kudos_received?: number
          level?: number
          on_time_streak?: number
          tasks_completed?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          kudos_received?: number
          level?: number
          on_time_streak?: number
          tasks_completed?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_summary_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_xp_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret: string | null
          subscribed_events: string[]
          target_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          subscribed_events?: string[]
          target_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          subscribed_events?: string[]
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      work_day_logs: {
        Row: {
          actual_minutes: number
          auto_started: boolean
          clock_in: string
          clock_out: string | null
          company_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          scheduled_minutes: number
          status: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number
          auto_started?: boolean
          clock_in?: string
          clock_out?: string | null
          company_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          scheduled_minutes?: number
          status?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number
          auto_started?: boolean
          clock_in?: string
          clock_out?: string | null
          company_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          scheduled_minutes?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_day_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_day_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          company_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_working_day: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_working_day?: boolean
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_working_day?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      email_accounts_safe: {
        Row: {
          company_id: string | null
          created_at: string | null
          display_name: string | null
          email_address: string | null
          id: string | null
          imap_host: string | null
          imap_port: number | null
          is_active: boolean | null
          last_sync_at: string | null
          smtp_host: string | null
          smtp_port: number | null
          updated_at: string | null
          use_tls: boolean | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email_address?: string | null
          id?: string | null
          imap_host?: string | null
          imap_port?: number | null
          is_active?: boolean | null
          last_sync_at?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email_address?: string | null
          id?: string | null
          imap_host?: string | null
          imap_port?: number | null
          is_active?: boolean | null
          last_sync_at?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_accounts_safe: {
        Row: {
          company_id: string | null
          created_at: string | null
          display_name: string | null
          email_address: string | null
          id: string | null
          is_active: boolean | null
          last_sync_at: string | null
          scopes: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email_address?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          display_name?: string | null
          email_address?: string | null
          id?: string | null
          is_active?: boolean | null
          last_sync_at?: string | null
          scopes?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gmail_oauth_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _hash_token: { Args: { _token: string }; Returns: string }
      accept_invitation: { Args: { _token: string }; Returns: Json }
      approve_join_request: {
        Args: {
          _request_id: string
          _role?: Database["public"]["Enums"]["company_role"]
        }
        Returns: Json
      }
      auto_onboard_user: { Args: never; Returns: Json }
      award_xp: {
        Args: {
          p_company_id: string
          p_given_by?: string
          p_points: number
          p_reason: string
          p_skill_tag?: string
          p_source_entity_id?: string
          p_source_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_company_with_owner: {
        Args: { _domain: string; _name: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_company_root_folders: {
        Args: { _company_id: string }
        Returns: string
      }
      find_companies_by_domain: {
        Args: { _domain: string }
        Returns: {
          allow_domain_requests: boolean
          id: string
          logo_url: string
          name: string
        }[]
      }
      get_department_users: { Args: { dept_id: string }; Returns: string[] }
      get_portal_client_ids: { Args: { _user_id: string }; Returns: string[] }
      get_subordinate_users: { Args: { manager_id: string }; Returns: string[] }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      get_user_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["company_role"]
      }
      get_visible_projects: { Args: { p_user_id: string }; Returns: string[] }
      get_visible_tasks: { Args: { p_user_id: string }; Returns: string[] }
      has_client_access: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      has_hierarchical_access: {
        Args: { target_user_id: string; viewer_id: string }
        Returns: boolean
      }
      has_new_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["permission_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_chat_channel_admin: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_chat_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin_or_manager: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_portal_user: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _company_id: string; _user_id: string }; Returns: boolean }
      match_kb_chunks: {
        Args: {
          _company_id: string
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          article_id: string
          chunk_id: string
          content: string
          similarity: number
        }[]
      }
      match_secretary_memories: {
        Args: {
          _client_id?: string
          _project_id?: string
          _user_id: string
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          category: string
          client_id: string
          content: string
          key: string
          memory_id: string
          project_id: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      portal_consume_token: {
        Args: { _pin?: string; _token: string }
        Returns: Json
      }
      portal_create_token: {
        Args: {
          _client_id: string
          _company_id: string
          _email: string
          _expires_in_days?: number
          _pin?: string
          _token: string
          _user_id: string
        }
        Returns: string
      }
      portal_validate_token: {
        Args: { _pin?: string; _token: string }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reject_join_request: { Args: { _request_id: string }; Returns: Json }
      search_chat_messages: {
        Args: { _company_id: string; _limit?: number; _query: string }
        Returns: {
          channel_id: string
          channel_name: string
          content: string
          created_at: string
          id: string
          sender_name: string
          user_id: string
        }[]
      }
    }
    Enums: {
      access_scope: "company" | "assigned" | "department" | "team"
      app_role: "admin" | "manager" | "employee" | "client"
      company_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "standard"
        | "client"
        | "owner"
        | "viewer"
        | "billing"
        | "member"
      document_type:
        | "contract"
        | "brief"
        | "proposal"
        | "report"
        | "invoice"
        | "presentation"
        | "creative"
        | "vendor_doc"
        | "correspondence"
        | "other"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      permission_type:
        | "users.view"
        | "users.invite"
        | "users.edit"
        | "users.suspend"
        | "users.delete"
        | "clients.view"
        | "clients.create"
        | "clients.edit"
        | "clients.delete"
        | "projects.view"
        | "projects.create"
        | "projects.edit"
        | "projects.delete"
        | "tasks.view"
        | "tasks.create"
        | "tasks.edit"
        | "tasks.delete"
        | "tasks.assign"
        | "deliverables.view"
        | "deliverables.create"
        | "deliverables.edit"
        | "deliverables.delete"
        | "deliverables.approve"
        | "financials.view"
        | "financials.create"
        | "financials.edit"
        | "financials.delete"
        | "reports.view"
        | "reports.export"
        | "tenders.view"
        | "tenders.create"
        | "tenders.edit"
        | "tenders.delete"
        | "files.view"
        | "files.upload"
        | "files.delete"
        | "comments.view"
        | "comments.create"
        | "comments.edit"
        | "comments.delete"
        | "settings.company"
        | "settings.billing"
        | "settings.security"
        | "settings.integrations"
        | "audit.view"
      project_status:
        | "tender"
        | "active"
        | "completed"
        | "cancelled"
        | "lead"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      task_status:
        | "todo"
        | "in_progress"
        | "review"
        | "completed"
        | "internal_review"
        | "client_review"
      tender_stage:
        | "identification"
        | "preparation"
        | "submitted"
        | "evaluation"
        | "won"
        | "lost"
      user_status:
        | "invited"
        | "pending"
        | "active"
        | "suspended"
        | "deactivated"
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
      access_scope: ["company", "assigned", "department", "team"],
      app_role: ["admin", "manager", "employee", "client"],
      company_role: [
        "super_admin",
        "admin",
        "manager",
        "standard",
        "client",
        "owner",
        "viewer",
        "billing",
        "member",
      ],
      document_type: [
        "contract",
        "brief",
        "proposal",
        "report",
        "invoice",
        "presentation",
        "creative",
        "vendor_doc",
        "correspondence",
        "other",
      ],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      permission_type: [
        "users.view",
        "users.invite",
        "users.edit",
        "users.suspend",
        "users.delete",
        "clients.view",
        "clients.create",
        "clients.edit",
        "clients.delete",
        "projects.view",
        "projects.create",
        "projects.edit",
        "projects.delete",
        "tasks.view",
        "tasks.create",
        "tasks.edit",
        "tasks.delete",
        "tasks.assign",
        "deliverables.view",
        "deliverables.create",
        "deliverables.edit",
        "deliverables.delete",
        "deliverables.approve",
        "financials.view",
        "financials.create",
        "financials.edit",
        "financials.delete",
        "reports.view",
        "reports.export",
        "tenders.view",
        "tenders.create",
        "tenders.edit",
        "tenders.delete",
        "files.view",
        "files.upload",
        "files.delete",
        "comments.view",
        "comments.create",
        "comments.edit",
        "comments.delete",
        "settings.company",
        "settings.billing",
        "settings.security",
        "settings.integrations",
        "audit.view",
      ],
      project_status: [
        "tender",
        "active",
        "completed",
        "cancelled",
        "lead",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      task_status: [
        "todo",
        "in_progress",
        "review",
        "completed",
        "internal_review",
        "client_review",
      ],
      tender_stage: [
        "identification",
        "preparation",
        "submitted",
        "evaluation",
        "won",
        "lost",
      ],
      user_status: ["invited", "pending", "active", "suspended", "deactivated"],
    },
  },
} as const
