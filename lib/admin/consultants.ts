import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeWhatsapp } from "@/lib/validation/whatsapp";
import type { Consultant } from "@/types/lead";

export async function listConsultants(): Promise<Consultant[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("consultants")
    .select("*")
    .order("round_robin_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createConsultant(input: { name: string; whatsapp: string }): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("consultants").insert({
    name: input.name,
    whatsapp: normalizeWhatsapp(input.whatsapp),
    active: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateConsultant(
  id: string,
  input: { name?: string; whatsapp?: string; active?: boolean }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const payload: Partial<Consultant> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.whatsapp !== undefined) payload.whatsapp = normalizeWhatsapp(input.whatsapp);
  if (input.active !== undefined) payload.active = input.active;

  const { error } = await supabase.from("consultants").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}
