import { revalidatePath } from "next/cache";
import { listConsultants, createConsultant, updateConsultant } from "@/lib/admin/consultants";
import { formatWhatsappInput } from "@/lib/validation/whatsapp";

async function createConsultantAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim();
  if (!name || !whatsapp) return;

  await createConsultant({ name, whatsapp });
  revalidatePath("/admin/consultoras");
}

async function toggleActiveAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await updateConsultant(id, { active: !active });
  revalidatePath("/admin/consultoras");
  revalidatePath("/admin");
}

async function updateWhatsappAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const whatsapp = String(formData.get("whatsapp") || "").trim();
  if (!whatsapp) return;
  await updateConsultant(id, { whatsapp });
  revalidatePath("/admin/consultoras");
}

export default async function ConsultantsPage() {
  const consultants = await listConsultants();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Consultoras</h1>
        <p className="text-sm text-muted">
          O Round Robin distribui sempre para a consultora ativa que está há mais tempo sem
          receber um lead novo.
        </p>
      </div>

      <section className="rounded-2xl border border-smoke bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Nova consultora
        </h2>
        <form action={createConsultantAction} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-sm font-medium text-ink">Nome</label>
            <input
              name="name"
              required
              className="w-full rounded-xl border-2 border-smoke px-3 py-2 focus:border-graphite focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-sm font-medium text-ink">WhatsApp</label>
            <input
              name="whatsapp"
              required
              placeholder="(84) 99999-9999"
              className="w-full rounded-xl border-2 border-smoke px-3 py-2 focus:border-graphite focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-graphite px-5 py-2 font-semibold text-white hover:bg-ink cursor-pointer"
          >
            Adicionar
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-smoke bg-white">
        <table className="w-full text-sm">
          <thead className="bg-smoke/50 text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">WhatsApp</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Leads recebidos</th>
              <th className="px-4 py-3 font-medium">Última atribuição</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {consultants.map((c) => (
              <tr key={c.id} className="border-t border-smoke">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3">
                  <form action={updateWhatsappAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input
                      name="whatsapp"
                      defaultValue={formatWhatsappInput(c.whatsapp)}
                      className="w-40 rounded-lg border border-smoke px-2 py-1 text-sm focus:border-graphite focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-graphite hover:text-ink cursor-pointer"
                    >
                      Salvar
                    </button>
                  </form>
                </td>
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
                <td className="px-4 py-3 text-muted">
                  {c.lastAssignedAt ? new Date(c.lastAssignedAt).toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3">
                  <form action={toggleActiveAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(c.active)} />
                    <button
                      type="submit"
                      className="text-xs font-semibold text-ink underline hover:text-graphite cursor-pointer"
                    >
                      {c.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {consultants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhuma consultora cadastrada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
