import "server-only";
import { sheetsGet } from "@/lib/sheets/client";

export interface ConsultantLeadCount {
  consultantId: string;
  consultantName: string;
  active: boolean;
  leadCount: number;
  /** Leads que abriram o WhatsApp da consultora (undefined até o Apps Script ser atualizado). */
  whatsappClicks?: number;
}

export interface MonthMetrics {
  /** "YYYY-MM" */
  month: string;
  leads: number;
  hot: number;
  qualified: number;
  beginner: number;
  whatsappOpened: number;
  minimumOrderAccepted: number;
  minimumOrderRejected: number;
}

export interface DashboardMetrics {
  /** "all" ou "YYYY-MM"; só vem no Apps Script com filtro por mês. */
  period?: string;
  /** Leads do período selecionado. */
  total?: number;
  /** Sempre "agora", independentes do período. */
  leadsToday: number;
  leads7d: number;
  leadsMonth: number;
  hot: number;
  qualified: number;
  beginner: number;
  minimumOrderAccepted: number;
  minimumOrderRejected: number;
  minimumOrderAcceptanceRate: number;
  whatsappClicked?: number;
  /** Série mês a mês (mais recente primeiro). */
  months?: MonthMetrics[];
  leadsByConsultant: ConsultantLeadCount[];
}

/** `month` no formato "YYYY-MM"; sem ele, o total de todos os meses. */
export async function getDashboardMetrics(month?: string): Promise<DashboardMetrics> {
  return sheetsGet<DashboardMetrics>("metrics", { month });
}
