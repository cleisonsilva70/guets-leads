import "server-only";
import { sheetsGet, sheetsPost } from "@/lib/sheets/client";
import { normalizeWhatsapp } from "@/lib/validation/whatsapp";

export interface Consultant {
  id: string;
  name: string;
  whatsapp: string;
  active: boolean;
  lastAssignedAt: string | null;
  leadCount: number;
  hasAccessCode?: boolean;
}

export async function listConsultants(): Promise<Consultant[]> {
  const data = await sheetsGet<{ consultants: Consultant[] }>("list_consultants");
  return data.consultants ?? [];
}

export async function createConsultant(input: { name: string; whatsapp: string }): Promise<void> {
  await sheetsPost("create_consultant", {
    name: input.name,
    whatsapp: normalizeWhatsapp(input.whatsapp),
  });
}

export async function updateConsultant(
  id: string,
  input: { name?: string; whatsapp?: string; active?: boolean }
): Promise<void> {
  await sheetsPost("update_consultant", {
    id,
    name: input.name,
    whatsapp: input.whatsapp ? normalizeWhatsapp(input.whatsapp) : undefined,
    active: input.active,
  });
}

export async function setConsultantAccessCodeHash(id: string, accessCodeHash: string): Promise<void> {
  await sheetsPost("update_consultant", { id, accessCodeHash });
}

/** Devolve a consultora dona do código (hash SHA-256 em hex), se ela existir e estiver ativa. */
export async function findConsultantByAccessCodeHash(
  accessCodeHash: string
): Promise<{ id: string; name: string } | null> {
  const result = await sheetsPost<{ consultant: { id: string; name: string } | null }>(
    "consultant_login",
    { accessCodeHash }
  );
  return result.consultant ?? null;
}
