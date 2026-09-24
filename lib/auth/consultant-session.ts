import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CONSULTANT_SESSION_COOKIE, readConsultantSessionToken } from "./consultant-token";
import { listConsultants, type Consultant } from "@/lib/admin/consultants";

/**
 * Consultora logada, ou null. Confere na planilha que ela ainda existe e está
 * ativa: desativar uma consultora no admin derruba o acesso dela na hora.
 */
export async function getCurrentConsultant(): Promise<Consultant | null> {
  const store = await cookies();
  const consultantId = await readConsultantSessionToken(
    store.get(CONSULTANT_SESSION_COOKIE)?.value
  );
  if (!consultantId) return null;

  const consultants = await listConsultants();
  return consultants.find((c) => c.id === consultantId && c.active) ?? null;
}

export async function requireConsultant(): Promise<Consultant> {
  const consultant = await getCurrentConsultant();
  if (!consultant) redirect("/consultora/login");
  return consultant;
}
