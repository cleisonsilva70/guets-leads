import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLeadById, updateLeadStatus } from "@/lib/admin/leads";
import { leadStatusValues } from "@/lib/labels";
import { instagramProfileUrl } from "@/lib/validation/instagram";

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

  async function updateStatusAction(formData: FormData) {
    "use server";
    const status = String(formData.get("status"));
    await updateLeadStatus(id, status);
    revalidatePath(`/admin/leads/${id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{lead.name}</h1>
        <p className="text-sm text-muted">{lead.businessName}</p>
      </div>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Dados</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Nome" value={lead.name} />
          <Field label="WhatsApp" value={lead.whatsapp} />
          <Field label="E-mail" value={lead.email} />
          <Field label="Negócio" value={lead.businessName} />
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
          <Field label="CPF/CNPJ" value={lead.cpfCnpj} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Endereço</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Endereço" value={lead.address} />
          <Field label="Número" value={lead.addressNumber} />
          <Field label="Bairro" value={lead.neighborhood} />
          <Field label="CEP" value={lead.zipCode} />
          <Field label="Complemento" value={lead.addressComplement} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Qualificação
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Finalidade" value={lead.purchasePurposeLabel} />
          <Field label="Segmento" value={lead.segmentLabel} />
          <Field label="Canal" value={lead.salesChannelLabel} />
          <Field label="Investimento" value={lead.investmentRangeLabel} />
          <Field label="Frequência" value={lead.purchaseFrequencyLabel} />
          <Field label="Tipo de loja" value={lead.storeTypeLabel} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Comercial
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Score" value={lead.leadScore} />
          <Field label="Classificação" value={lead.classification} />
          <Field
            label="Consultora"
            value={
              lead.consultantName
                ? `${lead.consultantName}${lead.consultantWhatsapp ? ` (${lead.consultantWhatsapp})` : ""}`
                : null
            }
          />
          <Field
            label="Status"
            value={
              <form action={updateStatusAction} className="flex items-center gap-2">
                <select
                  name="status"
                  defaultValue={lead.status}
                  className="rounded-lg border border-smoke px-2 py-1 text-sm"
                >
                  {leadStatusValues.map((label) => (
                    <option key={label} value={label}>
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
          <Field label="UTM Source" value={lead.utmSource} />
          <Field label="UTM Medium" value={lead.utmMedium} />
          <Field label="UTM Campaign" value={lead.utmCampaign} />
          <Field label="UTM Content" value={lead.utmContent} />
          <Field label="UTM Term" value={lead.utmTerm} />
          <Field label="FBCLID" value={lead.fbclid} />
        </dl>
      </section>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Sistema</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Data do cadastro" value={new Date(lead.createdAt).toLocaleString("pt-BR")} />
        </dl>
      </section>
    </div>
  );
}
