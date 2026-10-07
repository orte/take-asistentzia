// Tipos del esquema de la base de datos (PLAN §5).
//
// Escritos a mano para que casen con la forma que genera Supabase, de modo que
// `createClient<Database>(...)` tipe queries y RPC. Si en el futuro se usa la
// generación automática de tipos, esta forma es compatible.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      members: {
        Row: {
          number: number
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          number: number
          name: string
          active?: boolean
          created_at?: string
        }
        Update: {
          number?: number
          name?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          season: string
          match_date: string
          opponent: string
          created_at: string
        }
        Insert: {
          id?: string
          season: string
          match_date: string
          opponent: string
          created_at?: string
        }
        Update: {
          id?: string
          season?: string
          match_date?: string
          opponent?: string
          created_at?: string
        }
        Relationships: []
      }
      attendances: {
        Row: {
          id: string
          match_id: string
          member_number: number
          registered_at: string
          device_label: string | null
        }
        Insert: {
          id?: string
          match_id: string
          member_number: number
          registered_at?: string
          device_label?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          member_number?: number
          registered_at?: string
          device_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'attendances_match_id_fkey'
            columns: ['match_id']
            referencedRelation: 'matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendances_member_number_fkey'
            columns: ['member_number']
            referencedRelation: 'members'
            referencedColumns: ['number']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_seasons: {
        Args: Record<PropertyKey, never>
        Returns: {
          season: string
        }[]
      }
      get_ranking: {
        Args: { p_season: string }
        Returns: {
          position: number
          member_number: number
          name: string
          attended: number
          total_matches: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Alias cómodos para el resto de la app.
export type Member = Database['public']['Tables']['members']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Attendance = Database['public']['Tables']['attendances']['Row']

export type MemberInsert = Database['public']['Tables']['members']['Insert']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type AttendanceInsert = Database['public']['Tables']['attendances']['Insert']

export type Season = Database['public']['Functions']['get_seasons']['Returns'][number]
export type RankingRow = Database['public']['Functions']['get_ranking']['Returns'][number]
