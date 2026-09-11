import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { calculateLeadScore, classifyLeadScore } from "@/lib/lead-scoring";
import { normalizeInstagramHandle } from "@/lib/validation/instagram";
import { normalizeWhatsapp } from "@/lib/validation/whatsapp";
import type { CreateLeadRequest } from "@/lib/validation/schemas";
import { CONSENT_TEXT_VERSION } from "@/lib/config/consent";
import type { Consultant } from "@/types/lead";

export interface SubmitLeadResult {
  leadId: string;
  isNew: boolean;
  consultant: Consultant | null;
}

/**
 * Único ponto de entrada para gravar um lead qualificado. Calcula o score
 * no servidor (nunca confiar em score vindo do client) e delega
 * duplicidade + Round Robin para a function `submit_lead` no Postgres, que
 * faz tudo numa única transação atômica.
 */
export async function submitLead(input: CreateLeadRequest): Promise<SubmitLeadResult> {
  const supabase = getSupabaseAdmin();

  const score = calculateLeadScore({
    segment: input.segment,
    salesChannel: input.salesChannel,
    investmentRange: input.investmentRange,
    purchaseFrequency: input.purchaseFrequency,
  });
  const classification = classifyLeadScore(score);
  const whatsappNormalized = normalizeWhatsapp(input.whatsapp);

  const { data, error } = await supabase.rpc("submit_lead", {
    p_name: input.name,
    p_whatsapp_raw: input.whatsapp,
    p_whatsapp_normalized: whatsappNormalized,
    p_email: input.email,
    p_business_name: input.businessName,
    p_instagram: input.instagram ? normalizeInstagramHandle(input.instagram) : null,
    p_city: input.city,
    p_state: input.state,
    p_cpf_cnpj: input.cpfCnpj,
    p_purchase_purpose: input.purchasePurpose,
    p_segment: input.segment,
    p_sales_channel: input.salesChannel,
    p_investment_range: input.investmentRange,
    p_purchase_frequency: input.purchaseFrequency,
    p_lead_score: score,
    p_lead_classification: classification,
    p_utm_source: input.utm_source ?? null,
    p_utm_medium: input.utm_medium ?? null,
    p_utm_campaign: input.utm_campaign ?? null,
    p_utm_content: input.utm_content ?? null,
    p_utm_term: input.utm_term ?? null,
    p_fbclid: input.fbclid ?? null,
    p_landing_page: input.landing_page ?? null,
    p_consent_version: CONSENT_TEXT_VERSION,
  });

  if (error) {
    throw new Error(`Falha ao gravar lead: ${error.message}`);
  }

  const row = data?.[0];
  if (!row) {
    throw new Error("submit_lead não retornou nenhuma linha.");
  }

  let consultant: Consultant | null = null;
  if (row.consultant_id) {
    const { data: consultantRow } = await supabase
      .from("consultants")
      .select("*")
      .eq("id", row.consultant_id)
      .single();
    consultant = consultantRow ?? null;
  }

  return { leadId: row.lead_id, isNew: row.is_new, consultant };
}
