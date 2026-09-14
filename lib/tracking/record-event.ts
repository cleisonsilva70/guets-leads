import "server-only";
import { sheetsPost } from "@/lib/sheets/client";
import type { UtmParams } from "@/types/lead";

export interface RecordEventInput extends UtmParams {
  /** Idealmente um valor de FUNNEL_EVENTS, mas aceitamos string livre — o endpoint público valida só o formato, não a whitelist. */
  eventName: string;
  sessionId: string;
  leadId?: string | null;
  step?: string | null;
  metadata?: Record<string, unknown>;
}

/** Grava um evento leve de funil na aba "Eventos" — nunca lança para o caller (tracking não pode derrubar o fluxo principal). */
export async function recordFunnelEvent(input: RecordEventInput): Promise<void> {
  try {
    await sheetsPost("submit_event", {
      eventName: input.eventName,
      sessionId: input.sessionId,
      leadId: input.leadId ?? "",
      step: input.step ?? "",
      metadata: input.metadata ?? {},
      utm_source: input.utm_source ?? "",
      utm_medium: input.utm_medium ?? "",
      utm_campaign: input.utm_campaign ?? "",
      utm_content: input.utm_content ?? "",
      utm_term: input.utm_term ?? "",
      fbclid: input.fbclid ?? "",
      landing_page: input.landing_page ?? "",
    });
  } catch (error) {
    console.error("Falha ao gravar evento de funil", error);
  }
}
