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
      audit_log: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      encontros: {
        Row: {
          competencia: string
          created_at: string
          created_by: string | null
          id: string
          status: Database["public"]["Enums"]["encontro_status"]
          tipo: Database["public"]["Enums"]["encontro_tipo"]
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["encontro_status"]
          tipo: Database["public"]["Enums"]["encontro_tipo"]
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: Database["public"]["Enums"]["encontro_status"]
          tipo?: Database["public"]["Enums"]["encontro_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      exportacao_itens: {
        Row: {
          created_at: string
          exportacao_id: string
          id: string
          nota_debito_id: string
        }
        Insert: {
          created_at?: string
          exportacao_id: string
          id?: string
          nota_debito_id: string
        }
        Update: {
          created_at?: string
          exportacao_id?: string
          id?: string
          nota_debito_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exportacao_itens_exportacao_id_fkey"
            columns: ["exportacao_id"]
            isOneToOne: false
            referencedRelation: "exportacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exportacao_itens_nota_debito_id_fkey"
            columns: ["nota_debito_id"]
            isOneToOne: false
            referencedRelation: "notas_debito"
            referencedColumns: ["id"]
          },
        ]
      }
      exportacoes: {
        Row: {
          arquivo_nome: string | null
          created_at: string
          created_by: string | null
          filtros: Json | null
          id: string
          tipo: string
          total_itens: number
          valor_total: number
        }
        Insert: {
          arquivo_nome?: string | null
          created_at?: string
          created_by?: string | null
          filtros?: Json | null
          id?: string
          tipo: string
          total_itens?: number
          valor_total?: number
        }
        Update: {
          arquivo_nome?: string | null
          created_at?: string
          created_by?: string | null
          filtros?: Json | null
          id?: string
          tipo?: string
          total_itens?: number
          valor_total?: number
        }
        Relationships: []
      }
      notas_debito: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          descricao: string | null
          encontro_id: string
          id: string
          numero: string | null
          origem: Database["public"]["Enums"]["nd_origem"]
          parcelamento_item_id: string | null
          status: Database["public"]["Enums"]["nd_status"]
          tipo_nd_id: string
          unimed_credora_id: string
          unimed_devedora_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          encontro_id: string
          id?: string
          numero?: string | null
          origem?: Database["public"]["Enums"]["nd_origem"]
          parcelamento_item_id?: string | null
          status?: Database["public"]["Enums"]["nd_status"]
          tipo_nd_id: string
          unimed_credora_id: string
          unimed_devedora_id: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          descricao?: string | null
          encontro_id?: string
          id?: string
          numero?: string | null
          origem?: Database["public"]["Enums"]["nd_origem"]
          parcelamento_item_id?: string | null
          status?: Database["public"]["Enums"]["nd_status"]
          tipo_nd_id?: string
          unimed_credora_id?: string
          unimed_devedora_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_debito_encontro_id_fkey"
            columns: ["encontro_id"]
            isOneToOne: false
            referencedRelation: "encontros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_debito_tipo_nd_id_fkey"
            columns: ["tipo_nd_id"]
            isOneToOne: false
            referencedRelation: "tipos_nd"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_debito_unimed_credora_id_fkey"
            columns: ["unimed_credora_id"]
            isOneToOne: false
            referencedRelation: "unimeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_debito_unimed_devedora_id_fkey"
            columns: ["unimed_devedora_id"]
            isOneToOne: false
            referencedRelation: "unimeds"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      parcelamento_itens: {
        Row: {
          competencia: string
          created_at: string
          id: string
          materializada: boolean
          nota_debito_id: string | null
          numero_parcela: number
          parcelamento_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          materializada?: boolean
          nota_debito_id?: string | null
          numero_parcela: number
          parcelamento_id: string
          updated_at?: string
          valor: number
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          materializada?: boolean
          nota_debito_id?: string | null
          numero_parcela?: number
          parcelamento_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelamento_itens_nota_debito_id_fkey"
            columns: ["nota_debito_id"]
            isOneToOne: false
            referencedRelation: "notas_debito"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelamento_itens_parcelamento_id_fkey"
            columns: ["parcelamento_id"]
            isOneToOne: false
            referencedRelation: "parcelamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          num_parcelas: number
          tipo_nd_id: string
          unimed_credora_id: string
          unimed_devedora_id: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          num_parcelas: number
          tipo_nd_id: string
          unimed_credora_id: string
          unimed_devedora_id: string
          updated_at?: string
          valor_total: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          num_parcelas?: number
          tipo_nd_id?: string
          unimed_credora_id?: string
          unimed_devedora_id?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelamentos_tipo_nd_id_fkey"
            columns: ["tipo_nd_id"]
            isOneToOne: false
            referencedRelation: "tipos_nd"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelamentos_unimed_credora_id_fkey"
            columns: ["unimed_credora_id"]
            isOneToOne: false
            referencedRelation: "unimeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelamentos_unimed_devedora_id_fkey"
            columns: ["unimed_devedora_id"]
            isOneToOne: false
            referencedRelation: "unimeds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tipos_nd: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          mapeamento_contabil: string | null
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          mapeamento_contabil?: string | null
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          mapeamento_contabil?: string | null
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: []
      }
      unimeds: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "unimed_consulta" | "usuario"
      encontro_status: "RASCUNHO" | "ABERTO" | "ENCERRADO"
      encontro_tipo: "FIXOS" | "VARIAVEIS"
      nd_origem: "MANUAL" | "PARCELAMENTO"
      nd_status: "RASCUNHO" | "LANCADA" | "LIBERADA" | "EXPORTADA" | "CANCELADA"
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
      app_role: ["admin", "financeiro", "unimed_consulta", "usuario"],
      encontro_status: ["RASCUNHO", "ABERTO", "ENCERRADO"],
      encontro_tipo: ["FIXOS", "VARIAVEIS"],
      nd_origem: ["MANUAL", "PARCELAMENTO"],
      nd_status: ["RASCUNHO", "LANCADA", "LIBERADA", "EXPORTADA", "CANCELADA"],
    },
  },
} as const
