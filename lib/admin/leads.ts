import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { InvestmentRange, Lead, LeadClassification, LeadStatus } from "@/types/lead";

export interface LeadListFilters {
  consultantId?: string;
  classification?: LeadClassification;
  investmentRange?: InvestmentRange;
  state?: string;
  status?: LeadStatus;
  campaign?: string;
  page?: number;
}

const PAGE_SIZE = 25;

export interface LeadListResult {
  leads: Lead[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listLeads(filters: LeadListFilters): Promise<LeadListResult> {
  const supabase = getSupabaseAdmin();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase.from("leads").select("*", { count: "exact" }).order("created_at", {
    ascending: false,
  });

  if (filters.consultantId) query = query.eq("consultant_id", filters.consultantId);
  if (filters.classification) query = query.eq("lead_classification", filters.classification);
  if (filters.investmentRange) query = query.eq("investment_range", filters.investmentRange);
  if (filters.state) query = query.eq("state", filters.state);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.campaign) query = query.ilike("utm_campaign", `%${filters.campaign}%`);

  const { data, count, error } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    leads: data ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("leads").select("*").eq("id", id).single();
  return data ?? null;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
