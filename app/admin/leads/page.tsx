import Link from "next/link";
import { listLeads } from "@/lib/admin/leads";
import { listConsultants } from "@/lib/admin/consultants";
import { leadClassificationLabels } from "@/lib/lead-scoring";
import { investmentRangeLabels, leadStatusValues } from "@/lib/labels";

interface PageProps {
  searchParams: Promise<{
    consultantId?: string;
    classification?: string;
    investmentRange?: string;
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
      classification: sp.classification,
      investmentRange: sp.investmentRange,
      status: sp.status,
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
          {Object.values(leadClassificationLabels).map((label) => (
            <option key={label} value={label}>
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
          {Object.values(investmentRangeLabels).map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-smoke px-3 py-2 text-sm"
        >
          <option value="">Todo status</option>
          {leadStatusValues.map((label) => (
            <option key={label} value={label}>
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
              <th className="px-4 py-3 font-medium">Bairro</th>
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
                <td className="px-4 py-3">{lead.businessName}</td>
                <td className="px-4 py-3">{lead.neighborhood}</td>
                <td className="px-4 py-3">{lead.whatsapp}</td>
                <td className="px-4 py-3">{lead.investmentRangeLabel}</td>
                <td className="px-4 py-3">{lead.classification}</td>
                <td className="px-4 py-3">{lead.consultantName ?? "—"}</td>
                <td className="px-4 py-3">{lead.utmCampaign ?? "—"}</td>
                <td className="px-4 py-3">{new Date(lead.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">{lead.status}</td>
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
