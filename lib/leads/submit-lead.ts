import "server-only";
import { calculateLeadScore, classifyLeadScore, leadClassificationLabels } from "@/lib/lead-scoring";
import { normalizeInstagramHandle } from "@/lib/validation/instagram";
import { normalizeWhatsapp } from "@/lib/validation/whatsapp";
import type { CreateLeadRequest } from "@/lib/validation/schemas";
import {
  purchasePurposeLabels,
  segmentLabels,
  salesChannelLabels,
  investmentRangeLabels,
  purchaseFrequencyLabels,
} from "@/lib/labels";

export interface SubmitLeadConsultant {
  name: string;
  whatsapp: string;
}

export interface SubmitLeadResult {
  leadId: string;
  isNew: boolean;
  consultant: SubmitLeadConsultant | null;
}

/**
 * Único ponto de entrada para gravar um lead qualificado. Calcula o score
 * no servidor (nunca confiar em score vindo do client) e delega
 * duplicidade + Round Robin para o Google Apps Script publicado na
 * planilha (ver google-apps-script/Code.gs) — ele resolve os dois de forma
 * atômica com LockService, na mesma transação lógica.
 */
export async function submitLead(input: CreateLeadRequest): Promise<SubmitLeadResult> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("GOOGLE_SHEETS_WEBHOOK_URL não configurado.");
  }

  const score = calculateLeadScore({
    segment: input.segment,
    salesChannel: input.salesChannel,
    investmentRange: input.investmentRange,
    purchaseFrequency: input.purchaseFrequency,
  });
  const classification = classifyLeadScore(score);
  const whatsappNormalized = normalizeWhatsapp(input.whatsapp);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      whatsapp: input.whatsapp,
      whatsappNormalizado: whatsappNormalized,
      email: input.email,
      businessName: input.businessName,
      instagram: input.instagram ? normalizeInstagramHandle(input.instagram) : "",
      city: input.city,
      state: input.state,
      cpfCnpj: input.cpfCnpj,
      purchasePurposeLabel: purchasePurposeLabels[input.purchasePurpose],
      segmentLabel: segmentLabels[input.segment],
      salesChannelLabel: salesChannelLabels[input.salesChannel],
      investmentRangeLabel: investmentRangeLabels[input.investmentRange],
      purchaseFrequencyLabel: purchaseFrequencyLabels[input.purchaseFrequency],
      leadScore: score,
      leadClassification: leadClassificationLabels[classification],
      utm_source: input.utm_source ?? "",
      utm_medium: input.utm_medium ?? "",
      utm_campaign: input.utm_campaign ?? "",
      utm_content: input.utm_content ?? "",
      utm_term: input.utm_term ?? "",
      fbclid: input.fbclid ?? "",
      landing_page: input.landing_page ?? "",
    }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao gravar lead na planilha: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    leadId?: string;
    isNew?: boolean;
    consultant?: SubmitLeadConsultant | null;
    error?: string;
  };

  if (data.error) {
    throw new Error(`Falha ao gravar lead na planilha: ${data.error}`);
  }
  if (!data.leadId) {
    throw new Error("Resposta inválida da planilha ao gravar lead.");
  }

  return { leadId: data.leadId, isNew: data.isNew ?? true, consultant: data.consultant ?? null };
}
