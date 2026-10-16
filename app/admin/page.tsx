import Link from "next/link";
import { loadDashboardData } from "@/lib/admin/period";
import { monthLabel, monthLabelShort, parseMonthParam } from "@/lib/admin/month";
import { leadClassificationLabels } from "@/lib/lead-scoring";
import {
  BarRow,
  Kpi,
  NowStrip,
  Panel,
  PeriodTabs,
  StackedBar,
  fmt,
  pct,
} from "@/components/admin/dashboard";

interface PageProps {
  searchParams: Promise<{ mes?: string }>;
}

function updatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const { selectedMonth, months, hasMonthFilter, generatedAt, now, view } = await loadDashboardData(
    parseMonthParam(sp.mes)
  );

  const periodLabel = selectedMonth ? monthLabel(selectedMonth) : "Total de todos os meses";
  const updated = updatedAt(generatedAt);
  const responses = view.minimumOrderAccepted + view.minimumOrderRejected;
  const acceptance = pct(view.minimumOrderAccepted, responses);
  const maxLeads = Math.max(0, ...view.consultants.map((c) => c.leadCount));

  const tabs = [
    { key: "total", label: "Total", href: "/admin" },
    ...months.map((m) => ({
      key: m.month,
      label: monthLabelShort(m.month),
      href: `/admin?mes=${m.month}`,
    })),
  ];

  const sum = (pick: (m: (typeof months)[number]) => number) =>
    months.reduce((acc, m) => acc + pick(m), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-muted">
            Funil de leads B2B · {periodLabel}
            {updated ? ` · atualizado às ${updated}` : ""}
          </p>
        </div>
        {hasMonthFilter ? <PeriodTabs items={tabs} selected={selectedMonth ?? "total"} /> : null}
      </header>

      <NowStrip
        items={[
          { label: "Leads hoje", value: now.leadsToday },
          { label: "Últimos 7 dias", value: now.leads7d },
          { label: "Neste mês", value: now.leadsMonth },
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Leads no período"
          value={fmt(view.total)}
          sub={hasMonthFilter && !selectedMonth ? `${months.length} meses com leads` : periodLabel}
        />
        {view.whatsappOpened !== undefined ? (
          <Kpi
            label="Abriram o WhatsApp"
            value={`${pct(view.whatsappOpened, view.total)}%`}
            progress={pct(view.whatsappOpened, view.total)}
            sub={`${fmt(view.whatsappOpened)} de ${fmt(view.total)} leads`}
          />
        ) : null}
        <Kpi
          label="Aceitaram o pedido mínimo"
          value={`${acceptance}%`}
          progress={acceptance}
          sub={`${fmt(view.minimumOrderAccepted)} de ${fmt(responses)} respostas`}
        />
        <Kpi
          label="Leads quentes"
          value={fmt(view.hot)}
          sub={`${pct(view.hot, view.total)}% dos leads`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Classificação" hint="Pelo score do quiz de qualificação">
          <StackedBar
            total={view.total}
            segments={[
              { label: leadClassificationLabels.hot, value: view.hot, color: "bg-amber-500" },
              { label: leadClassificationLabels.qualified, value: view.qualified, color: "bg-ink" },
              { label: leadClassificationLabels.beginner, value: view.beginner, color: "bg-muted/50" },
            ]}
          />
        </Panel>

        <Panel title="Leads por consultora" hint="Divisão do rodízio e quem abriu o WhatsApp">
          {view.consultants.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma consultora cadastrada ainda.</p>
          ) : (
            <ul className="space-y-4">
              {view.consultants.map((c) => (
                <BarRow
                  key={c.consultantId}
                  title={c.consultantName}
                  badge={c.active ? undefined : "Inativa"}
                  value={c.leadCount}
                  max={maxLeads}
                  right={
                    c.whatsappClicks !== undefined
                      ? `${fmt(c.whatsappClicks)} abriram o WhatsApp`
                      : "leads atribuídos"
                  }
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {hasMonthFilter ? (
        <Panel title="Mês a mês" hint="Clique em um mês para filtrar o painel">
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-smoke">
                  <th className="px-5 py-2 font-medium sm:px-6">Mês</th>
                  <th className="px-3 py-2 text-right font-medium">Leads</th>
                  <th className="px-3 py-2 text-right font-medium">Quentes</th>
                  <th className="px-3 py-2 text-right font-medium">Qualificados</th>
                  <th className="px-3 py-2 text-right font-medium">Iniciantes</th>
                  <th className="px-3 py-2 text-right font-medium">WhatsApp</th>
                  <th className="px-5 py-2 text-right font-medium sm:px-6">Pedido mín. aceito</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...months].reverse().map((m) => (
                  <tr
                    key={m.month}
                    className={`border-b border-smoke ${selectedMonth === m.month ? "bg-cream" : ""}`}
                  >
                    <td className="px-5 py-3 sm:px-6">
                      <Link href={`/admin?mes=${m.month}`} className="font-medium text-ink hover:underline">
                        {monthLabel(m.month)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right">{fmt(m.leads)}</td>
                    <td className="px-3 py-3 text-right">{fmt(m.hot)}</td>
                    <td className="px-3 py-3 text-right">{fmt(m.qualified)}</td>
                    <td className="px-3 py-3 text-right">{fmt(m.beginner)}</td>
                    <td className="px-3 py-3 text-right">{fmt(m.whatsappOpened)}</td>
                    <td className="px-5 py-3 text-right sm:px-6">{fmt(m.minimumOrderAccepted)}</td>
                  </tr>
                ))}
                <tr className={`font-semibold ${selectedMonth ? "" : "bg-cream"}`}>
                  <td className="px-5 py-3 sm:px-6">
                    <Link href="/admin" className="text-ink hover:underline">
                      Total
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right">{fmt(sum((m) => m.leads))}</td>
                  <td className="px-3 py-3 text-right">{fmt(sum((m) => m.hot))}</td>
                  <td className="px-3 py-3 text-right">{fmt(sum((m) => m.qualified))}</td>
                  <td className="px-3 py-3 text-right">{fmt(sum((m) => m.beginner))}</td>
                  <td className="px-3 py-3 text-right">{fmt(sum((m) => m.whatsappOpened))}</td>
                  <td className="px-5 py-3 text-right sm:px-6">{fmt(sum((m) => m.minimumOrderAccepted))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
