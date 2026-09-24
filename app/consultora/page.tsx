import Link from "next/link";
import { requireConsultant } from "@/lib/auth/consultant-session";
import { listLeads } from "@/lib/admin/leads";
import { leadStatusLabels } from "@/lib/labels";
import { buildWhatsappLink, normalizeWhatsapp } from "@/lib/validation/whatsapp";
import { instagramProfileUrl, normalizeInstagramHandle } from "@/lib/validation/instagram";
import { ConsultantLeadCard } from "@/components/consultora/ConsultantLeadCard";

interface PageProps {
  searchParams: Promise<{ tab?: string; page?: string }>;
}

function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
}

export default async function ConsultantHomePage({ searchParams }: PageProps) {
  const consultant = await requireConsultant();
  const sp = await searchParams;
  const tab = sp.tab === "todos" ? "todos" : "novos";
  const page = sp.page ? Math.max(1, Number(sp.page) || 1) : 1;

  const result = await listLeads({
    consultantId: consultant.id,
    status: tab === "novos" ? leadStatusLabels.new : undefined,
    page,
  });

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold ${
      active ? "bg-ink text-white" : "border border-smoke bg-white text-muted"
    }`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Meus leads</h1>
        <p className="text-sm text-muted">
          {tab === "novos"
            ? `${result.total} ${result.total === 1 ? "lead aguardando" : "leads aguardando"} atendimento`
            : `${result.total} ${result.total === 1 ? "lead atribuído" : "leads atribuídos"} a você`}
        </p>
      </div>

      <div className="flex gap-2">
        <Link href="/consultora" className={tabClass(tab === "novos")}>
          Aguardando atendimento
        </Link>
        <Link href="/consultora?tab=todos" className={tabClass(tab === "todos")}>
          Todos
        </Link>
      </div>

      <div className="space-y-3">
        {result.leads.map((lead) => (
          <ConsultantLeadCard
            key={lead.id}
            id={lead.id}
            name={lead.name}
            businessName={lead.businessName}
            instagramUrl={lead.instagram ? instagramProfileUrl(lead.instagram) : null}
            instagramHandle={lead.instagram ? normalizeInstagramHandle(lead.instagram) : null}
            whatsappDisplay={lead.whatsapp}
            classification={lead.classification}
            investment={lead.investmentRangeLabel}
            frequency={lead.purchaseFrequencyLabel}
            createdAtLabel={new Date(lead.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            })}
            whatsappClicked={lead.whatsappClicked === true}
            status={lead.status}
            waHref={buildWhatsappLink(
              normalizeWhatsapp(lead.whatsapp),
              `Olá ${firstName(lead.name)}! Aqui é a ${consultant.name}, consultora da Guets. Vi que você se cadastrou para comprar no atacado e vou te ajudar com os modelos e o seu primeiro pedido. Podemos conversar?`
            )}
          />
        ))}
        {result.leads.length === 0 ? (
          <p className="rounded-2xl border border-smoke bg-white p-6 text-center text-sm text-muted">
            {tab === "novos"
              ? "Nenhum lead aguardando atendimento. Bom trabalho!"
              : "Nenhum lead atribuído a você ainda."}
          </p>
        ) : null}
      </div>

      {result.pageCount > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/consultora?${new URLSearchParams({ ...(tab === "todos" ? { tab } : {}), page: String(p) }).toString()}`}
              className={`rounded-lg px-3 py-1 ${
                p === result.page ? "bg-ink text-white" : "border border-smoke bg-white text-muted"
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
