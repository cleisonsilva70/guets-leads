import type {
  InvestmentRange,
  LeadStatus,
  PurchaseFrequency,
  PurchasePurpose,
  SalesChannel,
  Segment,
} from "@/types/lead";

export const purchasePurposeLabels: Record<PurchasePurpose, string> = {
  reseller_physical_store: "Revender em loja física",
  reseller_online: "Revender pelo Instagram / loja online",
  reseller_in_person: "Revender presencialmente",
  starting_now: "Estou começando agora",
  personal_use: "Uso próprio",
};

export const segmentLabels: Record<Segment, string> = {
  fitness: "Já vende moda fitness",
  feminina: "Já vende moda feminina",
  other: "Trabalha com outros segmentos",
  not_selling_yet: "Ainda não vende",
};

export const salesChannelLabels: Record<SalesChannel, string> = {
  physical_store: "Loja física",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  own_site: "Site próprio",
  marketplace: "Marketplace",
  multiple: "Mais de um canal",
};

export const investmentRangeLabels: Record<InvestmentRange, string> = {
  r1200_2000: "R$ 1.200 a R$ 2.000",
  r2001_3000: "R$ 2.001 a R$ 3.000",
  r3001_5000: "R$ 3.001 a R$ 5.000",
  r5001_10000: "R$ 5.001 a R$ 10.000",
  above_10000: "Acima de R$ 10.000",
};

export const purchaseFrequencyLabels: Record<PurchaseFrequency, string> = {
  weekly: "Toda semana",
  biweekly: "A cada 15 dias",
  monthly: "Todo mês",
  as_needed: "Quando precisa repor estoque",
  first_purchase: "Primeira compra",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "Novo",
  contacted: "Contatado",
  catalog_sent: "Catálogo enviado",
  negotiation: "Em negociação",
  won: "Venda concluída",
  lost: "Perdido",
  awaiting_assignment: "Aguardando atribuição",
};

export const leadStatusOptions = Object.entries(leadStatusLabels) as [LeadStatus, string][];
