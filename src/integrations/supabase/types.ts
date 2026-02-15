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
      gyeol_agent_skills: {
        Row: {
          agent_id: string
          id: string
          installed_at: string
          is_active: boolean
          skill_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          installed_at?: string
          is_active?: boolean
          skill_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          installed_at?: string
          is_active?: boolean
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_agent_skills_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gyeol_agent_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "gyeol_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_agent_skins: {
        Row: {
          acquired_at: string
          agent_id: string
          id: string
          is_equipped: boolean
          skin_id: string
        }
        Insert: {
          acquired_at?: string
          agent_id: string
          id?: string
          is_equipped?: boolean
          skin_id: string
        }
        Update: {
          acquired_at?: string
          agent_id?: string
          id?: string
          is_equipped?: boolean
          skin_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_agent_skins_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gyeol_agent_skins_skin_id_fkey"
            columns: ["skin_id"]
            isOneToOne: false
            referencedRelation: "gyeol_skins"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_agents: {
        Row: {
          created_at: string
          creativity: number
          energy: number
          evolution_progress: number
          gen: number
          humor: number
          id: string
          last_active: string
          logic: number
          name: string
          openclaw_agent_id: string | null
          preferred_provider: string
          skin_id: string | null
          total_conversations: number
          user_id: string
          visual_state: Json
          warmth: number
        }
        Insert: {
          created_at?: string
          creativity?: number
          energy?: number
          evolution_progress?: number
          gen?: number
          humor?: number
          id?: string
          last_active?: string
          logic?: number
          name?: string
          openclaw_agent_id?: string | null
          preferred_provider?: string
          skin_id?: string | null
          total_conversations?: number
          user_id: string
          visual_state?: Json
          warmth?: number
        }
        Update: {
          created_at?: string
          creativity?: number
          energy?: number
          evolution_progress?: number
          gen?: number
          humor?: number
          id?: string
          last_active?: string
          logic?: number
          name?: string
          openclaw_agent_id?: string | null
          preferred_provider?: string
          skin_id?: string | null
          total_conversations?: number
          user_id?: string
          visual_state?: Json
          warmth?: number
        }
        Relationships: []
      }
      gyeol_autonomous_logs: {
        Row: {
          activity_type: string
          agent_id: string
          created_at: string
          details: Json
          id: string
          security_flags: string[] | null
          summary: string | null
          was_sandboxed: boolean
        }
        Insert: {
          activity_type: string
          agent_id: string
          created_at?: string
          details?: Json
          id?: string
          security_flags?: string[] | null
          summary?: string | null
          was_sandboxed?: boolean
        }
        Update: {
          activity_type?: string
          agent_id?: string
          created_at?: string
          details?: Json
          id?: string
          security_flags?: string[] | null
          summary?: string | null
          was_sandboxed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_autonomous_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_byok_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      gyeol_conversations: {
        Row: {
          agent_id: string
          channel: string
          content: string
          created_at: string
          id: string
          provider: string | null
          response_time_ms: number | null
          role: string
          tokens_used: number | null
        }
        Insert: {
          agent_id: string
          channel?: string
          content: string
          created_at?: string
          id?: string
          provider?: string | null
          response_time_ms?: number | null
          role: string
          tokens_used?: number | null
        }
        Update: {
          agent_id?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          provider?: string | null
          response_time_ms?: number | null
          role?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_learned_topics: {
        Row: {
          agent_id: string
          id: string
          learned_at: string
          source: string
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          agent_id: string
          id?: string
          learned_at?: string
          source: string
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          agent_id?: string
          id?: string
          learned_at?: string
          source?: string
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_learned_topics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_matches: {
        Row: {
          agent_1_id: string
          agent_2_id: string
          compatibility_score: number
          created_at: string
          id: string
          status: string
        }
        Insert: {
          agent_1_id: string
          agent_2_id: string
          compatibility_score?: number
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          agent_1_id?: string
          agent_2_id?: string
          compatibility_score?: number
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_matches_agent_1_id_fkey"
            columns: ["agent_1_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gyeol_matches_agent_2_id_fkey"
            columns: ["agent_2_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_proactive_messages: {
        Row: {
          agent_id: string
          content: string
          created_at: string
          id: string
          trigger_reason: string | null
          was_sent: boolean
        }
        Insert: {
          agent_id: string
          content: string
          created_at?: string
          id?: string
          trigger_reason?: string | null
          was_sent?: boolean
        }
        Update: {
          agent_id?: string
          content?: string
          created_at?: string
          id?: string
          trigger_reason?: string | null
          was_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_proactive_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_push_subscriptions: {
        Row: {
          agent_id: string
          created_at: string
          endpoint: string
          id: string
          subscription: Json
        }
        Insert: {
          agent_id: string
          created_at?: string
          endpoint: string
          id?: string
          subscription: Json
        }
        Update: {
          agent_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          subscription?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_push_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_reflections: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          mood: string | null
          reflection: string
          topic: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          mood?: string | null
          reflection: string
          topic: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          mood?: string | null
          reflection?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_reflections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "gyeol_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      gyeol_skills: {
        Row: {
          category: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          downloads: number
          id: string
          is_approved: boolean
          min_gen: number
          name: string
          price: number
          rating: number
          skill_code: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          downloads?: number
          id?: string
          is_approved?: boolean
          min_gen?: number
          name: string
          price?: number
          rating?: number
          skill_code?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          downloads?: number
          id?: string
          is_approved?: boolean
          min_gen?: number
          name?: string
          price?: number
          rating?: number
          skill_code?: string | null
        }
        Relationships: []
      }
      gyeol_skins: {
        Row: {
          category: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          downloads: number
          id: string
          is_approved: boolean
          name: string
          preview_url: string | null
          price: number
          rating: number
          skin_data: Json | null
          tags: string[]
        }
        Insert: {
          category?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          downloads?: number
          id?: string
          is_approved?: boolean
          name: string
          preview_url?: string | null
          price?: number
          rating?: number
          skin_data?: Json | null
          tags?: string[]
        }
        Update: {
          category?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          downloads?: number
          id?: string
          is_approved?: boolean
          name?: string
          preview_url?: string | null
          price?: number
          rating?: number
          skin_data?: Json | null
          tags?: string[]
        }
        Relationships: []
      }
      gyeol_system_state: {
        Row: {
          id: string
          kill_switch: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          kill_switch?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          kill_switch?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gyeol_taste_vectors: {
        Row: {
          agent_id: string
          communication_style: Json
          interests: Json
          topics: Json
          updated_at: string
        }
        Insert: {
          agent_id: string
          communication_style?: Json
          interests?: Json
          topics?: Json
          updated_at?: string
        }
        Update: {
          agent_id?: string
          communication_style?: Json
          interests?: Json
          topics?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyeol_taste_vectors_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "gyeol_agents"
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
    Enums: {},
  },
} as const
