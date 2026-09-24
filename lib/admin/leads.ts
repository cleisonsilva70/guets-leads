import "server-only";
import { sheetsGet, sheetsPost } from "@/lib/sheets/client";

/**
 * Lead como devolvido pelo Apps Script pro admin. Diferente de
 * types/lead.ts (usado no quiz): aqui os campos de qualificação já vêm
 * como texto em português (o mesmo que está na planilha), não como código
 * interno — é o que a planilha guarda e o que o Bling também recebe.
 */
export interface AdminLead {
  id: string;
  createdAt: string;
  name: string;
  whatsapp: string;
  email: string;
  businessName: string;
  instagram: string | null;
  address: string;
  addressNumber: string;
  neighborhood: string;
  zipCode: string;
  addressComplement: string | null;
  cpfCnpj: string;
  storeTypeLabel: string;
  purchasePurposeLabel: string;
  segmentLabel: string;
  salesChannelLabel: string;
  investmentRangeLabel: string;
  purchaseFrequencyLabel: string;
  leadScore: number;
  classification: string;
  consultantId: string | null;
  consultantName: string | null;
  consultantWhatsapp: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  landingPage: string | null;
  status: string;
  /** O lead já abriu a conversa com a consultora (clique ou abertura automática). */
  whatsappClicked?: boolean;
}

export interface LeadListFilters {
  consultantId?: string;
  classification?: string;
  investmentRange?: string;
  status?: string;
  campaign?: string;
  page?: number;
}

export interface LeadListResult {
  leads: AdminLead[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listLeads(filters: LeadListFilters): Promise<LeadListResult> {
  return sheetsGet<LeadListResult>("list_leads", {
    consultantId: filters.consultantId,
    classification: filters.classification,
    investmentRange: filters.investmentRange,
    status: filters.status,
    campaign: filters.campaign,
    page: filters.page,
  });
}

export async function getLeadById(id: string): Promise<AdminLead | null> {
  const result = await sheetsGet<{ lead: AdminLead | null }>("get_lead", { leadId: id });
  return result.lead;
}

export async function updateLeadStatus(id: string, status: string): Promise<void> {
  await sheetsPost("update_lead_status", { leadId: id, status });
}
