import "server-only";
import { constantTimeEqual } from "./constant-time-equal";
import { signWithSessionSecret } from "./admin-session";

export const CONSULTANT_SESSION_COOKIE = "guets_consultant_session";
export const CONSULTANT_SESSION_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 dias
const MAX_AGE_MS = CONSULTANT_SESSION_MAX_AGE_S * 1000;

// Prefixo diferente do admin: um cookie de admin nunca vale como sessão de consultora.
function payloadToSign(consultantId: string, issuedAt: string) {
  return `consultant:${consultantId}.${issuedAt}`;
}

export async function createConsultantSessionToken(consultantId: string): Promise<string> {
  const issuedAt = Date.now().toString();
  const signature = await signWithSessionSecret(payloadToSign(consultantId, issuedAt));
  return `${consultantId}.${issuedAt}.${signature}`;
}

/** Devolve o id da consultora se o token for autêntico e não tiver expirado. */
export async function readConsultantSessionToken(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return null;
  const [consultantId, issuedAt, signature] = token.split(".");
  if (!consultantId || !issuedAt || !signature) return null;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > MAX_AGE_MS) return null;

  const expected = await signWithSessionSecret(payloadToSign(consultantId, issuedAt));
  return (await constantTimeEqual(expected, signature)) ? consultantId : null;
}
