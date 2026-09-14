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

export async function sheetsGet<T>(
  action: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const { url, token } = getConfig();
  const search = new URLSearchParams({ action, token });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const response = await fetch(`${url}?${search.toString()}`, {
    method: "GET",
    cache: "no-store",
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
