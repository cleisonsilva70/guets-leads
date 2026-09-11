import { notFound } from "next/navigation";
import { getLeadWithConsultant } from "@/lib/leads/get-lead";
import { buildWhatsappLink } from "@/lib/validation/whatsapp";
import { minimumOrderLabel } from "@/lib/config/commercial";
import { WhatsappCta } from "@/components/success/WhatsappCta";

interface PageProps {
  params: Promise<{ leadId: string }>;
}

export default async function SuccessPage({ params }: PageProps) {
  const { leadId } = await params;
  const lead = await getLeadWithConsultant(leadId);

  if (!lead) {
    notFound();
  }

  const firstName = lead.name.split(" ")[0] ?? lead.name;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-16 text-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-ink">Cadastro concluído, {firstName}!</h1>

        {lead.consultant ? (
          <>
            <p className="mt-4 text-base text-muted">Sua consultora de atacado é:</p>
            <p className="mt-2 text-2xl font-bold text-graphite">{lead.consultant.name}</p>
            <p className="text-sm text-muted">Consultora Comercial</p>

            <p className="mt-6 text-base text-muted">
              Ela vai ajudar você com os modelos disponíveis, condições de atacado e seu primeiro
              pedido.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-graphite/30 bg-graphite/5 px-4 py-2 text-sm font-semibold text-graphite">
              Pedido mínimo: {minimumOrderLabel}
            </div>

            <div className="mt-8">
              <WhatsappCta
                leadId={lead.id}
                consultantName={lead.consultant.name}
                href={buildWhatsappLink(
                  lead.consultant.whatsapp,
                  `Olá ${lead.consultant.name}! Sou ${lead.name}, da ${lead.business_name}. Acabei de concluir meu cadastro de atacado pelo site e fui direcionada para o seu atendimento. Estou ciente de que o pedido mínimo é de ${minimumOrderLabel} e quero conhecer os modelos disponíveis.`
                )}
              />
            </div>
          </>
        ) : (
          <p className="mt-4 text-base text-muted">
            Nossa equipe comercial entrará em contato com você.
          </p>
        )}
      </div>
    </main>
  );
}
