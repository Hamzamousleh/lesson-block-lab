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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      class_insight_notes: {
        Row: {
          body: string
          class_id: string
          created_at: string
          id: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          class_id: string
          created_at?: string
          id?: string
          teacher_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          class_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_insight_notes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          school_year: string | null
          subject: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          school_year?: string | null
          subject: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          school_year?: string | null
          subject?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_blocks: {
        Row: {
          block_order: number
          content: Json
          created_at: string
          duration_minutes: number
          id: string
          is_fallback: boolean
          lesson_id: string
          student_instructions: string | null
          teacher_id: string
          teacher_notes: string | null
          title: string
          type: string
          updated_at: string
          variant_group: string | null
          variant_label: string | null
        }
        Insert: {
          block_order?: number
          content?: Json
          created_at?: string
          duration_minutes?: number
          id?: string
          is_fallback?: boolean
          lesson_id: string
          student_instructions?: string | null
          teacher_id: string
          teacher_notes?: string | null
          title?: string
          type: string
          updated_at?: string
          variant_group?: string | null
          variant_label?: string | null
        }
        Update: {
          block_order?: number
          content?: Json
          created_at?: string
          duration_minutes?: number
          id?: string
          is_fallback?: boolean
          lesson_id?: string
          student_instructions?: string | null
          teacher_id?: string
          teacher_notes?: string | null
          title?: string
          type?: string
          updated_at?: string
          variant_group?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string
          created_at: string
          duration_minutes: number
          id: string
          learning_goal: string | null
          lesson_date: string | null
          mode: Database["public"]["Enums"]["lesson_mode"]
          status: Database["public"]["Enums"]["lesson_status"]
          subject: string | null
          teacher_id: string
          teacher_note: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          learning_goal?: string | null
          lesson_date?: string | null
          mode?: Database["public"]["Enums"]["lesson_mode"]
          status?: Database["public"]["Enums"]["lesson_status"]
          subject?: string | null
          teacher_id: string
          teacher_note?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          learning_goal?: string | null
          lesson_date?: string | null
          mode?: Database["public"]["Enums"]["lesson_mode"]
          status?: Database["public"]["Enums"]["lesson_status"]
          subject?: string | null
          teacher_id?: string
          teacher_note?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          block_type: string | null
          created_at: string
          data: Json
          duration_minutes: number
          id: string
          item_type: Database["public"]["Enums"]["library_item_type"]
          subject: string | null
          tags: string[]
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          block_type?: string | null
          created_at?: string
          data?: Json
          duration_minutes?: number
          id?: string
          item_type: Database["public"]["Enums"]["library_item_type"]
          subject?: string | null
          tags?: string[]
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          block_type?: string | null
          created_at?: string
          data?: Json
          duration_minutes?: number
          id?: string
          item_type?: Database["public"]["Enums"]["library_item_type"]
          subject?: string | null
          tags?: string[]
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          completed_at: string | null
          display_name: string
          id: string
          joined_at: string
          last_seen_at: string
          participant_token: string
          progress_index: number
          session_id: string
        }
        Insert: {
          completed_at?: string | null
          display_name: string
          id?: string
          joined_at?: string
          last_seen_at?: string
          participant_token: string
          progress_index?: number
          session_id: string
        }
        Update: {
          completed_at?: string | null
          display_name?: string
          id?: string
          joined_at?: string
          last_seen_at?: string
          participant_token?: string
          progress_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_responses: {
        Row: {
          block_id: string
          id: string
          participant_id: string
          response_data: Json
          response_type: string
          session_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          block_id: string
          id?: string
          participant_id: string
          response_data?: Json
          response_type: string
          session_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          block_id?: string
          id?: string
          participant_id?: string
          response_data?: Json
          response_type?: string
          session_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_responses_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          allow_anonymous: boolean
          class_id: string | null
          created_at: string
          current_block_id: string | null
          ended_at: string | null
          id: string
          join_code: string
          lesson_id: string
          mode: Database["public"]["Enums"]["session_mode"]
          reveal_results: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          allow_anonymous?: boolean
          class_id?: string | null
          created_at?: string
          current_block_id?: string | null
          ended_at?: string | null
          id?: string
          join_code: string
          lesson_id: string
          mode?: Database["public"]["Enums"]["session_mode"]
          reveal_results?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          allow_anonymous?: boolean
          class_id?: string | null
          created_at?: string
          current_block_id?: string | null
          ended_at?: string | null
          id?: string
          join_code?: string
          lesson_id?: string
          mode?: Database["public"]["Enums"]["session_mode"]
          reveal_results?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_current_block_id_fkey"
            columns: ["current_block_id"]
            isOneToOne: false
            referencedRelation: "lesson_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          status: Database["public"]["Enums"]["unit_status"]
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["unit_status"]
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["unit_status"]
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      lesson_mode: "standard" | "rescue"
      lesson_status: "draft" | "ready" | "completed"
      library_item_type: "block" | "lesson" | "response_example"
      session_mode: "live" | "self_paced"
      session_status: "draft" | "active" | "ended"
      unit_status: "planned" | "active" | "completed"
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
      lesson_mode: ["standard", "rescue"],
      lesson_status: ["draft", "ready", "completed"],
      library_item_type: ["block", "lesson", "response_example"],
      session_mode: ["live", "self_paced"],
      session_status: ["draft", "active", "ended"],
      unit_status: ["planned", "active", "completed"],
    },
  },
} as const
