import { NextResponse, after } from "next/server";
import { createLeadRequestSchema } from "@/lib/validation/schemas";
import { submitLead } from "@/lib/leads/submit-lead";
import { recordFunnelEvent } from "@/lib/tracking/record-event";
import { FUNNEL_EVENTS } from "@/lib/tracking/events";

/**
 * Único endpoint que grava um lead comercial completo. Toda a regra de
 * negócio (pedido mínimo, score, duplicidade, Round Robin) é validada aqui
 * no servidor — nunca confiar no que o client calculou/mandou como "ok".
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = createLeadRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Honeypot simples contra bots de formulário automatizados.
  const honeypot = (json as Record<string, unknown>)?.website;
  if (typeof honeypot === "string" && honeypot.length > 0) {
    return NextResponse.json({ error: "rejected" }, { status: 400 });
  }

  try {
    const result = await submitLead(parsed.data);

    // O lead já foi gravado e é o que o usuário está esperando ver na tela;
    // os eventos de tracking são só analytics, então rodam depois da
    // resposta em vez de mais duas chamadas sequenciais à planilha (cada
    // uma com o mesmo custo fixo de latência do Apps Script) atrasando o
    // "ENVIANDO..." do formulário.
    after(async () => {
      await recordFunnelEvent({
        eventName: FUNNEL_EVENTS.leadCreated,
        sessionId: parsed.data.sessionId,
        leadId: result.leadId,
        utm_source: parsed.data.utm_source,
        utm_medium: parsed.data.utm_medium,
        utm_campaign: parsed.data.utm_campaign,
        utm_content: parsed.data.utm_content,
        utm_term: parsed.data.utm_term,
        fbclid: parsed.data.fbclid,
        landing_page: parsed.data.landing_page,
        metadata: { isNew: result.isNew },
      });

      if (result.consultant) {
        await recordFunnelEvent({
          eventName: FUNNEL_EVENTS.consultantAssigned,
          sessionId: parsed.data.sessionId,
          leadId: result.leadId,
          metadata: { consultantName: result.consultant.name },
        });
      }
    });

    return NextResponse.json({
      leadId: result.leadId,
      consultant: result.consultant,
    });
  } catch (error) {
    console.error("Erro ao gravar lead", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
