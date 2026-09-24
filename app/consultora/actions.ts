"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentConsultant } from "@/lib/auth/consultant-session";
import { getLeadById, updateLeadStatus } from "@/lib/admin/leads";
import { leadStatusLabels, leadStatusValues } from "@/lib/labels";

/**
 * Server Actions são endpoints públicos: cada uma confere a sessão da
 * consultora e se o lead é mesmo dela antes de mexer em qualquer coisa.
 */
async function loadOwnLead(leadId: string) {
  const consultant = await getCurrentConsultant();
  if (!consultant) throw new Error("Não autorizado.");

  const lead = await getLeadById(leadId);
  if (!lead || lead.consultantId !== consultant.id) throw new Error("Lead não encontrado.");
  return lead;
}

/** Ao chamar o lead pelo WhatsApp, "Novo" vira "Contatado" sozinho; outros status ficam como estão. */
export async function markContactedAction(leadId: string): Promise<void> {
  const lead = await loadOwnLead(leadId);
  if (lead.status !== leadStatusLabels.new) return;

  await updateLeadStatus(lead.id, leadStatusLabels.contacted);
  updateTag("sheets");
  revalidatePath("/consultora");
}

export async function updateLeadStatusAction(leadId: string, status: string): Promise<void> {
  if (!leadStatusValues.includes(status)) throw new Error("Status inválido.");
  const lead = await loadOwnLead(leadId);

  await updateLeadStatus(lead.id, status);
  updateTag("sheets");
  revalidatePath("/consultora");
}
