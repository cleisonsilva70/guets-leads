import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Chama a function `assign_next_consultant` no Postgres, que faz o
 * lock/seleção/atualização/insert de forma atômica (ver
 * supabase/migrations/0001_init.sql). Nunca calcular Round Robin em
 * JS/frontend — apenas orquestrar a chamada RPC aqui.
 *
 * Retorna o id da consultora atribuída, ou null se nenhuma consultora
 * ativa estiver disponível (o lead não é perdido: fica com
 * status = 'awaiting_assignment').
 */
export async function assignNextConsultant(leadId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("assign_next_consultant", {
    p_lead_id: leadId,
  });

  if (error) {
    throw new Error(`Falha ao atribuir consultora via Round Robin: ${error.message}`);
  }

  return data ?? null;
}
