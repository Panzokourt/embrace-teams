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
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_notifications: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
      briefs: {
        Row: {
          brief_type: string
          client_id: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          address: string | null
          company_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
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
          created_at: string
          domain: string
          domain_verified: boolean
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          sso_enforced: boolean
          updated_at: string
        }
        Insert: {
          allow_domain_requests?: boolean
          created_at?: string
          domain: string
          domain_verified?: boolean
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          sso_enforced?: boolean
          updated_at?: string
        }
        Update: {
          allow_domain_requests?: boolean
          created_at?: string
          domain?: string
          domain_verified?: boolean
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          sso_enforced?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          billing_frequency: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          budget: number | null
          completed: boolean | null
          cost: number | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          completed?: boolean | null
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          completed?: boolean | null
          cost?: number | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
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
      file_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          deliverable_id: string | null
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
          content_type?: string | null
          created_at?: string
          deliverable_id?: string | null
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
          content_type?: string | null
          created_at?: string
          deliverable_id?: string | null
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
      media_plan_items: {
        Row: {
          actual_cost: number | null
          budget: number | null
          campaign_name: string | null
          clicks: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          deliverable_id: string | null
          end_date: string | null
          id: string
          impressions: number | null
          invoice_id: string | null
          medium: string
          notes: string | null
          placement: string | null
          project_id: string
          start_date: string | null
          status: string | null
          target_audience: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          campaign_name?: string | null
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          deliverable_id?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          invoice_id?: string | null
          medium: string
          notes?: string | null
          placement?: string | null
          project_id: string
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          campaign_name?: string | null
          clicks?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          deliverable_id?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          invoice_id?: string | null
          medium?: string
          notes?: string | null
          placement?: string | null
          project_id?: string
          start_date?: string | null
          status?: string | null
          target_audience?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_plan_items_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "deliverables"
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
          phone: string | null
          reports_to: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
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
          phone?: string | null
          reports_to?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
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
          phone?: string | null
          reports_to?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          agency_fee_percentage: number | null
          budget: number | null
          client_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          lost_reason: string | null
          metadata: Json | null
          name: string
          probability: number | null
          progress: number | null
          source: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          submission_deadline: string | null
          tender_type: string | null
          updated_at: string
          won_date: string | null
        }
        Insert: {
          agency_fee_percentage?: number | null
          budget?: number | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          lost_reason?: string | null
          metadata?: Json | null
          name: string
          probability?: number | null
          progress?: number | null
          source?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_deadline?: string | null
          tender_type?: string | null
          updated_at?: string
          won_date?: string | null
        }
        Update: {
          agency_fee_percentage?: number | null
          budget?: number | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          lost_reason?: string | null
          metadata?: Json | null
          name?: string
          probability?: number | null
          progress?: number | null
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
      services: {
        Row: {
          category: string
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          internal_cost: number | null
          is_active: boolean
          list_price: number
          name: string
          pricing_unit: string
          role_hours: Json | null
          role_rates: Json | null
          sort_order: number
          target_margin: number | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          internal_cost?: number | null
          is_active?: boolean
          list_price?: number
          name: string
          pricing_unit?: string
          role_hours?: Json | null
          role_rates?: Json | null
          sort_order?: number
          target_margin?: number | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          internal_cost?: number | null
          is_active?: boolean
          list_price?: number
          name?: string
          pricing_unit?: string
          role_hours?: Json | null
          role_rates?: Json | null
          sort_order?: number
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
            foreignKeyName: "services_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          assigned_role: string | null
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
          depends_on: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          is_ai_generated: boolean | null
          is_recurring: boolean | null
          parent_task_id: string | null
          priority: string | null
          progress: number | null
          project_id: string
          recurrence_end_date: string | null
          recurrence_pattern: string | null
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
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_ai_generated?: boolean | null
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: string | null
          progress?: number | null
          project_id: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
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
          depends_on?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          is_ai_generated?: boolean | null
          is_recurring?: boolean | null
          parent_task_id?: string | null
          priority?: string | null
          progress?: number | null
          project_id?: string
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
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
            foreignKeyName: "tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          team_lead_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string | null
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: Json }
      approve_join_request: {
        Args: {
          _request_id: string
          _role?: Database["public"]["Enums"]["company_role"]
        }
        Returns: Json
      }
      auto_onboard_user: { Args: never; Returns: Json }
      create_company_with_owner: {
        Args: { _domain: string; _name: string }
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
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      reject_join_request: { Args: { _request_id: string }; Returns: Json }
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
      task_status: "todo" | "in_progress" | "review" | "completed"
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
      task_status: ["todo", "in_progress", "review", "completed"],
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
