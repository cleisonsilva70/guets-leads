import type {
  InvestmentRange,
  LeadClassification,
  PurchaseFrequency,
  SalesChannel,
  Segment,
} from "@/types/lead";

/**
 * Pesos do Lead Score. Nunca exibidos ao usuário — apenas usados
 * internamente para priorização e para a classificação do lead.
 * O score NÃO controla o Round Robin (ver lib/round-robin).
 */
export const scoringWeights = {
  segment: {
    fitness: 20,
    feminina: 15,
    other: 5,
    not_selling_yet: 5,
  } satisfies Record<Segment, number>,

  salesChannel: {
    physical_store: 20,
    instagram: 15,
    multiple: 20,
    whatsapp: 10,
    own_site: 10,
    marketplace: 10,
  } satisfies Record<SalesChannel, number>,

  investmentRange: {
    r1200_2000: 10,
    r2001_3000: 15,
    r3001_5000: 20,
    r5001_10000: 25,
    above_10000: 30,
  } satisfies Record<InvestmentRange, number>,

  purchaseFrequency: {
    weekly: 20,
    biweekly: 15,
    monthly: 10,
    as_needed: 5,
    first_purchase: 5,
  } satisfies Record<PurchaseFrequency, number>,
} as const;

export interface ScoringInput {
  segment: Segment;
  salesChannel: SalesChannel;
  investmentRange: InvestmentRange;
  purchaseFrequency: PurchaseFrequency;
}

export function calculateLeadScore(input: ScoringInput): number {
  return (
    scoringWeights.segment[input.segment] +
    scoringWeights.salesChannel[input.salesChannel] +
    scoringWeights.investmentRange[input.investmentRange] +
    scoringWeights.purchaseFrequency[input.purchaseFrequency]
  );
}

/**
 * Faixas de classificação. Todo lead que chega aqui já confirmou o pedido
 * mínimo de R$ 1.200 — o score mede potencial adicional, não elegibilidade.
 */
export function classifyLeadScore(score: number): LeadClassification {
  if (score >= 70) return "hot";
  if (score >= 40) return "qualified";
  return "beginner";
}

export const leadClassificationLabels: Record<LeadClassification, string> = {
  hot: "Lead Quente",
  qualified: "Lead Qualificado",
  beginner: "Lead Iniciante",
};
