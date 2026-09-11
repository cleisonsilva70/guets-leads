import type {
  Consultant,
  InvestmentRange,
  Lead,
  LeadClassification,
  LeadStatus,
  PurchaseFrequency,
  PurchasePurpose,
  SalesChannel,
  Segment,
} from "./lead";

export type FunnelEventRow = {
  id: string;
  event_name: string;
  session_id: string;
  lead_id: string | null;
  step: string | null;
  metadata: Record<string, unknown>;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  landing_page: string | null;
  created_at: string;
};

export type LeadAssignmentRow = {
  id: string;
  lead_id: string;
  consultant_id: string;
  assigned_at: string;
  assignment_method: string;
};

type LeadInsert = Omit<
  Lead,
  | "id"
  | "created_at"
  | "updated_at"
  | "lead_score"
  | "lead_classification"
  | "consultant_id"
  | "status"
> &
  Partial<Pick<Lead, "lead_score" | "lead_classification" | "consultant_id" | "status">>;

type ConsultantInsert = Omit<
  Consultant,
  "id" | "created_at" | "updated_at" | "round_robin_order"
> &
  Partial<Pick<Consultant, "round_robin_order">>;

/** Tipagem manual equivalente ao schema em supabase/migrations (formato compatível com `supabase gen types`). */
export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: LeadInsert;
        Update: Partial<Lead>;
        Relationships: [];
      };
      consultants: {
        Row: Consultant;
        Insert: ConsultantInsert;
        Update: Partial<Consultant>;
        Relationships: [];
      };
      lead_assignments: {
        Row: LeadAssignmentRow;
        Insert: Omit<LeadAssignmentRow, "id" | "assigned_at">;
        Update: Partial<LeadAssignmentRow>;
        Relationships: [];
      };
      funnel_events: {
        Row: FunnelEventRow;
        Insert: Omit<FunnelEventRow, "id" | "created_at">;
        Update: Partial<FunnelEventRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      assign_next_consultant: {
        Args: { p_lead_id: string };
        Returns: string | null;
      };
      submit_lead: {
        Args: {
          p_name: string;
          p_whatsapp_raw: string;
          p_whatsapp_normalized: string;
          p_email: string;
          p_business_name: string;
          p_instagram: string | null;
          p_city: string;
          p_state: string;
          p_cpf_cnpj: string;
          p_purchase_purpose: PurchasePurpose;
          p_segment: Segment;
          p_sales_channel: SalesChannel;
          p_investment_range: InvestmentRange;
          p_purchase_frequency: PurchaseFrequency;
          p_lead_score: number;
          p_lead_classification: LeadClassification;
          p_utm_source: string | null;
          p_utm_medium: string | null;
          p_utm_campaign: string | null;
          p_utm_content: string | null;
          p_utm_term: string | null;
          p_fbclid: string | null;
          p_landing_page: string | null;
          p_consent_version: string;
        };
        Returns: { lead_id: string; consultant_id: string | null; is_new: boolean }[];
      };
    };
  };
}

export type {
  Consultant,
  InvestmentRange,
  Lead,
  LeadClassification,
  LeadStatus,
  PurchaseFrequency,
  PurchasePurpose,
  SalesChannel,
  Segment,
};
