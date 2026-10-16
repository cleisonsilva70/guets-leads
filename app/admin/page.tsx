import Link from "next/link";
import { getDashboardMetrics } from "@/lib/admin/metrics";
import { monthLabel, parseMonthParam } from "@/lib/admin/month";
import { MetricCard } from "@/components/admin/MetricCard";
import { leadClassificationLabels } from "@/lib/lead-scoring";

interface PageProps {
  searchParams: Promise<{ mes?: string }>;
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const requestedMonth = parseMonthParam(sp.mes);
  const metrics = await getDashboardMetrics(requestedMonth);

  const months = metrics.months ?? [];
  // O Apps Script ainda antigo não manda `months` (e ignora o mês pedido): o painel
  // segue como era, sem o filtro, e o período mostrado é sempre o total.
  const hasMonthFilter = months.length > 0;
  const selectedMonth = hasMonthFilter ? requestedMonth : undefined;
  const isTotal = !selectedMonth;
  const periodLabel = isTotal ? "Total de todos os meses" : monthLabel(selectedMonth);
  const periodTotal = metrics.total ?? metrics.hot + metrics.qualified + metrics.beginner;

  const sum = (pick: (m: (typeof months)[number]) => number) =>
    months.reduce((acc, m) => acc + pick(m), 0);

  const pillClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold ${
      active ? "bg-ink text-white" : "border border-smoke bg-white text-muted hover:text-ink"
    }`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-muted">Visão geral do funil de leads B2B.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Agora</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard label="Leads hoje" value={metrics.leadsToday} />
          <MetricCard label="Leads últimos 7 dias" value={metrics.leads7d} />
          <MetricCard label="Leads no mês atual" value={metrics.leadsMonth} />
        </div>
      </section>

      {hasMonthFilter ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Período</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className={pillClass(isTotal)}>
              Total
            </Link>
            {[...months]
              .sort((a, b) => a.month.localeCompare(b.month))
              .map((m) => (
                <Link
                  key={m.month}
                  href={`/admin?mes=${m.month}`}
                  className={pillClass(selectedMonth === m.month)}
                >
                  {monthLabel(m.month)}
                </Link>
              ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-8 rounded-2xl border border-smoke p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Resultados de</p>
          <p className="text-xl font-bold text-ink">{periodLabel}</p>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Volume</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetricCard label="Leads no período" value={periodTotal} />
            {hasMonthFilter && isTotal ? (
              <MetricCard label="Meses com leads" value={months.length} />
            ) : null}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Classificação
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetricCard label={leadClassificationLabels.hot} value={metrics.hot} />
            <MetricCard label={leadClassificationLabels.qualified} value={metrics.qualified} />
            <MetricCard label={leadClassificationLabels.beginner} value={metrics.beginner} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Pedido mínimo
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <MetricCard label="Aceitaram o pedido mínimo" value={metrics.minimumOrderAccepted} />
            <MetricCard label="Rejeitados pelo pedido mínimo" value={metrics.minimumOrderRejected} />
            <MetricCard
              label="Taxa de aceitação"
              value={`${metrics.minimumOrderAcceptanceRate}%`}
            />
          </div>
        </section>

        {metrics.whatsappClicked !== undefined ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Contato com a consultora
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <MetricCard
                label="Abriram o WhatsApp da consultora"
                value={metrics.whatsappClicked}
                hint="Abrir a conversa não garante que a mensagem foi enviada"
              />
              <MetricCard
                label="Taxa de abertura"
                value={percent(metrics.whatsappClicked, periodTotal)}
                hint="Abriram ÷ leads do período"
              />
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Leads por consultora
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-smoke bg-white">
            <table className="w-full text-sm">
              <thead className="bg-smoke/50 text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Consultora</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Leads atribuídos</th>
                  {metrics.whatsappClicked !== undefined ? (
                    <th className="px-4 py-3 font-medium">Abriram o WhatsApp</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {metrics.leadsByConsultant.map((c) => (
                  <tr key={c.consultantId} className="border-t border-smoke">
                    <td className="px-4 py-3 font-medium text-ink">{c.consultantName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.active ? "bg-green-100 text-green-700" : "bg-smoke text-muted"
                        }`}
                      >
                        {c.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.leadCount}</td>
                    {metrics.whatsappClicked !== undefined ? (
                      <td className="px-4 py-3">{c.whatsappClicks ?? 0}</td>
                    ) : null}
                  </tr>
                ))}
                {metrics.leadsByConsultant.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted">
                      Nenhuma consultora cadastrada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {hasMonthFilter ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Mês a mês
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-smoke bg-white">
            <table className="w-full text-sm">
              <thead className="bg-smoke/50 text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Mês</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">{leadClassificationLabels.hot}</th>
                  <th className="px-4 py-3 font-medium">{leadClassificationLabels.qualified}</th>
                  <th className="px-4 py-3 font-medium">{leadClassificationLabels.beginner}</th>
                  <th className="px-4 py-3 font-medium">Abriram o WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Aceitaram o pedido mínimo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-smoke bg-cream/60 font-semibold">
                  <td className="px-4 py-3">
                    <Link href="/admin" className="text-ink hover:underline">
                      Total
                    </Link>
                  </td>
                  <td className="px-4 py-3">{sum((m) => m.leads)}</td>
                  <td className="px-4 py-3">{sum((m) => m.hot)}</td>
                  <td className="px-4 py-3">{sum((m) => m.qualified)}</td>
                  <td className="px-4 py-3">{sum((m) => m.beginner)}</td>
                  <td className="px-4 py-3">{sum((m) => m.whatsappOpened)}</td>
                  <td className="px-4 py-3">{sum((m) => m.minimumOrderAccepted)}</td>
                </tr>
                {months.map((m) => (
                  <tr
                    key={m.month}
                    className={`border-t border-smoke ${
                      selectedMonth === m.month ? "bg-cream/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin?mes=${m.month}`} className="font-medium text-ink hover:underline">
                        {monthLabel(m.month)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{m.leads}</td>
                    <td className="px-4 py-3">{m.hot}</td>
                    <td className="px-4 py-3">{m.qualified}</td>
                    <td className="px-4 py-3">{m.beginner}</td>
                    <td className="px-4 py-3">{m.whatsappOpened}</td>
                    <td className="px-4 py-3">{m.minimumOrderAccepted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
