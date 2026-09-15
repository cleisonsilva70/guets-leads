import "server-only";

/**
 * Meta Conversions API — envia o mesmo evento de conversão que o Pixel
 * dispara no navegador, mas direto do servidor. Existe porque bloqueador
 * de anúncio, Safari/iOS (ITP) e afins derrubam boa parte dos eventos só
 * de Pixel; mandar os dois em paralelo (client + server) com o mesmo
 * event_id deixa o Meta deduplicar e usar o que chegou primeiro.
 *
 * Documentação: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const GRAPH_API_VERSION = "v21.0";

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Meta exige e-mail em minúsculas e sem espaços antes do hash. */
async function hashEmail(email: string): Promise<string> {
  return sha256Hex(email.trim().toLowerCase());
}

/** Meta exige telefone só com dígitos, com código do país, antes do hash. */
async function hashPhone(whatsappNormalizado: string): Promise<string> {
  return sha256Hex(whatsappNormalizado.replace(/\D/g, ""));
}

export interface MetaLeadEventInput {
  eventId: string;
  email: string;
  whatsappNormalizado: string;
  eventSourceUrl: string;
  clientIp: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
}

/**
 * Manda o evento padrão "Lead" pra Conversions API. Nunca lança pro caller
 * — assim como o resto do tracking, uma falha aqui não pode derrubar o
 * cadastro em si, que já foi salvo na planilha antes desta chamada.
 */
export async function sendMetaLeadEvent(input: MetaLeadEventInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  if (!pixelId || !accessToken) return;

  try {
    const [hashedEmail, hashedPhone] = await Promise.all([
      hashEmail(input.email),
      hashPhone(input.whatsappNormalizado),
    ]);

    const testEventCode = process.env.META_TEST_EVENT_CODE;

    const body = {
      data: [
        {
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          event_id: input.eventId,
          action_source: "website",
          event_source_url: input.eventSourceUrl,
          user_data: {
            em: [hashedEmail],
            ph: [hashedPhone],
            client_ip_address: input.clientIp ?? undefined,
            client_user_agent: input.userAgent ?? undefined,
            fbp: input.fbp ?? undefined,
            fbc: input.fbc ?? undefined,
          },
        },
      ],
      ...(testEventCode ? { test_event_code: testEventCode } : {}),
    };

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`Falha ao enviar evento pra Meta Conversions API: HTTP ${response.status} ${errorBody}`);
    }
  } catch (error) {
    console.error("Falha ao enviar evento pra Meta Conversions API", error);
  }
}
