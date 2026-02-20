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
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          group_members: Json | null
          id: string
          is_group: boolean
          joined_at: string
          participant_name: string
          room_id: string
        }
        Insert: {
          group_members?: Json | null
          id?: string
          is_group?: boolean
          joined_at?: string
          participant_name: string
          room_id: string
        }
        Update: {
          group_members?: Json | null
          id?: string
          is_group?: boolean
          joined_at?: string
          participant_name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "virtual_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_submissions: {
        Row: {
          actions: Json
          id: string
          participant_id: string
          room_id: string
          score: number
          step_index: number
          submitted_at: string
          time_spent_seconds: number
        }
        Insert: {
          actions?: Json
          id?: string
          participant_id: string
          room_id: string
          score?: number
          step_index?: number
          submitted_at?: string
          time_spent_seconds?: number
        }
        Update: {
          actions?: Json
          id?: string
          participant_id?: string
          room_id?: string
          score?: number
          step_index?: number
          submitted_at?: string
          time_spent_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_submissions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "room_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_submissions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "virtual_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      simulator_cases: {
        Row: {
          case_data: Json
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          is_ai_generated: boolean
          simulator_slug: string
          title: string
        }
        Insert: {
          case_data?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          is_ai_generated?: boolean
          simulator_slug: string
          title: string
        }
        Update: {
          case_data?: Json
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          is_ai_generated?: boolean
          simulator_slug?: string
          title?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          fields: Json | null
          formula: Json | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          short_description: string | null
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          fields?: Json | null
          formula?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          short_description?: string | null
          slug: string
          type: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          fields?: Json | null
          formula?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          short_description?: string | null
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          created_at: string
          id: string
          tool_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          tool_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          tool_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      virtual_rooms: {
        Row: {
          case_id: string | null
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          pin: string
          simulator_slug: string
          title: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          pin: string
          simulator_slug: string
          title: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          pin?: string
          simulator_slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_rooms_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "simulator_cases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "professor"
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
      app_role: ["admin", "user", "professor"],
    },
  },
} as const
