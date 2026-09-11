import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLeadById, updateLeadStatus } from "@/lib/admin/leads";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  purchasePurposeLabels,
  segmentLabels,
  salesChannelLabels,
  investmentRangeLabels,
  purchaseFrequencyLabels,
  leadStatusOptions,
} from "@/lib/labels";
import { leadClassificationLabels } from "@/lib/lead-scoring";
import { instagramProfileUrl } from "@/lib/validation/instagram";
import type { LeadStatus } from "@/types/lead";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value ?? "—"}</dd>
    </div>
  );
}

export default async function LeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const supabase = getSupabaseAdmin();
  const consultant = lead.consultant_id
    ? (await supabase.from("consultants").select("*").eq("id", lead.consultant_id).single()).data
    : null;

  async function updateStatusAction(formData: FormData) {
    "use server";
    const status = String(formData.get("status")) as LeadStatus;
    await updateLeadStatus(id, status);
    revalidatePath(`/admin/leads/${id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{lead.name}</h1>
        <p className="text-sm text-muted">{lead.business_name}</p>
      </div>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Dados</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nome" value={lead.name} />
          <Field label="WhatsApp" value={lead.whatsapp_raw} />
          <Field label="E-mail" value={lead.email} />
          <Field label="Cidade" value={lead.city} />
          <Field label="Estado" value={lead.state} />
          <Field label="Negócio" value={lead.business_name} />
          <Field
            label="Instagram"
            value={
              lead.instagram ? (
                <a
                  className="text-graphite hover:underline"
                  href={instagramProfileUrl(lead.instagram)}
                  target="_blank"
                  rel="noreferrer"
                >
                  @{lead.instagram}
                </a>
              ) : null
            }
          />
          <Field label="CPF/CNPJ" value={lead.cpf_cnpj} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Qualificação
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Finalidade" value={purchasePurposeLabels[lead.purchase_purpose]} />
          <Field label="Aceitou pedido mínimo" value={lead.accepts_minimum_order ? "Sim" : "Não"} />
          <Field label="Segmento" value={segmentLabels[lead.segment]} />
          <Field label="Canal" value={salesChannelLabels[lead.sales_channel]} />
          <Field label="Investimento" value={investmentRangeLabels[lead.investment_range]} />
          <Field label="Frequência" value={purchaseFrequencyLabels[lead.purchase_frequency]} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Comercial
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Score" value={lead.lead_score} />
          <Field label="Classificação" value={leadClassificationLabels[lead.lead_classification]} />
          <Field label="Consultora" value={consultant?.name} />
          <Field
            label="Status"
            value={
              <form action={updateStatusAction} className="flex items-center gap-2">
                <select
                  name="status"
                  defaultValue={lead.status}
                  className="rounded-lg border border-smoke px-2 py-1 text-sm"
                >
                  {leadStatusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-xs font-semibold text-graphite hover:text-ink cursor-pointer"
                >
                  Salvar
                </button>
              </form>
            }
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Marketing
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="UTM Source" value={lead.utm_source} />
          <Field label="UTM Medium" value={lead.utm_medium} />
          <Field label="UTM Campaign" value={lead.utm_campaign} />
          <Field label="UTM Content" value={lead.utm_content} />
          <Field label="UTM Term" value={lead.utm_term} />
          <Field label="FBCLID" value={lead.fbclid} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Sistema</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Data do cadastro" value={new Date(lead.created_at).toLocaleString("pt-BR")} />
          <Field label="Última atualização" value={new Date(lead.updated_at).toLocaleString("pt-BR")} />
        </dl>
      </section>
    </div>
  );
}
