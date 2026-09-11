import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Consultant, Lead } from "@/types/lead";

export interface LeadWithConsultant extends Lead {
  consultant: Consultant | null;
}

export async function getLeadWithConsultant(leadId: string): Promise<LeadWithConsultant | null> {
  const supabase = getSupabaseAdmin();

  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
  if (error || !lead) return null;

  let consultant: Consultant | null = null;
  if (lead.consultant_id) {
    const { data } = await supabase.from("consultants").select("*").eq("id", lead.consultant_id).single();
    consultant = data ?? null;
  }

  return { ...lead, consultant };
}
