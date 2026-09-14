import "server-only";
import { sheetsGet } from "@/lib/sheets/client";

export interface ConsultantLeadCount {
  consultantId: string;
  consultantName: string;
  active: boolean;
  leadCount: number;
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
  leadsByConsultant: ConsultantLeadCount[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return sheetsGet<DashboardMetrics>("metrics");
}
