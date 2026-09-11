import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { LeadClassification } from "@/types/lead";

function startOfDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

async function countLeads(gte: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", gte);
  return count ?? 0;
}

async function countLeadsByClassification(classification: LeadClassification): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("lead_classification", classification);
  return count ?? 0;
}

async function countFunnelEvent(eventName: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("funnel_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", eventName);
  return count ?? 0;
}

export interface ConsultantLeadCount {
  consultantId: string;
  consultantName: string;
  active: boolean;
  leadCount: number;
}

async function countLeadsByConsultant(): Promise<ConsultantLeadCount[]> {
  const supabase = getSupabaseAdmin();
  const { data: consultants } = await supabase
    .from("consultants")
    .select("*")
    .order("round_robin_order", { ascending: true });

  if (!consultants) return [];

  return Promise.all(
    consultants.map(async (consultant) => {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("consultant_id", consultant.id);

      return {
        consultantId: consultant.id,
        consultantName: consultant.name,
        active: consultant.active,
        leadCount: count ?? 0,
      };
    })
  );
}

export interface DashboardMetrics {
  leadsToday: number;
  leads7d: number;
  leadsMonth: number;
  hot: number;
  qualified: number;
  beginner: number;
  minimumOrderAccepted: number;
  minimumOrderRejected: number;
  minimumOrderAcceptanceRate: number;
  leadsByConsultant: ConsultantLeadCount[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [
    leadsToday,
    leads7d,
    leadsMonth,
    hot,
    qualified,
    beginner,
    minimumOrderAccepted,
    minimumOrderRejected,
    leadsByConsultant,
  ] = await Promise.all([
    countLeads(startOfDayIso()),
    countLeads(daysAgoIso(7)),
    countLeads(startOfMonthIso()),
    countLeadsByClassification("hot"),
    countLeadsByClassification("qualified"),
    countLeadsByClassification("beginner"),
    countFunnelEvent("minimum_order_accepted"),
    countFunnelEvent("minimum_order_disqualified"),
    countLeadsByConsultant(),
  ]);

  const totalMinimumOrderResponses = minimumOrderAccepted + minimumOrderRejected;
  const minimumOrderAcceptanceRate =
    totalMinimumOrderResponses > 0
      ? Math.round((minimumOrderAccepted / totalMinimumOrderResponses) * 100)
      : 0;

  return {
    leadsToday,
    leads7d,
    leadsMonth,
    hot,
    qualified,
    beginner,
    minimumOrderAccepted,
    minimumOrderRejected,
    minimumOrderAcceptanceRate,
    leadsByConsultant,
  };
}
