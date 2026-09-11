import Link from "next/link";
import { listLeads } from "@/lib/admin/leads";
import { listConsultants } from "@/lib/admin/consultants";
import { leadClassificationLabels } from "@/lib/lead-scoring";
import { investmentRangeLabels, leadStatusLabels, leadStatusOptions } from "@/lib/labels";
import { brazilianStates } from "@/lib/data/brazilian-states";
import type { InvestmentRange, LeadClassification, LeadStatus } from "@/types/lead";

interface PageProps {
  searchParams: Promise<{
    consultantId?: string;
    classification?: string;
    investmentRange?: string;
    state?: string;
    status?: string;
    campaign?: string;
    page?: string;
  }>;
}

function buildQueryString(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  Object.entries(merged).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.toString();
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [consultants, result] = await Promise.all([
    listConsultants(),
    listLeads({
      consultantId: sp.consultantId,
      classification: sp.classification as LeadClassification | undefined,
      investmentRange: sp.investmentRange as InvestmentRange | undefined,
      state: sp.state,
      status: sp.status as LeadStatus | undefined,
      campaign: sp.campaign,
      page: sp.page ? Number(sp.page) : 1,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Leads</h1>
        <p className="text-sm text-muted">{result.total} leads encontrados</p>
      </div>

      <form className="flex flex-wrap gap-3 rounded-2xl border border-smoke bg-white p-4">
        <select
          name="consultantId"
          defaultValue={sp.consultantId ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        >
          <option value="">Todas as consultoras</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          name="classification"
          defaultValue={sp.classification ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        >
          <option value="">Toda classificação</option>
          {Object.entries(leadClassificationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="investmentRange"
          defaultValue={sp.investmentRange ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        >
          <option value="">Todo investimento</option>
          {Object.entries(investmentRangeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="state"
          defaultValue={sp.state ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        >
          <option value="">Todo estado</option>
          {brazilianStates.map((s) => (
            <option key={s.uf} value={s.uf}>
              {s.uf}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        >
          <option value="">Todo status</option>
          {leadStatusOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          name="campaign"
          placeholder="Campanha (UTM)"
          defaultValue={sp.campaign ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        />

        <button
          type="submit"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white cursor-pointer"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-smoke bg-white">
        <table className="w-full text-sm">
          <thead className="bg-smoke/50 text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Loja</th>
              <th className="px-4 py-3 font-medium">Cidade/UF</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Investimento</th>
              <th className="px-4 py-3 font-medium">Classificação</th>
              <th className="px-4 py-3 font-medium">Consultora</th>
              <th className="px-4 py-3 font-medium">Campanha</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.leads.map((lead) => (
              <tr key={lead.id} className="border-t border-smoke hover:bg-cream/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium text-ink hover:text-graphite">
                    {lead.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{lead.business_name}</td>
                <td className="px-4 py-3">
                  {lead.city}/{lead.state}
                </td>
                <td className="px-4 py-3">{lead.whatsapp_raw}</td>
                <td className="px-4 py-3">{investmentRangeLabels[lead.investment_range]}</td>
                <td className="px-4 py-3">{leadClassificationLabels[lead.lead_classification]}</td>
                <td className="px-4 py-3">
                  {consultants.find((c) => c.id === lead.consultant_id)?.name ?? "—"}
                </td>
                <td className="px-4 py-3">{lead.utm_campaign ?? "—"}</td>
                <td className="px-4 py-3">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">{leadStatusLabels[lead.status]}</td>
              </tr>
            ))}
            {result.leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-muted">
                  Nenhum lead encontrado com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {result.pageCount > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/leads?${buildQueryString(sp, { page: String(p) })}`}
              className={`rounded-lg px-3 py-1 ${
                p === result.page ? "bg-ink text-white" : "bg-white text-muted border border-smoke"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
