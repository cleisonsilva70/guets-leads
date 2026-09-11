export type PurchasePurpose =
  | "reseller_physical_store"
  | "reseller_online"
  | "reseller_in_person"
  | "starting_now"
  | "personal_use";

export type Segment = "fitness" | "feminina" | "other" | "not_selling_yet";

export type SalesChannel =
  | "physical_store"
  | "instagram"
  | "whatsapp"
  | "own_site"
  | "marketplace"
  | "multiple";

export type InvestmentRange =
  | "r1200_2000"
  | "r2001_3000"
  | "r3001_5000"
  | "r5001_10000"
  | "above_10000";

export type PurchaseFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "as_needed"
  | "first_purchase";

export type LeadClassification = "hot" | "qualified" | "beginner";

export type LeadStatus =
  | "new"
  | "contacted"
  | "catalog_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "awaiting_assignment";

export type UtmParams = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbclid?: string | null;
  landing_page?: string | null;
};

/** Respostas coletadas durante o quiz, antes do cadastro final. */
export type QualificationAnswers = {
  purchasePurpose: PurchasePurpose | null;
  acceptsMinimumOrder: boolean | null;
  segment: Segment | null;
  salesChannel: SalesChannel | null;
  investmentRange: InvestmentRange | null;
  purchaseFrequency: PurchaseFrequency | null;
};

/** Dados cadastrais coletados na etapa final. */
export type RegistrationData = {
  name: string;
  whatsapp: string;
  businessName: string;
  instagram: string;
  city: string;
  state: string;
  cpfCnpj: string;
  email: string;
  consent: boolean;
};

// Declarados como `type` (não `interface`) de propósito: os tipos de tabela
// do Supabase precisam satisfazer estruturalmente `Record<string, unknown>`
// (ver types/database.ts), e uma `interface` não é considerada compatível
// com um index signature nessa checagem — só um object type literal é.
export type Lead = {
  id: string;
  name: string;
  whatsapp_raw: string;
  whatsapp_normalized: string;
  email: string;
  business_name: string;
  instagram: string | null;
  city: string;
  state: string;
  cpf_cnpj: string;
  purchase_purpose: PurchasePurpose;
  accepts_minimum_order: boolean;
  segment: Segment;
  sales_channel: SalesChannel;
  investment_range: InvestmentRange;
  purchase_frequency: PurchaseFrequency;
  lead_score: number;
  lead_classification: LeadClassification;
  consultant_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  landing_page: string | null;
  consent: boolean;
  consent_timestamp: string | null;
  consent_version: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
};

export type Consultant = {
  id: string;
  name: string;
  whatsapp: string;
  active: boolean;
  round_robin_order: number;
  created_at: string;
  updated_at: string;
};
