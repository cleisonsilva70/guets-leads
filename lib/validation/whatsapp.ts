/**
 * Normaliza um número de WhatsApp brasileiro para o padrão internacional
 * usado em `wa.me` e como identificador único de duplicidade: apenas
 * dígitos, com DDI 55 (ex: "(84) 99999-9999" -> "5584999999999").
 */
export function normalizeWhatsapp(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // Já veio com DDI diferente/errado ou tamanho inesperado: devolve como
  // veio (dígitos) para a validação de formato acusar o erro, em vez de
  // mascarar um número inválido com um prefixo incorreto.
  return digits;
}

export function isValidBrazilianWhatsapp(raw: string): boolean {
  const normalized = normalizeWhatsapp(raw);
  // 55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
  return /^55[1-9]{2}9?\d{8}$/.test(normalized);
}

/** Formata dígitos brutos como "(84) 99999-9999" enquanto o usuário digita. */
export function formatWhatsappInput(raw: string): string {
  const digits = String(raw).replace(/\D/g, "").replace(/^55/, "").slice(0, 11);

  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function buildWhatsappLink(whatsappNormalized: string, message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${whatsappNormalized}?text=${encoded}`;
}
