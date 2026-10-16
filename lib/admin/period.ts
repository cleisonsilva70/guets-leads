import "server-only";
import {
  getDashboardMetrics,
  type ConsultantLeadCount,
  type DashboardMetrics,
  type MonthMetrics,
} from "@/lib/admin/metrics";

/** Números de um período (um mês ou o total), prontos para o painel desenhar. */
export interface PeriodView {
  total: number;
  hot: number;
  qualified: number;
  beginner: number;
  whatsappOpened: number | undefined;
  minimumOrderAccepted: number;
  minimumOrderRejected: number;
  consultants: ConsultantLeadCount[];
}

export interface DashboardData {
  /** Mês realmente exibido ("YYYY-MM") ou undefined para o total. */
  selectedMonth: string | undefined;
  /** Meses com leads, do mais antigo ao mais novo. */
  months: MonthMetrics[];
  /** false enquanto o Apps Script for o antigo (sem série por mês). */
  hasMonthFilter: boolean;
  generatedAt: string | undefined;
  now: Pick<DashboardMetrics, "leadsToday" | "leads7d" | "leadsMonth">;
  view: PeriodView;
}

function totalView(base: DashboardMetrics): PeriodView {
  return {
    total: base.total ?? base.hot + base.qualified + base.beginner,
    hot: base.hot,
    qualified: base.qualified,
    beginner: base.beginner,
    whatsappOpened: base.whatsappClicked,
    minimumOrderAccepted: base.minimumOrderAccepted,
    minimumOrderRejected: base.minimumOrderRejected,
    consultants: base.leadsByConsultant,
  };
}

function monthView(base: DashboardMetrics, m: MonthMetrics): PeriodView {
  const byConsultant = m.byConsultant ?? {};
  return {
    total: m.leads,
    hot: m.hot,
    qualified: m.qualified,
    beginner: m.beginner,
    whatsappOpened: m.whatsappOpened,
    minimumOrderAccepted: m.minimumOrderAccepted,
    minimumOrderRejected: m.minimumOrderRejected,
    consultants: base.leadsByConsultant.map((c) => ({
      ...c,
      leadCount: byConsultant[c.consultantId]?.leadCount ?? 0,
      whatsappClicks: byConsultant[c.consultantId]?.whatsappClicks ?? 0,
    })),
  };
}

/**
 * Uma única chamada (o total, em cache) alimenta o painel inteiro: o mês
 * escolhido é recortado aqui, sem nova ida ao Apps Script. Só quando o Apps
 * Script é uma versão intermediária (série por mês sem divisão por
 * consultora) é que o mês pedido é buscado à parte.
 */
export async function loadDashboardData(requestedMonth: string | undefined): Promise<DashboardData> {
  const base = await getDashboardMetrics();
  const months = [...(base.months ?? [])].sort((a, b) => a.month.localeCompare(b.month));
  const hasMonthFilter = months.length > 0;

  const picked = hasMonthFilter ? months.find((m) => m.month === requestedMonth) : undefined;
  const selectedMonth = picked?.month;

  let view: PeriodView;
  if (!picked) {
    view = totalView(base);
  } else if (picked.byConsultant) {
    view = monthView(base, picked);
  } else {
    view = totalView(await getDashboardMetrics(picked.month));
  }

  return {
    selectedMonth,
    months,
    hasMonthFilter,
    generatedAt: base.generatedAt,
    now: { leadsToday: base.leadsToday, leads7d: base.leads7d, leadsMonth: base.leadsMonth },
    view,
  };
}
