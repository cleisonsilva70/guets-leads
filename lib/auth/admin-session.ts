import "server-only";
import { constantTimeEqual } from "./constant-time-equal";

export const ADMIN_SESSION_COOKIE = "guets_admin_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET não configurado.");
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  // btoa é global tanto no runtime Edge quanto no Node.js 18+.
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(signature);
}

/** Assinatura HMAC com o mesmo segredo do admin; quem chama põe um prefixo próprio no `data` pra separar os tipos de sessão. */
export async function signWithSessionSecret(data: string): Promise<string> {
  return hmac(data);
}

export async function createAdminSessionToken(): Promise<string> {
  const issuedAt = Date.now().toString();
  const signature = await hmac(issuedAt);
  return `${issuedAt}.${signature}`;
}

export async function isValidAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs) || Date.now() - issuedAtMs > MAX_AGE_MS) return false;

  const expected = await hmac(issuedAt);
  return constantTimeEqual(expected, signature);
}
