"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/tracking/client";
import { FUNNEL_EVENTS } from "@/lib/tracking/events";
import { fireMetaPixelStandardEvent, fireGa4Event } from "@/lib/tracking/pixel";

interface WhatsappCtaProps {
  href: string;
  consultantName: string;
  leadId: string;
}

const AUTO_OPEN_SECONDS = 4;

function autoOpenKey(leadId: string) {
  return `guets_wa_opened_${leadId}`;
}

function alreadyOpened(leadId: string): boolean {
  try {
    return sessionStorage.getItem(autoOpenKey(leadId)) === "1";
  } catch {
    return false;
  }
}

function markOpened(leadId: string) {
  try {
    sessionStorage.setItem(autoOpenKey(leadId), "1");
  } catch {
    // sem sessionStorage só perdemos a trava contra reabrir ao voltar da conversa.
  }
}

/**
 * A consultora só recebe o contato quando o lead manda a mensagem no
 * WhatsApp, então a tela abre a conversa sozinha depois de alguns segundos
 * (com opção de cancelar) em vez de depender só do clique. A trava em
 * sessionStorage evita reabrir em loop se a pessoa voltar pra esta tela.
 */
export function WhatsappCta({ href, consultantName, leadId }: WhatsappCtaProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    alreadyOpened(leadId) ? null : AUTO_OPEN_SECONDS
  );
  const opened = useRef(false);

  function track(source: "auto" | "button") {
    trackEvent(FUNNEL_EVENTS.whatsappClicked, { leadId, metadata: { source } });
    fireMetaPixelStandardEvent("Contact");
    fireGa4Event("whatsapp_click");
  }

  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      if (opened.current) return;
      opened.current = true;
      markOpened(leadId);
      track("auto");
      // Pequena folga pra os disparos de tracking saírem antes de trocar de página.
      const timer = setTimeout(() => {
        window.location.href = href;
      }, 300);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(timer);
    // track é estável o bastante (só dispara efeitos colaterais); as dependências que importam são estas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, href, leadId]);

  function handleClick() {
    opened.current = true;
    markOpened(leadId);
    setSecondsLeft(null);
    track("button");
  }

  return (
    <div>
      {secondsLeft !== null ? (
        <p className="mb-3 text-sm text-muted">
          {secondsLeft > 0
            ? `Abrindo o WhatsApp da ${consultantName} em ${secondsLeft}s...`
            : "Abrindo o WhatsApp..."}{" "}
          <button
            type="button"
            onClick={() => setSecondsLeft(null)}
            className="font-semibold text-graphite underline cursor-pointer"
          >
            Cancelar
          </button>
        </p>
      ) : null}

      <a href={href} target="_blank" rel="noreferrer" onClick={handleClick}>
        <Button>FALAR COM {consultantName.toUpperCase()} NO WHATSAPP</Button>
      </a>
    </div>
  );
}
