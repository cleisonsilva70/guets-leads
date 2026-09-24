import "server-only";
import { sheetsGet } from "@/lib/sheets/client";

export interface ConsultantLeadCount {
  consultantId: string;
  consultantName: string;
  active: boolean;
  leadCount: number;
  /** Leads que clicaram no botão de WhatsApp (undefined até o Apps Script ser atualizado). */
  whatsappClicks?: number;
}

export interface DashboardMetrics {
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
  leadsByConsultant: ConsultantLeadCount[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return sheetsGet<DashboardMetrics>("metrics");
}
