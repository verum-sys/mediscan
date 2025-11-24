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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          created_at: string | null
          document_id: string | null
          elapsed_ms: number | null
          error_message: string | null
          file_name: string | null
          id: string
          module_id: string | null
          status: Database["public"]["Enums"]["document_status"] | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          elapsed_ms?: number | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          elapsed_ms?: number | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          module_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          cleaned_text: string | null
          clinic_name: string | null
          created_at: string | null
          department: string | null
          diagnosis: string | null
          doctor_name: string | null
          dosage: string | null
          filename: string
          hospital_name: string | null
          id: string
          module_id: string | null
          prescribed_medicines: string | null
          processing_method:
            | Database["public"]["Enums"]["processing_method"]
            | null
          processing_time_ms: number | null
          raw_text: string | null
          report_generated_date: string | null
          sample_collection_date: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          symptoms: string | null
          test_name: string | null
          test_results: string | null
        }
        Insert: {
          cleaned_text?: string | null
          clinic_name?: string | null
          created_at?: string | null
          department?: string | null
          diagnosis?: string | null
          doctor_name?: string | null
          dosage?: string | null
          filename: string
          hospital_name?: string | null
          id?: string
          module_id?: string | null
          prescribed_medicines?: string | null
          processing_method?:
            | Database["public"]["Enums"]["processing_method"]
            | null
          processing_time_ms?: number | null
          raw_text?: string | null
          report_generated_date?: string | null
          sample_collection_date?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          symptoms?: string | null
          test_name?: string | null
          test_results?: string | null
        }
        Update: {
          cleaned_text?: string | null
          clinic_name?: string | null
          created_at?: string | null
          department?: string | null
          diagnosis?: string | null
          doctor_name?: string | null
          dosage?: string | null
          filename?: string
          hospital_name?: string | null
          id?: string
          module_id?: string | null
          prescribed_medicines?: string | null
          processing_method?:
            | Database["public"]["Enums"]["processing_method"]
            | null
          processing_time_ms?: number | null
          raw_text?: string | null
          report_generated_date?: string | null
          sample_collection_date?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          symptoms?: string | null
          test_name?: string | null
          test_results?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_tasks: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          model: string | null
          output: string | null
          prompt: string | null
          status: Database["public"]["Enums"]["llm_task_status"] | null
          tokens_used: number | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          model?: string | null
          output?: string | null
          prompt?: string | null
          status?: Database["public"]["Enums"]["llm_task_status"] | null
          tokens_used?: number | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          model?: string | null
          output?: string | null
          prompt?: string | null
          status?: Database["public"]["Enums"]["llm_task_status"] | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_tasks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status: "pending" | "processing" | "completed" | "failed"
      llm_task_status: "pending" | "processing" | "completed" | "failed"
      processing_method: "inline" | "batch" | "image"
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
      document_status: ["pending", "processing", "completed", "failed"],
      llm_task_status: ["pending", "processing", "completed", "failed"],
      processing_method: ["inline", "batch", "image"],
    },
  },
} as const
