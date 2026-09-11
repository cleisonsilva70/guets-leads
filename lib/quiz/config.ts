import { minimumOrderLabel } from "@/lib/config/commercial";
import type {
  InvestmentRange,
  PurchaseFrequency,
  PurchasePurpose,
  SalesChannel,
  Segment,
} from "@/types/lead";

export interface QuizOption<T extends string> {
  value: T;
  label: string;
}

export const purposeOptions: QuizOption<PurchasePurpose>[] = [
  { value: "reseller_physical_store", label: "Revender em loja física" },
  { value: "reseller_online", label: "Revender pelo Instagram / loja online" },
  { value: "reseller_in_person", label: "Revender presencialmente" },
  { value: "starting_now", label: "Estou começando agora" },
  { value: "personal_use", label: "Uso próprio" },
];

export const segmentOptions: QuizOption<Segment>[] = [
  { value: "fitness", label: "Sim, moda fitness" },
  { value: "feminina", label: "Sim, moda feminina" },
  { value: "other", label: "Trabalho com outros segmentos" },
  { value: "not_selling_yet", label: "Ainda não vendo, quero começar" },
];

export const salesChannelOptions: QuizOption<SalesChannel>[] = [
  { value: "physical_store", label: "Loja física" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "own_site", label: "Site próprio" },
  { value: "marketplace", label: "Marketplace" },
  { value: "multiple", label: "Mais de um desses canais" },
];

export const investmentRangeOptions: QuizOption<InvestmentRange>[] = [
  { value: "r1200_2000", label: `${minimumOrderLabel} a R$ 2.000` },
  { value: "r2001_3000", label: "R$ 2.001 a R$ 3.000" },
  { value: "r3001_5000", label: "R$ 3.001 a R$ 5.000" },
  { value: "r5001_10000", label: "R$ 5.001 a R$ 10.000" },
  { value: "above_10000", label: "Acima de R$ 10.000" },
];

export const purchaseFrequencyOptions: QuizOption<PurchaseFrequency>[] = [
  { value: "weekly", label: "Toda semana" },
  { value: "biweekly", label: "A cada 15 dias" },
  { value: "monthly", label: "Todo mês" },
  { value: "as_needed", label: "Quando preciso repor estoque" },
  { value: "first_purchase", label: "Ainda vou fazer minha primeira compra" },
];

/** Ordem das telas "em fluxo" usadas para calcular a barra de progresso. */
export const QUIZ_FLOW_STEPS = [
  "purpose",
  "minimum_order",
  "segment",
  "channel",
  "investment",
  "frequency",
  "transition",
  "registration",
] as const;

export type QuizFlowStep = (typeof QUIZ_FLOW_STEPS)[number];
