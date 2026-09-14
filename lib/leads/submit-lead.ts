import "server-only";
import { sheetsPost } from "@/lib/sheets/client";
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
  id: string;
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
  const score = calculateLeadScore({
    segment: input.segment,
    salesChannel: input.salesChannel,
    investmentRange: input.investmentRange,
    purchaseFrequency: input.purchaseFrequency,
  });
  const classification = classifyLeadScore(score);
  const whatsappNormalized = normalizeWhatsapp(input.whatsapp);

  const data = await sheetsPost<{
    leadId: string;
    isNew: boolean;
    consultant: SubmitLeadConsultant | null;
  }>("submit_lead", {
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
  });

  if (!data.leadId) {
    throw new Error("Resposta inválida da planilha ao gravar lead.");
  }

  return { leadId: data.leadId, isNew: data.isNew ?? true, consultant: data.consultant ?? null };
}
