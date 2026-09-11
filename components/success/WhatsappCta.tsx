"use client";

import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/tracking/client";
import { FUNNEL_EVENTS } from "@/lib/tracking/events";
import { fireMetaPixelStandardEvent, fireGa4Event } from "@/lib/tracking/pixel";

interface WhatsappCtaProps {
  href: string;
  consultantName: string;
  leadId: string;
}

export function WhatsappCta({ href, consultantName, leadId }: WhatsappCtaProps) {
  function handleClick() {
    trackEvent(FUNNEL_EVENTS.whatsappClicked, { leadId });
    fireMetaPixelStandardEvent("Contact");
    fireGa4Event("whatsapp_click");
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={handleClick}>
      <Button>FALAR COM {consultantName.toUpperCase()} NO WHATSAPP</Button>
    </a>
  );
}
