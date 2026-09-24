"use server";

import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/auth/admin-session";
import { formatAccessCode, generateAccessCode, hashAccessCode } from "@/lib/auth/access-code";
import { setConsultantAccessCodeHash } from "@/lib/admin/consultants";

/**
 * Gera (ou troca) o código de acesso da consultora. Só o hash vai pra
 * planilha; o código em si é devolvido uma única vez pra quem gerou copiar.
 * Como Server Action é um endpoint público, confere a sessão de admin aqui.
 */
export async function generateAccessCodeAction(consultantId: string): Promise<string> {
  const store = await cookies();
  if (!(await isValidAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value))) {
    throw new Error("Não autorizado.");
  }

  const code = generateAccessCode();
  await setConsultantAccessCodeHash(consultantId, await hashAccessCode(code));
  updateTag("sheets");
  revalidatePath("/admin/consultoras");
  return formatAccessCode(code);
}
