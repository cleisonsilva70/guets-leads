import { getDashboardMetrics } from "@/lib/admin/metrics";
import { MetricCard } from "@/components/admin/MetricCard";
import { leadClassificationLabels } from "@/lib/lead-scoring";

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-muted">Visão geral do funil de leads B2B.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Volume</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard label="Leads hoje" value={metrics.leadsToday} />
          <MetricCard label="Leads últimos 7 dias" value={metrics.leads7d} />
          <MetricCard label="Leads no mês" value={metrics.leadsMonth} />
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
              value={`${metrics.leadsMonth > 0 ? Math.round((metrics.whatsappClicked / metrics.leadsMonth) * 100) : 0}%`}
              hint="Abriram ÷ leads do mês"
            />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Leads por consultora
        </h2>
        <div className="overflow-hidden rounded-2xl border border-smoke bg-white">
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
  );
}
