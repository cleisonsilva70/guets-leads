"use client";

import { useEffect, useState } from "react";
import { minimumOrderLabel } from "@/lib/config/commercial";
import { buildWhatsappLink } from "@/lib/validation/whatsapp";
import { WhatsappCta } from "@/components/success/WhatsappCta";

interface SuccessData {
  leadId: string;
  name: string;
  businessName: string;
  consultant: { name: string; whatsapp: string } | null;
}

/**
 * Recebe os dados via sessionStorage (setados pelo QuizWizard logo após o
 * POST em /api/leads) em vez de buscar no servidor por id: a planilha do
 * Google não é um banco de consulta rápida por chave, então já devolvemos
 * tudo que a tela precisa na resposta do próprio cadastro.
 */
export default function SuccessPage() {
  const [data, setData] = useState<SuccessData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("guets_success");
      if (raw) setData(JSON.parse(raw));
    } catch {
      // sessionStorage indisponível (modo privado, etc.) — segue com fallback genérico.
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  const firstName = data ? data.name.split(" ")[0] || data.name : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 py-16 text-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-ink">
          {firstName ? `Cadastro concluído, ${firstName}!` : "Cadastro concluído!"}
        </h1>

        {data?.consultant ? (
          <>
            <p className="mt-4 text-base text-muted">Sua consultora de atacado é:</p>
            <p className="mt-2 text-2xl font-bold text-graphite">{data.consultant.name}</p>
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
                leadId={data.leadId}
                consultantName={data.consultant.name}
                href={buildWhatsappLink(
                  data.consultant.whatsapp,
                  `Olá ${data.consultant.name}! Sou ${data.name}, da ${data.businessName}. Acabei de concluir meu cadastro de atacado pelo site e recebi seu contato para atendimento. Estou ciente de que o pedido mínimo é de ${minimumOrderLabel} e quero conhecer os modelos disponíveis.`
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
