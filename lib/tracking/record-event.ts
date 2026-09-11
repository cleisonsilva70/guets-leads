import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { UtmParams } from "@/types/lead";

export interface RecordEventInput extends UtmParams {
  /** Idealmente um valor de FUNNEL_EVENTS, mas aceitamos string livre — o endpoint público valida só o formato, não a whitelist. */
  eventName: string;
  sessionId: string;
  leadId?: string | null;
  step?: string | null;
  metadata?: Record<string, unknown>;
}

/** Grava um evento leve de funil — nunca lança para o caller (tracking não pode derrubar o fluxo principal). */
export async function recordFunnelEvent(input: RecordEventInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("funnel_events").insert({
      event_name: input.eventName,
      session_id: input.sessionId,
      lead_id: input.leadId ?? null,
      step: input.step ?? null,
      metadata: input.metadata ?? {},
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      utm_content: input.utm_content ?? null,
      utm_term: input.utm_term ?? null,
      fbclid: input.fbclid ?? null,
      landing_page: input.landing_page ?? null,
    });
  } catch (error) {
    console.error("Falha ao gravar funnel_event", error);
  }
}
