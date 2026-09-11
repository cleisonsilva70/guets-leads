/** Normaliza "@mariafit", "mariafit" ou "instagram.com/mariafit" para "mariafit". */
export function normalizeInstagramHandle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const withoutUrl = trimmed.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  const withoutQuery = withoutUrl.split(/[?/]/)[0];
  return withoutQuery.replace(/^@/, "").trim();
}

export function instagramProfileUrl(handle: string): string {
  const normalized = normalizeInstagramHandle(handle);
  return normalized ? `https://instagram.com/${normalized}` : "";
}
