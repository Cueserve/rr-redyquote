export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      components: {
        Row: {
          active: boolean;
          category_id: string;
          cost: number;
          created_at: string;
          default_labor_hours: number;
          environment: Database["public"]["Enums"]["environment_type"];
          id: string;
          name: string;
          quoted_date: string;
          sku: string;
          updated_at: string;
          vendor: string | null;
        };
        Insert: {
          active?: boolean;
          category_id: string;
          cost: number;
          created_at?: string;
          default_labor_hours?: number;
          environment?: Database["public"]["Enums"]["environment_type"];
          id?: string;
          name: string;
          quoted_date: string;
          sku: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Update: {
          active?: boolean;
          category_id?: string;
          cost?: number;
          created_at?: string;
          default_labor_hours?: number;
          environment?: Database["public"]["Enums"]["environment_type"];
          id?: string;
          name?: string;
          quoted_date?: string;
          sku?: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "components_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      fab_tiers: {
        Row: {
          cost: number;
          created_at: string;
          id: string;
          product_id: string;
          qty_tier: number;
          quoted_date: string;
          updated_at: string;
          vendor: string | null;
        };
        Insert: {
          cost: number;
          created_at?: string;
          id?: string;
          product_id: string;
          qty_tier: number;
          quoted_date: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Update: {
          cost?: number;
          created_at?: string;
          id?: string;
          product_id?: string;
          qty_tier?: number;
          quoted_date?: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fab_tiers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      price_history: {
        Row: {
          changed_by: string;
          component_id: string | null;
          cost: number;
          created_at: string;
          id: string;
          product_id: string | null;
          qty_tier: number | null;
          quoted_date: string;
          source_type: string;
          vendor: string | null;
        };
        Insert: {
          changed_by: string;
          component_id?: string | null;
          cost: number;
          created_at?: string;
          id?: string;
          product_id?: string | null;
          qty_tier?: number | null;
          quoted_date: string;
          source_type: string;
          vendor?: string | null;
        };
        Update: {
          changed_by?: string;
          component_id?: string | null;
          cost?: number;
          created_at?: string;
          id?: string;
          product_id?: string | null;
          qty_tier?: number | null;
          quoted_date?: string;
          source_type?: string;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "price_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_history_component_id_fkey";
            columns: ["component_id"];
            isOneToOne: false;
            referencedRelation: "components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_defaults: {
        Row: {
          category_id: string;
          component_id: string | null;
          created_at: string;
          id: string;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          component_id?: string | null;
          created_at?: string;
          id?: string;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          component_id?: string | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_defaults_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_defaults_component_id_fkey";
            columns: ["component_id"];
            isOneToOne: false;
            referencedRelation: "components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_defaults_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          est_labor_hours: number;
          id: string;
          name: string;
          sku: string;
          updated_at: string;
          vendor: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          est_labor_hours?: number;
          id?: string;
          name: string;
          sku: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          est_labor_hours?: number;
          id?: string;
          name?: string;
          sku?: string;
          updated_at?: string;
          vendor?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      quote_lines: {
        Row: {
          category_id: string | null;
          component_id: string | null;
          created_at: string;
          description: string;
          environment_mismatch: boolean;
          hard_cost: number;
          id: string;
          is_misc: boolean;
          labor_cost: number;
          labor_hours: number;
          markup_percent: number;
          quote_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          component_id?: string | null;
          created_at?: string;
          description: string;
          environment_mismatch?: boolean;
          hard_cost?: number;
          id?: string;
          is_misc?: boolean;
          labor_cost?: number;
          labor_hours?: number;
          markup_percent?: number;
          quote_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          component_id?: string | null;
          created_at?: string;
          description?: string;
          environment_mismatch?: boolean;
          hard_cost?: number;
          id?: string;
          is_misc?: boolean;
          labor_cost?: number;
          labor_hours?: number;
          markup_percent?: number;
          quote_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_lines_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_lines_component_id_fkey";
            columns: ["component_id"];
            isOneToOne: false;
            referencedRelation: "components";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_number_sequences: {
        Row: {
          last_number: number;
          year: number;
        };
        Insert: {
          last_number?: number;
          year: number;
        };
        Update: {
          last_number?: number;
          year?: number;
        };
        Relationships: [];
      };
      quote_status_history: {
        Row: {
          changed_at: string;
          changed_by: string;
          id: string;
          new_status: Database["public"]["Enums"]["quote_status"];
          old_status: Database["public"]["Enums"]["quote_status"] | null;
          quote_id: string;
        };
        Insert: {
          changed_at?: string;
          changed_by: string;
          id?: string;
          new_status: Database["public"]["Enums"]["quote_status"];
          old_status?: Database["public"]["Enums"]["quote_status"] | null;
          quote_id: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string;
          id?: string;
          new_status?: Database["public"]["Enums"]["quote_status"];
          old_status?: Database["public"]["Enums"]["quote_status"] | null;
          quote_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_status_history_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          below_margin_floor: boolean;
          commission_amount: number;
          created_at: string;
          cushion_amount: number;
          customer_name: string;
          environment: Database["public"]["Enums"]["quote_environment"];
          fab_cost_snapshot: number;
          fab_tier_id: string;
          final_price_each: number;
          gp_dollars: number;
          gp_percent: number;
          id: string;
          owner_id: string;
          product_id: string;
          quote_number: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          submitted_at: string | null;
          total_cost: number;
          total_hard_cost: number;
          total_labor_cost: number;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          below_margin_floor?: boolean;
          commission_amount?: number;
          created_at?: string;
          cushion_amount?: number;
          customer_name: string;
          environment: Database["public"]["Enums"]["quote_environment"];
          fab_cost_snapshot: number;
          fab_tier_id: string;
          final_price_each?: number;
          gp_dollars?: number;
          gp_percent?: number;
          id?: string;
          owner_id: string;
          product_id: string;
          quote_number: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          submitted_at?: string | null;
          total_cost?: number;
          total_hard_cost?: number;
          total_labor_cost?: number;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          below_margin_floor?: boolean;
          commission_amount?: number;
          created_at?: string;
          cushion_amount?: number;
          customer_name?: string;
          environment?: Database["public"]["Enums"]["quote_environment"];
          fab_cost_snapshot?: number;
          fab_tier_id?: string;
          final_price_each?: number;
          gp_dollars?: number;
          gp_percent?: number;
          id?: string;
          owner_id?: string;
          product_id?: string;
          quote_number?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          submitted_at?: string | null;
          total_cost?: number;
          total_hard_cost?: number;
          total_labor_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_fab_tier_id_fkey";
            columns: ["fab_tier_id"];
            isOneToOne: false;
            referencedRelation: "fab_tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          commission_percent: number;
          component_markup_percent: number;
          created_at: string;
          cushion_percent: number;
          fab_markup_percent: number;
          favicon_url: string | null;
          freshness_requote_months: number;
          freshness_warning_months: number;
          id: boolean;
          labor_rate: number;
          margin_floor_percent: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          commission_percent: number;
          component_markup_percent: number;
          created_at?: string;
          cushion_percent: number;
          fab_markup_percent: number;
          favicon_url?: string | null;
          freshness_requote_months: number;
          freshness_warning_months: number;
          id?: boolean;
          labor_rate: number;
          margin_floor_percent: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          commission_percent?: number;
          component_markup_percent?: number;
          created_at?: string;
          cushion_percent?: number;
          fab_markup_percent?: number;
          favicon_url?: string | null;
          freshness_requote_months?: number;
          freshness_warning_months?: number;
          id?: boolean;
          labor_rate?: number;
          margin_floor_percent?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      settings_history: {
        Row: {
          actor: string;
          changed_at: string;
          changed_field: string;
          id: string;
          new_value: string | null;
          old_value: string | null;
        };
        Insert: {
          actor: string;
          changed_at?: string;
          changed_field: string;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
        };
        Update: {
          actor?: string;
          changed_at?: string;
          changed_field?: string;
          id?: string;
          new_value?: string | null;
          old_value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "settings_history_actor_fkey";
            columns: ["actor"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      fn_next_quote_number: { Args: never; Returns: string };
      fn_save_product: {
        Args: {
          p_active: boolean;
          p_defaults: Json;
          p_description: string;
          p_est_labor_hours: number;
          p_fab_tiers: Json;
          p_name: string;
          p_product_id: string;
          p_sku: string;
          p_vendor: string;
        };
        Returns: {
          active: boolean;
          created_at: string;
          description: string | null;
          est_labor_hours: number;
          id: string;
          name: string;
          sku: string;
          updated_at: string;
          vendor: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "products";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_save_quote: {
        Args: {
          p_customer_name: string;
          p_environment: Database["public"]["Enums"]["quote_environment"];
          p_fab_tier_id: string;
          p_lines: Json;
          p_owner_id: string;
          p_pricing: Json;
          p_product_id: string;
          p_quote_id: string;
        };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          below_margin_floor: boolean;
          commission_amount: number;
          created_at: string;
          cushion_amount: number;
          customer_name: string;
          environment: Database["public"]["Enums"]["quote_environment"];
          fab_cost_snapshot: number;
          fab_tier_id: string;
          final_price_each: number;
          gp_dollars: number;
          gp_percent: number;
          id: string;
          owner_id: string;
          product_id: string;
          quote_number: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          submitted_at: string | null;
          total_cost: number;
          total_hard_cost: number;
          total_labor_cost: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "quotes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fn_transition_quote_status: {
        Args: {
          p_quote_id: string;
          p_to_status: Database["public"]["Enums"]["quote_status"];
        };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          below_margin_floor: boolean;
          commission_amount: number;
          created_at: string;
          cushion_amount: number;
          customer_name: string;
          environment: Database["public"]["Enums"]["quote_environment"];
          fab_cost_snapshot: number;
          fab_tier_id: string;
          final_price_each: number;
          gp_dollars: number;
          gp_percent: number;
          id: string;
          owner_id: string;
          product_id: string;
          quote_number: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          submitted_at: string | null;
          total_cost: number;
          total_hard_cost: number;
          total_labor_cost: number;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "quotes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      environment_type: "any" | "indoor" | "outdoor";
      quote_environment: "indoor" | "outdoor";
      quote_status: "draft" | "pending_approval" | "approved" | "sent";
      user_role: "rep" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      environment_type: ["any", "indoor", "outdoor"],
      quote_environment: ["indoor", "outdoor"],
      quote_status: ["draft", "pending_approval", "approved", "sent"],
      user_role: ["rep", "admin"],
    },
  },
} as const;
