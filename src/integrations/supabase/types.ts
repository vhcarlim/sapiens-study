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
          material: string | null
          minutes: number
          notes: string | null
          perception: number | null
          phase: string | null
          quantity: number
          source_id: string | null
          status: string
          syllabus_topic: string | null
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
          material?: string | null
          minutes?: number
          notes?: string | null
          perception?: number | null
          phase?: string | null
          quantity?: number
          source_id?: string | null
          status?: string
          syllabus_topic?: string | null
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
          material?: string | null
          minutes?: number
          notes?: string | null
          perception?: number | null
          phase?: string | null
          quantity?: number
          source_id?: string | null
          status?: string
          syllabus_topic?: string | null
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
      ai_entitlements: {
        Row: {
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_preferences: {
        Row: {
          document_effort: string
          document_model: string
          monthly_token_goal: number | null
          study_effort: string
          study_model: string
          user_id: string
        }
        Insert: {
          document_effort?: string
          document_model?: string
          monthly_token_goal?: number | null
          study_effort?: string
          study_model?: string
          user_id: string
        }
        Update: {
          document_effort?: string
          document_model?: string
          monthly_token_goal?: number | null
          study_effort?: string
          study_model?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          byok: boolean
          cached_input_tokens: number | null
          created_at: string
          effort: string
          feature: string
          finished_at: string | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          reasoning_tokens: number | null
          run_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          byok?: boolean
          cached_input_tokens?: number | null
          created_at?: string
          effort: string
          feature: string
          finished_at?: string | null
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          reasoning_tokens?: number | null
          run_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          byok?: boolean
          cached_input_tokens?: number | null
          created_at?: string
          effort?: string
          feature?: string
          finished_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          reasoning_tokens?: number | null
          run_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      arena_question_history: {
        Row: {
          angle: string | null
          created_at: string
          fingerprint: string
          id: string
          repeated: boolean
          skill_id: string
          topic: string
          track_id: string
          user_id: string
        }
        Insert: {
          angle?: string | null
          created_at?: string
          fingerprint: string
          id?: string
          repeated?: boolean
          skill_id: string
          topic: string
          track_id: string
          user_id?: string
        }
        Update: {
          angle?: string | null
          created_at?: string
          fingerprint?: string
          id?: string
          repeated?: boolean
          skill_id?: string
          topic?: string
          track_id?: string
          user_id?: string
        }
        Relationships: []
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
      past_exams: {
        Row: {
          created_at: string
          id: string
          questions: Json
          score_correct: number | null
          score_total: number | null
          taken_at: string | null
          title: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          questions?: Json
          score_correct?: number | null
          score_total?: number | null
          taken_at?: string | null
          title: string
          track_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          questions?: Json
          score_correct?: number | null
          score_total?: number | null
          taken_at?: string | null
          title?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_exams_track_owner_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          board_key: string
          created_at: string
          created_by: string | null
          fingerprint: string
          id: string
          origin_label: string
          payload: Json
          report_count: number
          source: string
          status: string
          subject_key: string
          topic_key: string
        }
        Insert: {
          board_key: string
          created_at?: string
          created_by?: string | null
          fingerprint?: string
          id?: string
          origin_label?: string
          payload: Json
          report_count?: number
          source?: string
          status?: string
          subject_key: string
          topic_key: string
        }
        Update: {
          board_key?: string
          created_at?: string
          created_by?: string | null
          fingerprint?: string
          id?: string
          origin_label?: string
          payload?: Json
          report_count?: number
          source?: string
          status?: string
          subject_key?: string
          topic_key?: string
        }
        Relationships: []
      }
      question_bank_seen: {
        Row: {
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          question_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_seen_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_reports: {
        Row: {
          created_at: string
          id: string
          question_id: string
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          reason?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
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
          shared: boolean
          topics: string[]
          track_id: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          shared?: boolean
          topics?: string[]
          track_id?: string | null
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          shared?: boolean
          topics?: string[]
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
      study_learnings: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: string
          session_key: string | null
          skill_id: string | null
          source: string
          starred: boolean
          title: string
          topic: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          session_key?: string | null
          skill_id?: string | null
          source?: string
          starred?: boolean
          title: string
          topic?: string
          track_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          session_key?: string | null
          skill_id?: string | null
          source?: string
          starred?: boolean
          title?: string
          topic?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_learnings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_learnings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_overrides: {
        Row: {
          day_adjust: Json
          id: string
          pinned: string[]
          skipped: string[]
          track_id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          day_adjust?: Json
          id?: string
          pinned?: string[]
          skipped?: string[]
          track_id: string
          updated_at?: string
          user_id?: string
          week_start: string
        }
        Update: {
          day_adjust?: Json
          id?: string
          pinned?: string[]
          skipped?: string[]
          track_id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_overrides_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_settings: {
        Row: {
          block_minutes: number
          track_id: string
          updated_at: string
          user_id: string
          weekly_minutes: number[]
        }
        Insert: {
          block_minutes?: number
          track_id: string
          updated_at?: string
          user_id?: string
          weekly_minutes?: number[]
        }
        Update: {
          block_minutes?: number
          track_id?: string
          updated_at?: string
          user_id?: string
          weekly_minutes?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_settings_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "study_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_tracks: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          exam_board: string | null
          exam_date: string | null
          id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          exam_board?: string | null
          exam_date?: string | null
          id?: string
          name: string
          position?: number
          user_id?: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          exam_board?: string | null
          exam_date?: string | null
          id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      track_exam_blocks: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          total_questions: number
          track_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          total_questions?: number
          track_id: string
          user_id?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          total_questions?: number
          track_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "track_exam_blocks_track_owner_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      track_skill_rules: {
        Row: {
          block_id: string | null
          difficulty: number
          questions: number | null
          skill_id: string
          track_id: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          block_id?: string | null
          difficulty?: number
          questions?: number | null
          skill_id: string
          track_id: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Update: {
          block_id?: string | null
          difficulty?: number
          questions?: number | null
          skill_id?: string
          track_id?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "track_skill_rules_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "track_exam_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_skill_rules_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_skill_rules_track_owner_fkey"
            columns: ["track_id", "user_id"]
            isOneToOne: false
            referencedRelation: "study_tracks"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      user_ai_keys: {
        Row: {
          key_cipher: string
          key_iv: string
          model: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          key_cipher: string
          key_iv: string
          model: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          key_cipher?: string
          key_iv?: string
          model?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      ai_monthly_usage: { Args: never; Returns: Json }
      ai_quota_status: { Args: never; Returns: Json }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_streak_freeze: { Args: { p_track: string }; Returns: undefined }
      streak_protection_state: { Args: { p_track: string }; Returns: Json }
      study_xp_balance: { Args: { p_track: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
