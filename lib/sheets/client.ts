import "server-only";

/**
 * Cliente compartilhado pro backend em Google Apps Script (ver
 * google-apps-script/Code.gs). Toda leitura (GET) e escrita (POST) do site
 * — cadastro público, eventos de funil e o painel /admin — passa por aqui.
 */

function getConfig() {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const token = process.env.GOOGLE_SHEETS_TOKEN;
  if (!url) throw new Error("GOOGLE_SHEETS_WEBHOOK_URL não configurado.");
  if (!token) throw new Error("GOOGLE_SHEETS_TOKEN não configurado.");
  return { url, token };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Falha na planilha: HTTP ${response.status}`);
  }
  const data = (await response.json()) as T & { error?: string };
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(`Falha na planilha: ${data.error}`);
  }
  return data;
}

/**
 * Cada chamada ao Apps Script custa uns 2-4s de overhead fixo do Google,
 * mesmo pra uma leitura simples — não tem como evitar isso, é inerente à
 * plataforma. O que dá pra evitar é repetir essa espera a cada navegação no
 * admin: as leituras (GET) ficam em cache por alguns segundos, e qualquer
 * escrita que precise refletir na hora (ver revalidateTag("sheets") nos
 * server actions do admin) invalida esse cache imediatamente.
 */
export async function sheetsGet<T>(
  action: string,
  params: Record<string, string | number | undefined> = {},
  options: { revalidate?: number } = {}
): Promise<T> {
  const { url, token } = getConfig();
  const search = new URLSearchParams({ action, token });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const response = await fetch(`${url}?${search.toString()}`, {
    method: "GET",
    next: { revalidate: options.revalidate ?? 15, tags: ["sheets"] },
  });
  return parseResponse<T>(response);
}

export async function sheetsPost<T>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const { url, token } = getConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, token, ...body }),
  });
  return parseResponse<T>(response);
}
