export type PurchasePurpose = "reseller" | "starting_now" | "personal_use";

export type Segment = "fitness" | "feminina" | "other" | "not_selling_yet";

export type SalesChannel = "physical_store" | "online";

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

export type StoreType = "physical_store" | "virtual_store" | "starting_now";

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
  address: string;
  addressNumber: string;
  neighborhood: string;
  zipCode: string;
  addressComplement: string;
  cpfCnpj: string;
  email: string;
  storeType: StoreType[];
  consent: boolean;
};

