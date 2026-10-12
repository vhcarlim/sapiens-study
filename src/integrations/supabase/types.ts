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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          date: string
          external_key: string | null
          id: string
          knowledge_summary: string | null
          minutes: number
          notes: string | null
          quantity: number
          source_id: string | null
          status: string
          title: string
          track_id: string | null
          type: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          date?: string
          external_key?: string | null
          id?: string
          knowledge_summary?: string | null
          minutes?: number
          notes?: string | null
          quantity?: number
          source_id?: string | null
          status?: string
          title: string
          track_id?: string | null
          type?: string
          user_id?: string
          xp?: number
        }
        Update: {
          created_at?: string
          date?: string
          external_key?: string | null
          id?: string
          knowledge_summary?: string | null
          minutes?: number
          notes?: string | null
          quantity?: number
          source_id?: string | null
          status?: string
          title?: string
          track_id?: string | null
          type?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "activities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_track_owner_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      activity_skills: {
        Row: {
          activity_id: string
          skill_id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          skill_id: string
          user_id?: string
        }
        Update: {
          activity_id?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_skills_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      import_snapshots: {
        Row: {
          data: Json
          source_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          source_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          data?: Json
          source_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_snapshots_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      review_ai_access: {
        Row: {
          denied: boolean
          reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          denied?: boolean
          reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          denied?: boolean
          reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_results: {
        Row: {
          activity_id: string
          created_at: string
          feedback: string
          id: string
          mastery_delta: number
          round_id: string
          score: number
          thread_id: string
          track_id: string
          user_id: string
          xp: number
        }
        Insert: {
          activity_id: string
          created_at?: string
          feedback: string
          id?: string
          mastery_delta: number
          round_id: string
          score: number
          thread_id: string
          track_id: string
          user_id: string
          xp?: number
        }
        Update: {
          activity_id?: string
          created_at?: string
          feedback?: string
          id?: string
          mastery_delta?: number
          round_id?: string
          score?: number
          thread_id?: string
          track_id?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_results_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_results_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "review_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_results_track_id_user_id_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      review_threads: {
        Row: {
          activity_id: string
          busy_until: string | null
          id: string
          interval_days: number
          last_score: number | null
          messages: Json
          next_review_at: string
          question_open: boolean
          round_id: string | null
          stage: number
          track_id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          busy_until?: string | null
          id?: string
          interval_days?: number
          last_score?: number | null
          messages?: Json
          next_review_at?: string
          question_open?: boolean
          round_id?: string | null
          stage?: number
          track_id: string
          user_id: string
        }
        Update: {
          activity_id?: string
          busy_until?: string | null
          id?: string
          interval_days?: number
          last_score?: number | null
          messages?: Json
          next_review_at?: string
          question_open?: boolean
          round_id?: string | null
          stage?: number
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_threads_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_threads_track_id_user_id_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      skill_mastery: {
        Row: {
          last_score: number | null
          mastery: number
          review_xp: number
          reviews: number
          skill_id: string
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_score?: number | null
          mastery?: number
          review_xp?: number
          reviews?: number
          skill_id: string
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_score?: number | null
          mastery?: number
          review_xp?: number
          reviews?: number
          skill_id?: string
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_mastery_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: true
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_mastery_track_id_user_id_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      skills: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          track_id?: string | null
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_track_owner_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      sources: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          kind: string
          last_sync_error: string | null
          last_synced_at: string | null
          name: string
          track_id: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          kind?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          name: string
          track_id?: string | null
          user_id?: string
          username?: string | null
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          kind?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          name?: string
          track_id?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_track_owner_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      streak_freezes: {
        Row: {
          cost: number
          id: string
          protected_day: string
          purchased_at: string
          track_id: string
          user_id: string
        }
        Insert: {
          cost?: number
          id?: string
          protected_day: string
          purchased_at?: string
          track_id: string
          user_id: string
        }
        Update: {
          cost?: number
          id?: string
          protected_day?: string
          purchased_at?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_freezes_track_id_user_id_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      study_tracks: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_active_review: {
        Args: { p_thread: string; p_user: string }
        Returns: boolean
      }
      finish_active_review: {
        Args: {
          p_feedback: string
          p_messages: Json
          p_round: string
          p_score: number
          p_thread: string
          p_user: string
        }
        Returns: undefined
      }
      purchase_streak_freeze: { Args: { p_track: string }; Returns: undefined }
      streak_protection_state: { Args: { p_track: string }; Returns: Json }
      study_xp_balance: { Args: { p_track: string }; Returns: number }
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
    Enums: {},
  },
} as const
